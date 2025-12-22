import fs from "fs/promises"
import path from "path"
import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename, resolveWorkspacePath } from "@core/workspace"
import { arePathsEqual, getReadablePath, isLocatedInWorkspace } from "@utils/path"
import { telemetryService } from "@/services/telemetry"
import { ClineSayTool } from "@/shared/ExtensionMessage"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IFullyManagedTool } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ToolResultUtils } from "../utils/ToolResultUtils"

export class GenerateImageToolHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.GENERATE_IMAGE

	constructor(private validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		return `[${block.name} for '${block.params.path}']`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const relPath = block.params.path
		const prompt = block.params.prompt || ""

		const config = uiHelpers.getConfig()

		// Create and show partial UI message
		const sharedMessageProps = {
			tool: "generateImage",
			path: getReadablePath(config.cwd, uiHelpers.removeClosingTag(block, "path", relPath)),
			content: uiHelpers.removeClosingTag(block, "prompt", prompt),
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(relPath),
		}

		const partialMessage = JSON.stringify(sharedMessageProps)

		// Handle auto-approval vs manual approval for partial
		if (await uiHelpers.shouldAutoApproveToolWithPath(block.name, relPath)) {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("ask", "tool")
			await uiHelpers.say("tool", partialMessage, undefined, undefined, block.partial)
		} else {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "tool")
			await uiHelpers.ask("tool", partialMessage, block.partial).catch(() => {})
		}
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const relPath: string | undefined = block.params.path
		const prompt: string | undefined = block.params.prompt

		// Extract provider information for telemetry
		const apiConfig = config.services.stateManager.getApiConfiguration()
		const currentMode = config.services.stateManager.getGlobalSettingsKey("mode")
		const provider = (currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string

		// Check if model supports image generation
		const modelInfo = config.api.getModel().info
		if (!modelInfo.supportsImageGeneration) {
			return formatResponse.toolError(
				"The current model does not support image generation. Please use a model that supports image output (e.g., models with image generation capabilities on OpenRouter).",
			)
		}

		// Validate required parameters
		const pathValidation = this.validator.assertRequiredParams(block, "path")
		if (!pathValidation.ok) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "path")
		}

		const promptValidation = this.validator.assertRequiredParams(block, "prompt")
		if (!promptValidation.ok) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "prompt")
		}

		// Validate file extension
		const validExtensions = [".png", ".jpg", ".jpeg", ".webp"]
		const ext = path.extname(relPath!).toLowerCase()
		if (!validExtensions.includes(ext)) {
			return formatResponse.toolError(
				`Invalid file extension '${ext}'. Image path must end with one of: ${validExtensions.join(", ")}`,
			)
		}

		// Check clineignore access
		const accessValidation = this.validator.checkClineIgnorePath(relPath!)
		if (!accessValidation.ok) {
			await config.callbacks.say("clineignore_error", relPath)
			return formatResponse.toolError(formatResponse.clineIgnoreError(relPath!))
		}

		config.taskState.consecutiveMistakeCount = 0

		// Resolve the absolute path based on multi-workspace configuration
		const pathResult = resolveWorkspacePath(config, relPath!, "GenerateImageToolHandler.execute")
		const { absolutePath, displayPath } =
			typeof pathResult === "string" ? { absolutePath: pathResult, displayPath: relPath! } : pathResult

		// Create message for approval
		const sharedMessageProps: ClineSayTool = {
			tool: "generateImage",
			path: displayPath,
			content: prompt!,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(absolutePath),
		}
		const completeMessage = JSON.stringify(sharedMessageProps)

		if (config.callbacks.shouldAutoApproveTool(this.name)) {
			// Auto-approve flow
			await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "tool")
			await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
			telemetryService.captureToolUsage(
				config.ulid,
				"generate_image",
				config.api.getModel().id,
				provider,
				true,
				true,
				undefined,
				block.isNativeToolCall,
			)
		} else {
			// Manual approval flow
			showNotificationForApproval(
				`Cline wants to generate an image at ${displayPath}`,
				config.autoApprovalSettings.enableNotifications,
			)
			await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")

			const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
			if (!didApprove) {
				telemetryService.captureToolUsage(
					config.ulid,
					block.name,
					config.api.getModel().id,
					provider,
					false,
					false,
					undefined,
					block.isNativeToolCall,
				)
				return formatResponse.toolDenied()
			} else {
				telemetryService.captureToolUsage(
					config.ulid,
					block.name,
					config.api.getModel().id,
					provider,
					false,
					true,
					undefined,
					block.isNativeToolCall,
				)
			}
		}

		// Run PreToolUse hook after approval but before execution
		try {
			const { ToolHookUtils } = await import("../utils/ToolHookUtils")
			await ToolHookUtils.runPreToolUseIfEnabled(config, block)
		} catch (error) {
			const { PreToolUseHookCancellationError } = await import("@core/hooks/PreToolUseHookCancellationError")
			if (error instanceof PreToolUseHookCancellationError) {
				return formatResponse.toolDenied()
			}
			throw error
		}

		try {
			// Check if the API handler supports image generation
			if (!config.api.generateImage) {
				return formatResponse.toolError(
					"The current API provider does not implement image generation. This feature requires a provider that supports generating images.",
				)
			}

			// Generate the image using the API
			const imageData = await config.api.generateImage(prompt!)

			// Ensure the directory exists
			const directory = path.dirname(absolutePath)
			await fs.mkdir(directory, { recursive: true })

			// Save the image
			await fs.writeFile(absolutePath, imageData)

			// Return success message with the path
			return formatResponse.toolResult(
				`Successfully generated image and saved to: ${displayPath}\nThe image has been created based on your prompt: "${prompt}"`,
			)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			return formatResponse.toolError(`Failed to generate image: ${errorMessage}`)
		}
	}
}
