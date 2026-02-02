import { GoogleGenAI } from '@google/genai'

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }
  return new GoogleGenAI({ apiKey })
}

export async function createTextChat() {
  const ai = getGeminiClient()
  return ai.chats.create({
    model: 'gemini-2.5-flash',
  })
}

export async function createImageChat() {
  const ai = getGeminiClient()
  return ai.chats.create({
    model: 'gemini-3-pro-image-preview',
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  })
}

// Backwards compatibility alias - will be removed after API routes are updated
export const createGeminiChat = createImageChat

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string
        inlineData?: {
          data: string
          mimeType: string
        }
      }>
    }
  }>
}

export interface ImageData {
  data: string
  mimeType: string
}

export function extractImageFromResponse(response: GeminiResponse): ImageData | null {
  for (const part of response.candidates[0]?.content?.parts || []) {
    if (part.inlineData) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      }
    }
  }
  return null
}

export function extractTextFromResponse(response: GeminiResponse): string {
  for (const part of response.candidates[0]?.content?.parts || []) {
    if (part.text) {
      return part.text
    }
  }
  return ''
}
