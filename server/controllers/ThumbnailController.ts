import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const stylePrompts = {
    'Bold & Graphic': 'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional YouTube style',
    'Tech/Futuristic': 'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',
    'Minimalist': 'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point',
    'Photorealistic': 'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',
    'Illustrated': 'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
};

const colorSchemeDescriptions = {
    vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
    sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
    forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
    neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
    purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
    monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
    ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
    pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
};

// Map aspect ratio → pixel dimensions for Pollinations
const aspectRatioDimensions: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1280, height: 720 },
    '1:1':  { width: 1024, height: 1024 },
    '9:16': { width: 720,  height: 1280 },
};

export const generateThumbnail = async (req: Request, res: Response) => {
    try {
        const { userId } = req.session;
        const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay } = req.body;

        // 1. Create thumbnail record immediately (isGenerating = true)
        const thumbnail = await Thumbnail.create({
            userId,
            title,
            prompt_used: user_prompt,
            user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay,
            isGenerating: true,
        });

        // 2. Build the image prompt
        let prompt = `YouTube thumbnail, ${stylePrompts[style as keyof typeof stylePrompts]}, topic: "${title}"`;

        if (color_scheme) {
            prompt += `, ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]}`;
        }

        if (user_prompt) {
            prompt += `, ${user_prompt}`;
        }

        prompt += `, visually stunning, maximizes click-through rate, bold, professional, no watermarks, no text borders`;

        // 3. Get dimensions from aspect ratio
        const { width, height } = aspectRatioDimensions[aspect_ratio] || aspectRatioDimensions['16:9'];

        // 4. Build Pollinations URL with API key
        const encodedPrompt = encodeURIComponent(prompt);
        const model = 'black-forest-labs/flux.1-schnell';
        const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${encodeURIComponent(model)}&width=${width}&height=${height}&nologo=true`;

        // 5. Fetch image buffer from Pollinations using Bearer token
        const imageResponse = await fetch(pollinationsUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
                'Accept': 'image/jpeg,image/png,image/*',
            },
        });

        if (!imageResponse.ok) {
            throw new Error(`Pollinations API error: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        // 6. Convert to base64 buffer and upload directly to Cloudinary
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Data = `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString('base64')}`;

        const uploadResult = await cloudinary.uploader.upload(base64Data, {
            folder: 'thumbnails',
            resource_type: 'image',
        });

        // 7. Update thumbnail with permanent Cloudinary URL
        thumbnail.image_url = uploadResult.secure_url;
        thumbnail.isGenerating = false;
        await thumbnail.save();

        res.json({ message: 'Thumbnail Generated', thumbnail });

    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};

// delete thumbnail
export const deleteThumbnail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.session;

        await Thumbnail.findByIdAndDelete({ _id: id, userId });

        res.json({ message: 'Thumbnail deleted successfully' });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};
