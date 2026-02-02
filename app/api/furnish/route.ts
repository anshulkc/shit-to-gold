import { NextRequest, NextResponse } from 'next/server'
import { createTextChat, extractImageFromResponse, extractTextFromResponse, withRetry, sendImageMessageWithFallback } from '@/lib/gemini'
import { parseItemList } from '@/lib/parse-items'

const DEFAULT_VARIANT_COUNT = 3

interface FurnishedVariant {
  image: string
  addedItems: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { clearedImage, prompt, count = DEFAULT_VARIANT_COUNT } = await request.json()

    if (!clearedImage || !prompt) {
      return NextResponse.json({ error: 'Missing clearedImage or prompt' }, { status: 400 })
    }

    const variantCount = Math.min(Math.max(1, count), 5) // Clamp between 1-5

    // Extract base64 data from data URL
    const base64Match = clearedImage.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }
    const [, mimeType, base64Data] = base64Match

    // Generate multiple furnished room variants in parallel
    const generateVariant = async (): Promise<FurnishedVariant | null> => {
      try {
        const furnishResponse = await sendImageMessageWithFallback({
          message: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Furnish this empty room with the following style: ${prompt}. Add appropriate furniture, decor, and accessories that match this style. Make it look like a professionally designed, lived-in space.` },
          ],
        })
        const furnishedImageData = extractImageFromResponse(furnishResponse)

        if (!furnishedImageData) return null

        // Get item list for this variant
        const textChat = await createTextChat()
        const itemsResponse = await withRetry(() => textChat.sendMessage({
          message: [
            { inlineData: { data: furnishedImageData.data, mimeType: furnishedImageData.mimeType } },
            { text: 'List every furniture and decor item visible in this furnished room as a JSON array of searchable product descriptions. Be specific (e.g., "mid-century walnut coffee table" not just "coffee table"). Only output the JSON array, nothing else.' },
          ],
        }))
        const itemsText = extractTextFromResponse(itemsResponse)
        const addedItems = parseItemList(itemsText)

        return {
          image: `data:${furnishedImageData.mimeType};base64,${furnishedImageData.data}`,
          addedItems,
        }
      } catch (err) {
        console.error('Variant generation failed:', err)
        return null
      }
    }

    // Run all generations in parallel
    const variantPromises = Array.from({ length: variantCount }, () => generateVariant())
    const results = await Promise.all(variantPromises)

    // Filter out failed generations
    const furnishedImages = results.filter((v): v is FurnishedVariant => v !== null)

    if (furnishedImages.length === 0) {
      return NextResponse.json({ error: 'Failed to generate any furnished images' }, { status: 500 })
    }

    return NextResponse.json({ furnishedImages })
  } catch (error) {
    console.error('Furnish error:', error)
    return NextResponse.json({ error: 'Furnishing failed' }, { status: 500 })
  }
}
