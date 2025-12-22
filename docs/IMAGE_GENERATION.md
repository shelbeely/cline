# Image Generation and Editing Support for Cline

## Overview

Cline now supports autonomous image generation and editing using models that have these capabilities. This allows Cline to:
- Create visual assets like logos, banners, icons, and illustrations automatically
- Use existing images (logos, color palettes) as references to maintain brand consistency
- Edit existing images based on text instructions

### Supported Models

#### Google Gemini 3 Pro - Nano Banana Pro (Recommended)
The **Nano Banana Pro** model (`google/gemini-3-pro-image-preview` on OpenRouter) is Google's most advanced image-generation model, offering:

**Professional Features:**
- **High-resolution outputs**: 2K and 4K image generation
- **Advanced text rendering**: Industry-leading text-in-image with multilingual support and long passages
- **Multi-element compositions**: Consistent blending across multiple images
- **Identity preservation**: Accurate preservation across up to 5 subjects
- **Creative controls**: Fine-grained adjustments for lighting, focus, and camera transformations
- **Flexible aspect ratios**: Support for various dimension requirements
- **Search grounding**: Real-time information integration for context-rich graphics
- **Image editing**: Localized edits, lighting adjustments, and style transformations
- **Reference image support**: Use existing images to guide generation and maintain brand consistency

**Ideal For:**
- Professional design and product visualization
- Infographics and diagrams with text overlays
- Storyboarding and cinematic composites
- Complex multi-element compositions
- Landing pages with text-rich banners
- Marketing materials requiring precise branding
- Brand-consistent asset generation using logos and color palettes
- Iterative design workflows (generate, then edit based on feedback)

## Requirements

1. **Model Support**: Use a model that supports image generation
   - **Recommended**: `google/gemini-3-pro-image-preview` (Nano Banana Pro)
   - Look for models with "image" in their `output_modalities` on OpenRouter
   
2. **API Access**: Valid API credentials for your chosen provider (OpenRouter recommended)

## How It Works

When you use a model that supports image generation, Cline can autonomously:

1. **Detect** when visual assets are needed
2. **Generate** images based on detailed prompts
3. **Use reference images** (like your logo or color palette) to maintain brand consistency
4. **Edit existing images** based on text instructions
5. **Save** generated/edited images to your workspace
6. **Reference** those images in code or documentation

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

### Example with Brand References (NEW)
```
Create a landing page using my company logo (assets/brand-logo.png) and color 
palette (assets/palette.png). Generate a hero banner (1920x600px) and feature 
icons (64x64px each, 4 icons) that match our brand style.
```

Cline will:
1. Generate hero banner using logo and palette as style references
2. Create feature icons maintaining the same brand colors and style
3. Build landing page with all generated brand-consistent assets
4. All generated images follow the visual theme from reference images

### Example with Image Editing (NEW)
```
Edit the hero banner at assets/hero-banner.png - change the background to navy 
blue and increase the logo brightness by 20%. Save as assets/hero-banner-v2.png
```

Cline will:
1. Load the existing image
2. Call the `edit_image` tool with editing instructions
3. Apply the specified changes (background color, brightness)
4. Save the edited version

### Advanced Example with Multiple Assets
```
Build a product showcase page with:
- A company logo (512x512px, blue and white, minimalist, robot theme)
- Product screenshots (1280x800px, showing a dashboard interface)
- Icon set for features section (64x64px each, 8 icons total)

Use assets/brand-colors.png as reference to maintain color consistency.
Start from scratch and generate all assets with proper dimensions.
```

Cline will:
1. Generate the logo as `assets/logo.png` (512x512px) using brand colors reference
2. Create product screenshots with specified dimensions
3. Generate feature icons at 64x64px each with consistent branding
4. Build the complete page referencing all generated assets

## Specifying Image Dimensions

**Always include dimensions in your requests** for best results. The model will pass dimensions in the prompt parameter.

### Standard Dimension Examples:
- **Logos**: 512x512px, 256x256px, 128x128px
- **Icons**: 64x64px, 48x48px, 32x32px, 16x16px
- **Hero Banners**: 1920x600px, 1920x1080px, 1600x900px
- **Social Media**: 1200x630px (OpenGraph), 1080x1080px (Instagram), 1024x512px (Twitter)
- **Thumbnails**: 400x300px, 320x240px
- **Posters**: 2400x3600px, 1920x2880px

