import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import { StateManager } from "@core/storage/StateManager"
import { ModelInfo, openRouterDefaultModelId, openRouterDefaultModelInfo } from "@shared/api"
import { shouldSkipReasoningForModel } from "@utils/model-utils"
import axios from "axios"
import OpenAI from "openai"
import type { ChatCompletionTool as OpenAITool } from "openai/resources/chat/completions"
import { ClineStorageMessage } from "@/shared/messages/content"
import { fetch, getAxiosSettings } from "@/shared/net"
import { ApiHandler, CommonApiHandlerOptions } from "../"
import { withRetry } from "../retry"
import { createOpenRouterStream } from "../transform/openrouter-stream"
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"
import { ToolCallProcessor } from "../transform/tool-call-processor"
import { OpenRouterErrorResponse } from "./types"

interface OpenRouterHandlerOptions extends CommonApiHandlerOptions {
	openRouterApiKey?: string
	openRouterModelId?: string
	openRouterModelInfo?: ModelInfo
	openRouterProviderSorting?: string
	reasoningEffort?: string
	thinkingBudgetTokens?: number
	geminiThinkingLevel?: string
}

export class OpenRouterHandler implements ApiHandler {
	private options: OpenRouterHandlerOptions
	private client: OpenAI | undefined
	lastGenerationId?: string

	constructor(options: OpenRouterHandlerOptions) {
		this.options = options
	}

	private ensureClient(): OpenAI {
		if (!this.client) {
			if (!this.options.openRouterApiKey) {
				throw new Error("OpenRouter API key is required")
			}
			try {
				this.client = new OpenAI({
					baseURL: "https://openrouter.ai/api/v1",
					apiKey: this.options.openRouterApiKey,
					defaultHeaders: {
						"HTTP-Referer": "https://cline.bot", // Optional, for including your app on openrouter.ai rankings.
						"X-Title": "Cline", // Optional. Shows in rankings on openrouter.ai.
					},
					fetch, // Use configured fetch with proxy support
				})
			} catch (error: any) {
				throw new Error(`Error creating OpenRouter client: ${error.message}`)
			}
		}
		return this.client
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: ClineStorageMessage[], tools?: OpenAITool[]): ApiStream {
		const client = this.ensureClient()
		this.lastGenerationId = undefined

		const stream = await createOpenRouterStream(
			client,
			systemPrompt,
			messages,
			this.getModel(),
			this.options.reasoningEffort,
			this.options.thinkingBudgetTokens,
			this.options.openRouterProviderSorting,
			tools,
			this.options.geminiThinkingLevel,
		)

		let didOutputUsage: boolean = false
		const toolCallProcessor = new ToolCallProcessor()

		for await (const chunk of stream) {
			// openrouter returns an error object instead of the openai sdk throwing an error
			// Check for error field directly on chunk
			if ("error" in chunk) {
				const error = chunk.error as OpenRouterErrorResponse["error"]
				console.error(`OpenRouter API Error: ${error?.code} - ${error?.message}`)
				// Include metadata in the error message if available
				const metadataStr = error.metadata ? `\nMetadata: ${JSON.stringify(error.metadata, null, 2)}` : ""
				throw new Error(`OpenRouter API Error ${error.code}: ${error.message}${metadataStr}`)
			}

			// Check for error in choices[0].finish_reason
			// OpenRouter may return errors in a non-standard way within choices
			const choice = chunk.choices?.[0]
			// Use type assertion since OpenRouter uses non-standard "error" finish_reason
			if ((choice?.finish_reason as string) === "error") {
				// Use type assertion since OpenRouter adds non-standard error property
				const choiceWithError = choice as any
				if (choiceWithError.error) {
					const error = choiceWithError.error
					console.error(
						`OpenRouter Mid-Stream Error: ${error?.code || "Unknown"} - ${error?.message || "Unknown error"}`,
					)
					// Format error details
					const errorDetails = typeof error === "object" ? JSON.stringify(error, null, 2) : String(error)
					throw new Error(`OpenRouter Mid-Stream Error: ${errorDetails}`)
				} else {
					// Fallback if error details are not available
					throw new Error(
						`OpenRouter Mid-Stream Error: Stream terminated with error status but no error details provided`,
					)
				}
			}

			if (!this.lastGenerationId && chunk.id) {
				this.lastGenerationId = chunk.id
			}

			const delta = chunk.choices[0]?.delta
			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}

			if (delta?.tool_calls) {
				yield* toolCallProcessor.processToolCallDeltas(delta.tool_calls)
			}

			// Reasoning tokens are returned separately from the content
			// Skip reasoning content for Grok 4 models since it only displays "thinking" without providing useful information
			if ("reasoning" in delta && delta.reasoning && !shouldSkipReasoningForModel(this.options.openRouterModelId)) {
				yield {
					type: "reasoning",
					reasoning: typeof delta.reasoning === "string" ? delta.reasoning : JSON.stringify(delta.reasoning),
				}
			}

			// OpenRouter passes reasoning details that we can pass back unmodified in api requests to preserve reasoning traces for model
			// See: https://openrouter.ai/docs/use-cases/reasoning-tokens#preserving-reasoning-blocks
			if (
				"reasoning_details" in delta &&
				delta.reasoning_details &&
				// @ts-ignore-next-line
				delta.reasoning_details.length && // exists and non-0
				!shouldSkipReasoningForModel(this.options.openRouterModelId)
			) {
				yield {
					type: "reasoning",
					reasoning: "",
					details: delta.reasoning_details,
				}
			}

			if (!didOutputUsage && chunk.usage) {
				yield {
					type: "usage",
					cacheWriteTokens: 0,
					cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
					inputTokens: (chunk.usage.prompt_tokens || 0) - (chunk.usage.prompt_tokens_details?.cached_tokens || 0),
					outputTokens: chunk.usage.completion_tokens || 0,
					// @ts-ignore-next-line
					totalCost: (chunk.usage.cost || 0) + (chunk.usage.cost_details?.upstream_inference_cost || 0),
				}
				didOutputUsage = true
			}
		}

