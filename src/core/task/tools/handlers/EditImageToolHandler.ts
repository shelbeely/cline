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

export class EditImageToolHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.EDIT_IMAGE

	constructor(private validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		return `[${block.name} from '${block.params.source_path}' to '${block.params.output_path}']`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const sourcePath = block.params.source_path
		const outputPath = block.params.output_path
		const prompt = block.params.prompt || ""

		const config = uiHelpers.getConfig()

		// Create and show partial UI message
		const sharedMessageProps = {
			tool: "editImage",
			path: getReadablePath(config.cwd, uiHelpers.removeClosingTag(block, "output_path", outputPath)),
			content: `Source: ${getReadablePath(config.cwd, uiHelpers.removeClosingTag(block, "source_path", sourcePath))}\nEdits: ${uiHelpers.removeClosingTag(block, "prompt", prompt)}`,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(outputPath),
		}

		const partialMessage = JSON.stringify(sharedMessageProps)

		// Handle auto-approval vs manual approval for partial
		if (await uiHelpers.shouldAutoApproveToolWithPath(block.name, outputPath)) {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("ask", "tool")
			await uiHelpers.say("tool", partialMessage, undefined, undefined, block.partial)
		} else {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "tool")
			await uiHelpers.ask("tool", partialMessage, block.partial).catch(() => {})
		}
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const sourcePath: string | undefined = block.params.source_path
		const outputPath: string | undefined = block.params.output_path
		const prompt: string | undefined = block.params.prompt
		const referenceImages: string[] | undefined = block.params.reference_images

		// Extract provider information for telemetry
		const apiConfig = config.services.stateManager.getApiConfiguration()
		const currentMode = config.services.stateManager.getGlobalSettingsKey("mode")
		const provider = (currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string

		// Check if model supports image generation/editing
		const modelInfo = config.api.getModel().info
		if (!modelInfo.supportsImageGeneration) {
			return formatResponse.toolError(
				"The current model does not support image editing. Please use a model that supports image generation/editing (e.g., models with image generation capabilities on OpenRouter).",
			)
		}

		// Validate required parameters
		const sourcePathValidation = this.validator.assertRequiredParams(block, "source_path")
		if (!sourcePathValidation.ok) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "source_path")
		}

		const outputPathValidation = this.validator.assertRequiredParams(block, "output_path")
		if (!outputPathValidation.ok) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "output_path")
		}

		const promptValidation = this.validator.assertRequiredParams(block, "prompt")
		if (!promptValidation.ok) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "prompt")
		}

		// Validate file extensions
		const validExtensions = [".png", ".jpg", ".jpeg", ".webp"]
		const sourceExt = path.extname(sourcePath!).toLowerCase()
		const outputExt = path.extname(outputPath!).toLowerCase()
		
		if (!validExtensions.includes(sourceExt)) {
			return formatResponse.toolError(
				`Invalid source file extension '${sourceExt}'. Image path must end with one of: ${validExtensions.join(", ")}`,
			)
		}
		
		if (!validExtensions.includes(outputExt)) {
			return formatResponse.toolError(
				`Invalid output file extension '${outputExt}'. Image path must end with one of: ${validExtensions.join(", ")}`,
			)
		}

		// Check clineignore access for source
		const sourceAccessValidation = this.validator.checkClineIgnorePath(sourcePath!)
		if (!sourceAccessValidation.ok) {
			await config.callbacks.say("clineignore_error", sourcePath)
			return formatResponse.toolError(formatResponse.clineIgnoreError(sourcePath!))
		}

		// Check clineignore access for output
		const outputAccessValidation = this.validator.checkClineIgnorePath(outputPath!)
		if (!outputAccessValidation.ok) {
			await config.callbacks.say("clineignore_error", outputPath)
			return formatResponse.toolError(formatResponse.clineIgnoreError(outputPath!))
		}

		// Validate and resolve reference images if provided
		let resolvedReferenceImages: string[] | undefined
		if (referenceImages && referenceImages.length > 0) {
			resolvedReferenceImages = []
			for (const refPath of referenceImages) {
				const refAccessValidation = this.validator.checkClineIgnorePath(refPath)
				if (!refAccessValidation.ok) {
					await config.callbacks.say("clineignore_error", refPath)
					return formatResponse.toolError(`Reference image blocked by clineignore: ${refPath}`)
				}

				// Resolve the reference image path
				const refPathResult = resolveWorkspacePath(config, refPath, "EditImageToolHandler.execute")
				const refAbsolutePath =
					typeof refPathResult === "string" ? refPathResult : refPathResult.absolutePath

				// Check if the reference image exists
				try {
					await fs.access(refAbsolutePath)
					resolvedReferenceImages.push(refAbsolutePath)
				} catch (error) {
					return formatResponse.toolError(`Reference image not found: ${refPath}`)
				}
			}
		}

		config.taskState.consecutiveMistakeCount = 0

		// Resolve the absolute paths based on multi-workspace configuration
		const sourcePathResult = resolveWorkspacePath(config, sourcePath!, "EditImageToolHandler.execute")
		const sourceAbsolutePath =
			typeof sourcePathResult === "string" ? sourcePathResult : sourcePathResult.absolutePath
		const sourceDisplayPath = typeof sourcePathResult === "string" ? sourcePath! : sourcePathResult.displayPath

		const outputPathResult = resolveWorkspacePath(config, outputPath!, "EditImageToolHandler.execute")
		const { absolutePath: outputAbsolutePath, displayPath: outputDisplayPath } =
			typeof outputPathResult === "string"
				? { absolutePath: outputPathResult, displayPath: outputPath! }
				: outputPathResult

		// Check if source image exists
		try {
			await fs.access(sourceAbsolutePath)
		} catch (error) {
			return formatResponse.toolError(`Source image not found: ${sourceDisplayPath}`)
		}

		// Create message for approval
		const sharedMessageProps: ClineSayTool = {
			tool: "editImage",
			path: outputDisplayPath,
			content: `Source: ${sourceDisplayPath}\nEdits: ${prompt}`,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(outputAbsolutePath),
		}
		const completeMessage = JSON.stringify(sharedMessageProps)

		if (config.callbacks.shouldAutoApproveTool(this.name)) {
			// Auto-approve flow
			await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "tool")
			await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
			telemetryService.captureToolUsage(
				config.ulid,
				"edit_image",
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
				`Cline wants to edit an image and save to ${outputDisplayPath}`,
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
			// Check if the API handler supports image editing
			if (!config.api.editImage) {
				return formatResponse.toolError(
					"The current API provider does not implement image editing. This feature requires a provider that supports editing images.",
				)
			}

			// Edit the image using the API, passing reference images if provided
			const editedImageData = await config.api.editImage(sourceAbsolutePath, prompt!, resolvedReferenceImages)

			// Ensure the output directory exists
			const directory = path.dirname(outputAbsolutePath)
			await fs.mkdir(directory, { recursive: true })

			// Save the edited image
			await fs.writeFile(outputAbsolutePath, editedImageData)

			// Return success message with the path
			let successMessage = `Successfully edited image and saved to: ${outputDisplayPath}\nSource: ${sourceDisplayPath}\nEdits applied: "${prompt}"`
			if (resolvedReferenceImages && resolvedReferenceImages.length > 0) {
				successMessage += `\nUsed ${resolvedReferenceImages.length} reference image(s) for style guidance.`
			}
			return formatResponse.toolResult(successMessage)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			return formatResponse.toolError(`Failed to edit image: ${errorMessage}`)
		}
	}
}