### High-Resolution Outputs (Nano Banana Pro):
With models like Nano Banana Pro, you can request professional-grade high-resolution images:
- **2K Images**: 2560x1440px, 2048x1536px
- **4K Images**: 3840x2160px, 4096x2304px
- **Ultra-wide**: 3440x1440px, 5120x1440px
- **Print Quality**: Any dimension with "@300dpi" or "@600dpi" specification

### Resolution Specifications:
You can also specify DPI/resolution for print-quality images:
- "Generate a poster at 2400x3600px, 300dpi"
- "Create a business card graphic, 1050x600px at 300dpi"
- **For Nano Banana Pro**: "4K resolution banner at 3840x2160px, 300dpi"

### Aspect Ratio Control:
If exact dimensions aren't critical, specify aspect ratios:
- "16:9 aspect ratio for video thumbnail"
- "1:1 square format for profile picture"
- "4:3 landscape orientation"
- "21:9 ultra-wide cinematic format"

### Advanced Features with Nano Banana Pro

When using Nano Banana Pro, you can request additional creative controls in your prompts:

**Text Rendering in Images:**
```
"Generate a 1920x1080px infographic with the title 'AI Revolution 2025' 
in bold sans-serif font at the top, and three bullet points below in 
smaller text explaining key trends"
```

**Lighting and Focus:**
```
"Create a product photo at 2048x2048px with soft studio lighting from 
the left, shallow depth of field focusing on the product in center"
```

**Multi-Element Compositions:**
```
"Generate a 3840x2160px banner featuring 3 product shots side by side, 
maintaining consistent lighting and style across all products"
```

**Identity Preservation:**
```
"Create 5 variations of the company mascot character (512x512px each), 
maintaining the same blue robot design with different poses"
```

**Camera Transformations:**
```
"Generate a 1920x1080px scene with a low-angle camera perspective, 
wide-angle lens effect, professional photography style"
```

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
| **4K Banner** (Nano Banana Pro) | 3840x2160px | PNG | "4K resolution banner, 3840x2160px with text overlay..." |
| **Infographic** (Nano Banana Pro) | 1200x3000px | PNG | "Vertical infographic, 1200x3000px with data visualization..." |

## Nano Banana Pro Specific Examples

### Example 1: Text-Rich Landing Page Banner
```
Create a landing page with a hero banner using Nano Banana Pro.
Generate a 3840x2160px banner image with:
- Large heading text "Welcome to the Future of AI" in modern sans-serif
- Subheading "Transforming Industries Through Innovation" below it
- Futuristic tech background with soft lighting
- Company logo in the top-right corner
```

### Example 2: Multi-Product Showcase
```
Generate a product showcase image (2560x1440px) featuring 4 different 
product shots arranged in a grid, maintaining consistent lighting and 
perspective across all items. Include product names as text overlays 
in clean typography.
```

### Example 3: Professional Infographic
```
Create a business infographic (1080x1920px vertical format) with:
- Title: "2025 Market Trends" at the top in bold text
- 5 sections with icons and statistical data
- Each section should have a heading and 2-3 bullet points
- Modern color scheme with data visualization elements
- Use consistent typography throughout
```

### Example 4: Cinematic Composition
```
Generate a cinematic banner (5120x1440px ultra-wide) showing a futuristic 
cityscape at dusk, with dramatic lighting from the setting sun, shallow 
depth of field focusing on the foreground buildings, professional 
photography style with film grain texture.
```

## Using Reference Images for Brand Consistency (NEW)

Reference images allow you to maintain brand consistency across all generated assets by using existing images (logos, color palettes, style guides) as visual references.

### How It Works

1. **Provide existing images** as references (e.g., your logo, color palette)
2. **Model analyzes** the reference images for colors, style, and composition
3. **Generated images** match the visual style and branding from references
4. **Maintain consistency** across all assets automatically

### Example Workflows

**Basic Brand Consistency:**
```
"Generate a hero banner (1920x600px) for our product launch. Use 
assets/brand-logo.png as a style reference to match our brand colors."
```