		// Fallback to generation endpoint if usage chunk not returned
		if (!didOutputUsage) {
			const apiStreamUsage = await this.getApiStreamUsage()
			if (apiStreamUsage) {
				yield apiStreamUsage
			}
		}
	}

	async getApiStreamUsage(): Promise<ApiStreamUsageChunk | undefined> {
		if (this.lastGenerationId) {
			await setTimeoutPromise(500) // FIXME: necessary delay to ensure generation endpoint is ready
			try {
				const generationIterator = this.fetchGenerationDetails(this.lastGenerationId)
				const generation = (await generationIterator.next()).value
				// console.log("OpenRouter generation details:", generation)
				return {
					type: "usage",
					cacheWriteTokens: 0,
					cacheReadTokens: generation?.native_tokens_cached || 0,
					// openrouter generation endpoint fails often
					inputTokens: (generation?.native_tokens_prompt || 0) - (generation?.native_tokens_cached || 0),
					outputTokens: generation?.native_tokens_completion || 0,
					totalCost: generation?.total_cost || 0,
				}
			} catch (error) {
				// ignore if fails
				console.error("Error fetching OpenRouter generation details:", error)
			}
		}
		return undefined
	}

	@withRetry({ maxRetries: 4, baseDelay: 250, maxDelay: 1000, retryAllErrors: true })
	async *fetchGenerationDetails(genId: string) {
		// console.log("Fetching generation details for:", genId)
		try {
			const response = await axios.get(`https://openrouter.ai/api/v1/generation?id=${genId}`, {
				headers: {
					Authorization: `Bearer ${this.options.openRouterApiKey}`,
				},
				timeout: 15_000, // this request hangs sometimes
				...getAxiosSettings(),
			})
			yield response.data?.data
		} catch (error) {
			// ignore if fails
			console.error("Error fetching OpenRouter generation details:", error)
			throw error
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		const modelId = this.options.openRouterModelId || openRouterDefaultModelId
		const cachedModelInfo = StateManager.get().getModelInfo("openRouter", modelId)
		return {
			id: modelId,
			info: cachedModelInfo || openRouterDefaultModelInfo,
		}
	}

	async generateImage(prompt: string, referenceImages?: string[]): Promise<Buffer> {
		const client = this.ensureClient()
		const modelId = this.getModel().id

		try {
			// Build the message content with optional reference images
			const messageContent: any[] = [
				{
					type: "text",
					text: prompt,
				},
			]

			// If reference images are provided, read and encode them
			if (referenceImages && referenceImages.length > 0) {
				const fs = await import("fs/promises")
				const path = await import("path")

				for (const imagePath of referenceImages) {
					try {
						// Read the image file
						const imageBuffer = await fs.readFile(imagePath)
						const base64Image = imageBuffer.toString("base64")
						
						// Determine the media type from the file extension
						const ext = path.extname(imagePath).toLowerCase()
						let mediaType = "image/png"
						if (ext === ".jpg" || ext === ".jpeg") {
							mediaType = "image/jpeg"
						} else if (ext === ".webp") {
							mediaType = "image/webp"
						}

						// Add the image to the message content
						messageContent.push({
							type: "image_url",
							image_url: {
								url: `data:${mediaType};base64,${base64Image}`,
							},
						})
					} catch (error) {
						console.warn(`Warning: Could not read reference image ${imagePath}:`, error)
					}
				}
			}

			// For models that support image generation, we need to make a standard completion call
			// with a prompt requesting image generation
			const response = await client.chat.completions.create({
				model: modelId,
				messages: [
					{
						role: "user",
						content: messageContent,
					},
				],
				// Some models might need specific parameters for image generation
				max_tokens: 1024, // Usually lower for image generation models
			})

			const content = response.choices[0]?.message?.content
			if (!content) {
				throw new Error("No response from image generation model")
			}

			// Models may return image data in several formats:
			// 1. Data URL with base64: data:image/png;base64,iVBORw0KGgo...
			// 2. Just base64 string: iVBORw0KGgo...
			// 3. URL to generated image (need to fetch)
			// 4. Structured response with image field

			// Try parsing as data URL (most common for inline image generation)
			const dataUrlMatch = content.match(/data:image\/[^;]+;base64,([^\s\n\r]+)/i)
			if (dataUrlMatch) {
				const base64Data = dataUrlMatch[1]
				return Buffer.from(base64Data, "base64")
			}

			// Try parsing as plain URL to an image (Gemini and some models might return this)
			const urlMatch = content.match(/https?:\/\/[^\s\n\r]+\.(png|jpg|jpeg|webp)/i)
			if (urlMatch) {
				const imageUrl = urlMatch[0]
				// Fetch the image from the URL
				const imageResponse = await axios.get(imageUrl, {
					responseType: "arraybuffer",
					timeout: 30000,
					...getAxiosSettings(),
				})
				return Buffer.from(imageResponse.data)
			}

			// Try parsing as raw base64 (some models return just the base64 string)
			// Base64 strings should be relatively long and contain valid base64 characters
			const cleanedContent = content.trim().replace(/[\s\n\r]/g, "")
			if (cleanedContent.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(cleanedContent)) {
				try {
					return Buffer.from(cleanedContent, "base64")
				} catch (e) {
					// Not valid base64, continue to error
				}
			}

			// If we reach here, we couldn't parse the response
			throw new Error(
				`Unable to extract image data from model response. The model may not support image generation, or returned an unexpected format. Response preview: ${content.substring(0, 200)}...`
			)
		} catch (error: any) {
			throw new Error(`Image generation failed: ${error.message}`)
		}
	}

	async editImage(sourcePath: string, prompt: string, referenceImages?: string[]): Promise<Buffer> {
		const client = this.ensureClient()
		const modelId = this.getModel().id

		try {
			// Read the source image
			const fs = await import("fs/promises")
			const path = await import("path")
			
			const sourceBuffer = await fs.readFile(sourcePath)
			const base64Source = sourceBuffer.toString("base64")
			
			// Determine the media type from the file extension
			const ext = path.extname(sourcePath).toLowerCase()
			let mediaType = "image/png"
			if (ext === ".jpg" || ext === ".jpeg") {
				mediaType = "image/jpeg"
			} else if (ext === ".webp") {
				mediaType = "image/webp"
			}

			// Build the message content
			const messageContent: any[] = [
				{
					type: "image_url",
					image_url: {
						url: `data:${mediaType};base64,${base64Source}`,
					},
				},
				{
					type: "text",
					text: `Edit this image: ${prompt}`,
				},
			]

			// Add any additional reference images
			if (referenceImages && referenceImages.length > 0) {
				for (const imagePath of referenceImages) {
					try {
						const imageBuffer = await fs.readFile(imagePath)
						const base64Image = imageBuffer.toString("base64")
						
						const refExt = path.extname(imagePath).toLowerCase()
						let refMediaType = "image/png"
						if (refExt === ".jpg" || refExt === ".jpeg") {
							refMediaType = "image/jpeg"
						} else if (refExt === ".webp") {
							refMediaType = "image/webp"
						}

						messageContent.push({
							type: "image_url",
							image_url: {
								url: `data:${refMediaType};base64,${base64Image}`,
							},
						})
					} catch (error) {
						console.warn(`Warning: Could not read reference image ${imagePath}:`, error)
					}
				}
			}

			// Make the API call with the source image and edit prompt
			const response = await client.chat.completions.create({
				model: modelId,
				messages: [
					{
						role: "user",
						content: messageContent,
					},
				],
				max_tokens: 1024,
			})

			const content = response.choices[0]?.message?.content
			if (!content) {
				throw new Error("No response from image editing model")
			}

			// Parse the response using the same logic as generateImage
			const dataUrlMatch = content.match(/data:image\/[^;]+;base64,([^\s\n\r]+)/i)
			if (dataUrlMatch) {
				return Buffer.from(dataUrlMatch[1], "base64")
			}

			const urlMatch = content.match(/https?:\/\/[^\s\n\r]+\.(png|jpg|jpeg|webp)/i)
			if (urlMatch) {
				const imageUrl = urlMatch[0]
				const imageResponse = await axios.get(imageUrl, {
					responseType: "arraybuffer",
					timeout: 30000,
					...getAxiosSettings(),
				})
				return Buffer.from(imageResponse.data)
			}

			const cleanedContent = content.trim().replace(/[\s\n\r]/g, "")
			if (cleanedContent.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(cleanedContent)) {
				try {
					return Buffer.from(cleanedContent, "base64")
				} catch (e) {
					// Not valid base64, continue to error
				}
			}

			throw new Error(
				`Unable to extract edited image data from model response. Response preview: ${content.substring(0, 200)}...`
			)
		} catch (error: any) {
			throw new Error(`Image editing failed: ${error.message}`)
		}
	}
}
