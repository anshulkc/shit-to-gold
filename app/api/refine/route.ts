import { NextRequest, NextResponse } from 'next/server'
import { createGeminiChat, extractImageFromResponse } from '@/lib/gemini'

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export async function POST(request: NextRequest) {
  try {
    const { furnishedImage, crop, prompt } = await request.json() as {
      furnishedImage: string
      crop: CropArea
      prompt: string
    }

    if (!furnishedImage || !crop || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const base64Match = furnishedImage.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }
    const [, mimeType, base64Data] = base64Match

    const chat = await createGeminiChat()

    const refineResponse = await chat.sendMessage({
      message: [
        { inlineData: { data: base64Data, mimeType } },
        {
          text: `In this room image, there is a region at coordinates (x: ${crop.x}, y: ${crop.y}, width: ${crop.width}, height: ${crop.height}) that needs to be changed. Replace the item in that region with: ${prompt}. Keep everything outside this region exactly the same. Maintain the same lighting, perspective, and style as the rest of the room.`
        },
      ],
    })

    const refinedImageData = extractImageFromResponse(refineResponse)

    if (!refinedImageData) {
      return NextResponse.json({ error: 'Failed to generate refined image' }, { status: 500 })
    }

    return NextResponse.json({
      refinedImage: `data:${refinedImageData.mimeType};base64,${refinedImageData.data}`,
    })
  } catch (error) {
    console.error('Refine error:', error)
    return NextResponse.json({ error: 'Refinement failed' }, { status: 500 })
  }
}
