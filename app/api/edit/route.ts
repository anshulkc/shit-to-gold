import { NextRequest, NextResponse } from 'next/server'
import { extractImageFromResponse, sendImageMessageWithFallback } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { image, prompt } = await request.json()

    if (!image || !prompt) {
      return NextResponse.json({ error: 'Missing image or prompt' }, { status: 400 })
    }

    const base64Match = image.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }
    const [, mimeType, base64Data] = base64Match

    const editResponse = await sendImageMessageWithFallback({
      message: [
        { inlineData: { data: base64Data, mimeType } },
        {
          text: `Edit this room image according to the following instruction: ${prompt}. Maintain the same overall style, lighting, and perspective. Make the edit look natural and seamlessly integrated.`
        },
      ],
    })

    const editedImageData = extractImageFromResponse(editResponse)

    if (!editedImageData) {
      return NextResponse.json({ error: 'Failed to edit image' }, { status: 500 })
    }

    return NextResponse.json({
      editedImage: `data:${editedImageData.mimeType};base64,${editedImageData.data}`,
    })
  } catch (error) {
    console.error('Edit error:', error)
    return NextResponse.json({ error: 'Edit failed' }, { status: 500 })
  }
}
