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

### Basic Example with Dimensions
```
Create a landing page for my startup. Include a hero banner image (1920x600px) 
showing a modern tech workspace.
```

Cline will:
1. Recognize the need for a hero banner with specific dimensions
2. Call the `generate_image` tool with a detailed prompt including "1920x600px"
3. Save the image (e.g., `assets/hero-banner.png`)
4. Include the image in the landing page HTML/CSS

### Advanced Example with Multiple Assets
```
Build a product showcase page with:
- A company logo (512x512px, blue and white, minimalist, robot theme)
- Product screenshots (1280x800px, showing a dashboard interface)
- Icon set for features section (64x64px each, 8 icons total)

Start from scratch and generate all assets with proper dimensions.
```

Cline will:
1. Generate the logo as `assets/logo.png` (512x512px)
2. Create product screenshots with specified dimensions
3. Generate feature icons at 64x64px each
4. Build the complete page referencing all generated assets

## Specifying Image Dimensions

**Always include dimensions in your requests** for best results. The model will pass dimensions in the prompt parameter.

### Common Dimension Examples:
- **Logos**: 512x512px, 256x256px, 128x128px
- **Icons**: 64x64px, 48x48px, 32x32px, 16x16px
- **Hero Banners**: 1920x600px, 1920x1080px, 1600x900px
- **Social Media**: 1200x630px (OpenGraph), 1080x1080px (Instagram), 1024x512px (Twitter)
- **Thumbnails**: 400x300px, 320x240px
- **Posters**: 2400x3600px, 1920x2880px

### Resolution Specifications:
You can also specify DPI/resolution for print-quality images:
- "Generate a poster at 2400x3600px, 300dpi"
- "Create a business card graphic, 1050x600px at 300dpi"

### Aspect Ratio Control:
If dimensions aren't critical, specify aspect ratios:
- "16:9 aspect ratio for video thumbnail"
- "1:1 square format for profile picture"
- "4:3 landscape orientation"

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

1. **Always Specify Dimensions**: Include exact pixel dimensions for predictable results
   ```
   Good: "A 512x512px logo with a gear icon, minimal, single color #4B5563"
   Better: "A professional business logo, 512x512px at 300dpi, geometric robot head, flat design"
   Poor: "settings icon" (no dimensions specified)
   ```

2. **Include Resolution for Print**: Add DPI specification for high-quality print images
   ```
   "Generate a poster, 2400x3600px at 300dpi, showing..."
   "Create a brochure cover, 8.5x11 inches at 300dpi, featuring..."
   ```

3. **Be Dimension-Specific for Use Case**: Match dimensions to the intended use
   ```
   Web hero banner: "1920x600px hero image showing..."
   Social media: "1080x1080px Instagram post featuring..."
   Icon set: "Generate 8 icons, each 64x64px, showing..."
   Mobile assets: "750x1334px mobile splash screen with..."
   ```

4. **Use Appropriate Formats**:
   - Logos/Icons → PNG (supports transparency)
   - Photos/Artwork → JPG/JPEG
   - Modern web assets → WebP

5. **Organize Assets**: Use descriptive paths
   ```
   Good: assets/images/hero-banner-1920x600.png
   Poor: img1.png
   ```

## Common Dimension Requirements by Use Case

| Use Case | Recommended Dimensions | Format | Example Prompt |
|----------|------------------------|--------|----------------|
| **Favicon** | 32x32px, 16x16px | PNG | "Generate a favicon, 32x32px, simple geometric logo..." |
| **Logo** | 512x512px | PNG | "Create a company logo, 512x512px, minimalist design..." |
| **Hero Banner** | 1920x600px | JPG/PNG | "Hero banner image, 1920x600px, modern workspace..." |
| **Social Media** | 1080x1080px (IG), 1200x630px (OG) | JPG/PNG | "Instagram post image, 1080x1080px, product showcase..." |
| **Blog Thumbnail** | 800x450px | JPG | "Blog post thumbnail, 800x450px, abstract tech theme..." |
| **Icon Set** | 64x64px, 48x48px, 32x32px | PNG | "UI icon, 64x64px, flat design, single color..." |
| **Mobile Splash** | 750x1334px (iOS), 1080x1920px (Android) | PNG | "App splash screen, 1080x1920px, brand colors..." |
| **Print Poster** | 2400x3600px @ 300dpi | JPG/PNG | "Poster design, 2400x3600px at 300dpi, event theme..." |

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
