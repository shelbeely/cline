import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const GENERIC: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.EDIT_IMAGE,
	name: "edit_image",
	description: `Edits an existing image based on a text prompt and saves the result
- Takes an existing image path, edit description, and output path as input
- Modifies the image using AI image editing capabilities
- Supports localized edits, style changes, and content modifications
- Saves the edited image to the specified output path
- Returns the path to the saved edited image
- Use this tool when you need to modify existing images: change colors, add/remove elements, adjust composition, or apply style changes
- The prompt should clearly describe the desired changes
- For models like Nano Banana Pro: Supports fine-grained edits including lighting adjustments, focus changes, color modifications, and element repositioning
- Advanced features: Specify precise edits ("change background to blue"), localized changes ("make the logo brighter"), or style transformations ("apply vintage filter")
- The output path should end with an image extension (.png, .jpg, .jpeg, .webp)
- If the output file already exists, it will be overwritten
- This tool is only available when using a model that supports image generation/editing (check model capabilities)`,
	contextRequirements: (context) => context.modelInfo.supportsImageGeneration === true,
	parameters: [
		{
			name: "source_path",
			required: true,
			instruction: "Path to the existing image file to edit (relative to workspace root)",
			usage: "assets/original-logo.png",
		},
		{
			name: "prompt",
			required: true,
			instruction: "A detailed description of the edits to apply to the image. Be specific about what should change.",
			usage: "Change the background color to navy blue and increase the brightness of the logo by 20%",
		},
		{
			name: "output_path",
			required: true,
			instruction: "The file path where the edited image should be saved (relative to workspace root)",
			usage: "assets/edited-logo.png",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id: ClineDefaultTool.EDIT_IMAGE,
	name: "edit_image",
	description: "Edits an existing image based on instructions and saves the result. Supports localized edits, color changes, and style modifications. For Nano Banana Pro, includes fine-grained controls for lighting, focus, and composition adjustments.",
	contextRequirements: (context) => context.modelInfo.supportsImageGeneration === true,
	parameters: [
		{
			name: "source_path",
			required: true,
			instruction: "Path to existing image to edit",
		},
		{
			name: "prompt",
			required: true,
			instruction: "Detailed description of edits to apply",
		},
		{
			name: "output_path",
			required: true,
			instruction: "Path to save edited image",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const edit_image_variants = [GENERIC, NATIVE_GPT_5, NATIVE_NEXT_GEN]
