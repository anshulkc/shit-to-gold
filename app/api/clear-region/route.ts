import { NextRequest, NextResponse } from 'next/server'
import { extractImageFromResponse, sendImageMessageWithFallback } from '@/lib/gemini'

interface ClearRegionRequest {
  image: string
  crop: {
    x: number
    y: number
    width: number
    height: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { image, crop }: ClearRegionRequest = await request.json()

    if (!image || !crop) {
      return NextResponse.json({ error: 'Missing image or crop' }, { status: 400 })
    }

    // Extract base64 data from data URL
    const base64Match = image.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }
    const [, mimeType, base64Data] = base64Match

    const { x, y, width, height } = crop

    const response = await sendImageMessageWithFallback({
      message: [
        { inlineData: { data: base64Data, mimeType } },
        { text: `Remove all furniture, decor, and items in the rectangular region at coordinates (x:${Math.round(x)}, y:${Math.round(y)}, width:${Math.round(width)}, height:${Math.round(height)}). Keep the room structure intact - walls, floors, windows, doors, and built-in features. Leave the area empty and clean.` },
      ],
    })

    const clearedImageData = extractImageFromResponse(response)

    if (!clearedImageData) {
      return NextResponse.json({ error: 'Failed to clear region' }, { status: 500 })
    }

    return NextResponse.json({
      clearedImage: `data:${clearedImageData.mimeType};base64,${clearedImageData.data}`,
    })
  } catch (error) {
    console.error('Clear region error:', error)
    return NextResponse.json({ error: 'Clearing region failed' }, { status: 500 })
  }
}
