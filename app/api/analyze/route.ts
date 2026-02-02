import { NextRequest, NextResponse } from 'next/server'
import { createTextChat, createImageChat, extractImageFromResponse, extractTextFromResponse } from '@/lib/gemini'
import { parseItemList } from '@/lib/parse-items'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageFile.type || 'image/png'

    // Turn 1: Get item list using text model (cheaper)
    const textChat = await createTextChat()
    const itemsResponse = await textChat.sendMessage({
      message: [
        { inlineData: { data: base64Image, mimeType } },
        { text: 'List all furniture and decor items visible in this room as a JSON array of strings. Only output the JSON array, nothing else.' },
      ],
    })
    const itemsText = extractTextFromResponse(itemsResponse)
    const removedItems = parseItemList(itemsText)

    // Turn 2: Clear the room using image model (for image generation)
    const imageChat = await createImageChat()
    const clearResponse = await imageChat.sendMessage({
      message: [
        { inlineData: { data: base64Image, mimeType } },
        { text: 'Generate this same room with all furniture and decor removed. Keep the room structure intact: walls, floors, windows, doors, built-in features. The room should look empty and clean.' },
      ],
    })
    const clearedImageData = extractImageFromResponse(clearResponse)

    if (!clearedImageData) {
      return NextResponse.json({ error: 'Failed to generate cleared image' }, { status: 500 })
    }

    return NextResponse.json({
      removedItems,
      clearedImage: `data:${clearedImageData.mimeType};base64,${clearedImageData.data}`,
    })
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
