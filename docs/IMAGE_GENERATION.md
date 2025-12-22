# Image Generation Support for Cline

## Overview

Cline now supports autonomous image generation using models that have image generation capabilities. This allows Cline to create visual assets like logos, banners, icons, and illustrations automatically as part of completing tasks.

## Requirements

1. **Model Support**: Use a model that supports image generation
   - Look for models with "image" in their `output_modalities` on OpenRouter
   - Examples: Models with image generation capabilities on OpenRouter
   
2. **API Access**: Valid API credentials for your chosen provider

## How It Works

When you use a model that supports image generation, Cline can autonomously:

1. **Detect** when visual assets are needed
2. **Generate** images based on detailed prompts
3. **Save** generated images to your workspace
4. **Reference** those images in code or documentation

## Example Usage

### Basic Example
```
Create a landing page for my startup. Include a hero banner image showing 
a modern tech workspace.
```

Cline will:
1. Recognize the need for a hero banner
2. Call the `generate_image` tool with a detailed prompt
3. Save the image (e.g., `assets/hero-banner.png`)
4. Include the image in the landing page HTML/CSS

### Advanced Example
```
Build a product showcase page with:
- A company logo (blue and white, minimalist, robot theme)
- Product screenshots (showing a dashboard interface)
- Icon set for features section (8 icons)

Start from scratch and generate all assets.
```

Cline will:
1. Generate the logo as `assets/logo.png`
2. Create product screenshots as needed
3. Generate feature icons
4. Build the complete page referencing all generated assets

## Supported Image Formats

- `.png` - Recommended for logos, icons, and graphics
- `.jpg` / `.jpeg` - Good for photos and complex images
- `.webp` - Modern format with good compression

## Approval & Safety

### Auto-Approval
You can configure auto-approval for image generation in settings to allow Cline to generate images without prompting.

### Manual Approval
By default, Cline will ask permission before generating each image:
```
Cline wants to generate an image at `assets/logo.png`
Image description: A modern minimalist logo featuring a stylized robot head in blue and white colors

[Approve] [Reject] [Provide Feedback]
```

## How to Check Model Capabilities

### In CLI
The model information will show if image generation is supported when you select a model.

### Via API
Models with `supportsImageGeneration: true` in their ModelInfo can generate images.

## Troubleshooting

### "Model does not support image generation"
- **Solution**: Switch to a model that has image generation capabilities
- Check OpenRouter's model list for models with `output_modalities: ["image"]`

### "Unable to extract image data from response"
- **Cause**: The model's response format isn't recognized
- **Solution**: This is usually a temporary issue; try regenerating or report if persistent

### Image quality issues
- **Tip**: Provide detailed, specific prompts for better results
- Example good prompt: "A professional logo with a geometric robot head, flat design, blue (#2563eb) and white colors, minimalist style, transparent background, 512x512px"
- Example poor prompt: "make a logo"

## Technical Details

### Implementation
- **Tool**: `generate_image` with parameters `prompt` and `path`
- **API Method**: `ApiHandler.generateImage(prompt: string): Promise<Buffer>`
- **Provider**: OpenRouter (extensible to other providers)
- **Validation**: Path, extension, clineignore checks before generation

### Model Detection
Models are automatically flagged with `supportsImageGeneration: true` when:
- The OpenRouter API reports `output_modalities` containing "image"
- This happens during model refresh

### File Saving
- Images are saved as binary files in the workspace
- Directory structure is created automatically if needed
- Existing files are overwritten (with approval)

## Best Practices

1. **Be Specific**: Detailed prompts produce better results
   ```
   Good: "A 16x16px SVG icon of a gear, minimal, single color #4B5563"
   Poor: "settings icon"
   ```

2. **Plan Dimensions**: Specify size requirements in your prompts when relevant
   ```
   "Generate a hero banner image, 1920x600px, showing..."
   ```

3. **Use Appropriate Formats**:
   - Logos/Icons → PNG (supports transparency)
   - Photos/Artwork → JPG/JPEG
   - Modern web assets → WebP

4. **Organize Assets**: Use descriptive paths
   ```
   Good: assets/images/hero-banner.png
   Poor: img1.png
   ```

## Limitations

- Image generation quality depends on the model's capabilities
- Some models may have specific prompt requirements
- Generated images use API credits (check your provider's pricing)
- Large or complex images may take longer to generate
- The model must explicitly choose to use the tool (autonomous decision)

## Future Enhancements

Potential improvements being considered:
- Support for more providers (Anthropic, OpenAI DALL-E, etc.)
- Image editing capabilities (modify existing images)
- Batch generation for multiple assets
- Style consistency across generations
- Image-to-image transformations

## Feedback

If you encounter issues or have suggestions for improving image generation:
- Report issues on GitHub
- Share feedback in Discord
- Include example prompts and model information when reporting problems
