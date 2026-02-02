import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function createGeminiChat() {
  return ai.chats.create({
    model: 'gemini-3-pro-image-preview',
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  })
}

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
