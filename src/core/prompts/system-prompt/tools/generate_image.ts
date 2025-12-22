import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const GENERIC: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.GENERATE_IMAGE,
	name: "generate_image",
	description: `Generates an image based on a text prompt and saves it to a file
- Takes a description and file path as input
- Generates an image using AI image generation capabilities
- Saves the generated image to the specified file path
- Returns the path to the saved image file
- Use this tool when you need to create visual assets like logos, banners, icons, illustrations, or diagrams
- The prompt should be detailed and descriptive for best results
- IMPORTANT: Always specify desired dimensions and resolution in the prompt (e.g., "1920x1080px", "512x512px", "3840x2160px for 4K")
- Include specific sizing requirements for proper image generation
- For models like Nano Banana Pro: Can request 2K/4K outputs, text rendering in images, lighting controls, and multi-element compositions
- Advanced features: Specify lighting ("soft studio lighting"), text overlays ("with title 'Welcome' in bold"), camera angles ("low-angle perspective"), and creative controls
- The file path should end with an image extension (.png, .jpg, .jpeg, .webp)
- If the file already exists, it will be overwritten
- This tool is only available when using a model that supports image generation (check model capabilities)`,
	contextRequirements: (context) => context.modelInfo.supportsImageGeneration === true,
	parameters: [
		{
			name: "prompt",
			required: true,
			instruction: "A detailed description of the image to generate, including specific dimensions and resolution (e.g., 1920x1080px, 512x512px, 3840x2160px for 4K). For advanced models, include creative controls like lighting, text overlays, and composition details.",
			usage: "A modern minimalist logo featuring a stylized robot head in blue and white colors, 512x512px, with soft lighting and clean edges",
		},
		{
			name: "path",
			required: true,
			instruction: "The file path where the generated image should be saved (relative to workspace root)",
			usage: "assets/logo.png",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id: ClineDefaultTool.GENERATE_IMAGE,
	name: "generate_image",
	description: "Generates an image from a text prompt and saves it to a file. Always include specific dimensions (e.g., 1920x1080px, 512x512px, 3840x2160px for 4K). For advanced models like Nano Banana Pro, you can specify text overlays, lighting controls, and creative adjustments.",
	contextRequirements: (context) => context.modelInfo.supportsImageGeneration === true,
	parameters: [
		{
			name: "prompt",
			required: true,
			instruction: "Detailed description including dimensions (e.g., 3840x2160px), and optional creative controls like lighting, text overlays, or composition details",
		},
		{
			name: "path",
			required: true,
			instruction: "File path to save the image (relative to workspace)",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const generate_image_variants = [GENERIC, NATIVE_GPT_5, NATIVE_NEXT_GEN]
