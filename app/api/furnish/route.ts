import { NextRequest, NextResponse } from 'next/server'
import { createImageChat, createTextChat, extractImageFromResponse, extractTextFromResponse, withRetry } from '@/lib/gemini'
import { parseItemList } from '@/lib/parse-items'

export async function POST(request: NextRequest) {
  try {
    const { clearedImage, prompt } = await request.json()

    if (!clearedImage || !prompt) {
      return NextResponse.json({ error: 'Missing clearedImage or prompt' }, { status: 400 })
    }

    // Extract base64 data from data URL
    const base64Match = clearedImage.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }
    const [, mimeType, base64Data] = base64Match

    // Turn 1: Generate furnished room (uses image model)
    const imageChat = await createImageChat()
    const furnishResponse = await withRetry(() => imageChat.sendMessage({
      message: [
        { inlineData: { data: base64Data, mimeType } },
        { text: `Furnish this empty room with the following style: ${prompt}. Add appropriate furniture, decor, and accessories that match this style. Make it look like a professionally designed, lived-in space.` },
      ],
    }))
    const furnishedImageData = extractImageFromResponse(furnishResponse)

    if (!furnishedImageData) {
      return NextResponse.json({ error: 'Failed to generate furnished image' }, { status: 500 })
    }

    // Turn 2: Get item list (uses cheaper text model with furnished image for context)
    const textChat = await createTextChat()
    const itemsResponse = await withRetry(() => textChat.sendMessage({
      message: [
        { inlineData: { data: furnishedImageData.data, mimeType: furnishedImageData.mimeType } },
        { text: 'List every furniture and decor item visible in this furnished room as a JSON array of searchable product descriptions. Be specific (e.g., "mid-century walnut coffee table" not just "coffee table"). Only output the JSON array, nothing else.' },
      ],
    }))
    const itemsText = extractTextFromResponse(itemsResponse)
    const addedItems = parseItemList(itemsText)

    return NextResponse.json({
      furnishedImage: `data:${furnishedImageData.mimeType};base64,${furnishedImageData.data}`,
      addedItems,
    })
  } catch (error) {
    console.error('Furnish error:', error)
    return NextResponse.json({ error: 'Furnishing failed' }, { status: 500 })
  }
}