**Multiple Reference Images:**
```
"Create a set of 8 feature icons (64x64px each). Use assets/logo.png 
and assets/color-palette.png as references to maintain our brand identity."
```

**Complex Compositions:**
```
"Generate a product showcase banner (2560x1440px) featuring our three 
main products. Use assets/brand-guidelines.png to match our visual style 
and assets/product-photos/sample.jpg for the product photography style."
```

### Best Practices for Reference Images

1. **Use high-quality references**: Clear, well-lit images work best
2. **Multiple references**: Combine logo + color palette for better results
3. **Consistent style**: Use references that represent your desired aesthetic
4. **File organization**: Keep reference images in a dedicated folder (e.g., `assets/brand/`)

### Supported Reference Image Formats
- PNG (recommended for logos with transparency)
- JPG/JPEG (good for photos and complex images)
- WebP (modern format with good compression)

## Image Editing Capabilities (NEW)

Edit existing images with text instructions using the `edit_image` tool. Perfect for iterative design workflows and making adjustments to generated or existing images.

### What You Can Edit

**Color Adjustments:**
- Change background colors
- Adjust brightness, contrast, saturation
- Apply color grading

**Content Modifications:**
- Add or remove elements
- Reposition objects
- Change text content

**Style Transformations:**
- Apply filters or effects
- Adjust lighting and shadows
- Modify focus and depth of field

**Localized Edits (Nano Banana Pro):**
- Edit specific regions only
- Fine-grained lighting adjustments
- Precise color changes

### Example Edit Operations

**Simple Color Change:**
```
"Edit assets/banner.png - change the background from white to navy blue. 
Save as assets/banner-blue.png"
```

**Brightness Adjustment:**
```
"Edit assets/logo.png - increase overall brightness by 25% and enhance 
contrast. Save as assets/logo-bright.png"
```

**Content Modification:**
```
"Edit assets/hero-banner.png - replace the text 'Coming Soon' with 
'Now Available' in the same font and style. Save as assets/hero-updated.png"
```

**Complex Edit with References:**
```
"Edit assets/product-shot.png - change the product color to match the 
blue from assets/brand-colors.png, and adjust lighting to be softer. 
Save as assets/product-shot-blue.png"
```

### Iterative Design Workflow

1. **Generate** initial asset with specific requirements
2. **Review** the generated image
3. **Edit** to refine based on feedback
4. **Repeat** editing as needed for perfect results

Example:
```
Step 1: "Generate a logo (512x512px) with a robot theme"
→ assets/logo-v1.png created

Step 2: "Edit assets/logo-v1.png - make the robot's eyes brighter blue. 
         Save as assets/logo-v2.png"
→ Adjusted version created

Step 3: "Edit assets/logo-v2.png - add a subtle shadow effect. 
         Save as assets/logo-final.png"
→ Final version ready
```

## Limitations

### General Limitations
- Image generation quality depends on the model's capabilities
- Generated/edited images use API credits (check your provider's pricing)
- Large or complex images may take longer to process
- The model must explicitly choose to use the tools (autonomous decision)

### Model-Specific Capabilities

**Nano Banana Pro Advantages:**
- ✅ Support for 2K (2560x1440px) and 4K (3840x2160px) outputs
- ✅ Advanced text rendering with multilingual support
- ✅ Multi-image consistency and identity preservation
- ✅ Fine-grained creative controls (lighting, focus, camera)
- ✅ Search grounding for real-time information
- ✅ Professional-grade design workflows
- ✅ Reference image support for brand consistency
- ✅ Advanced image editing with localized controls

**Other Models:**
- May have lower maximum resolution limits
- Text rendering in images may be less accurate
- Limited multi-element composition capabilities
- Fewer creative control options
- May not support reference images or editing

## Future Enhancements

Potential improvements being considered:
- Support for more providers (Anthropic, OpenAI DALL-E, etc.)
- Batch generation for multiple assets
- Style consistency profiles
- Image-to-image transformations
- Advanced masking and selection tools

## Feedback

If you encounter issues or have suggestions for improving image generation:
- Report issues on GitHub
- Share feedback in Discord
- Include example prompts and model information when reporting problems
