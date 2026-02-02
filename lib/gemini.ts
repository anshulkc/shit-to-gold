import { GoogleGenAI } from '@google/genai'

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
}

/**
 * Wraps an async function with retry logic for 503 errors (model overloaded).
 * Uses exponential backoff between retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1000 } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const err = error as Error & { status?: number }

      // Only retry on 503 (service unavailable / model overloaded)
      if (err.status !== 503) {
        throw error
      }

      lastError = err

      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

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

const IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'] as const

export async function createImageChat(model: string = IMAGE_MODELS[0]) {
  const ai = getGeminiClient()
  return ai.chats.create({
    model,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  })
}

/**
 * Sends an image generation message with automatic fallback to alternative models.
 * If the primary model returns 503, retries with fallback models.
 */
export async function sendImageMessageWithFallback(
  message: Parameters<Awaited<ReturnType<typeof createImageChat>>['sendMessage']>[0]
) {
  for (let i = 0; i < IMAGE_MODELS.length; i++) {
    const model = IMAGE_MODELS[i]
    const isLastModel = i === IMAGE_MODELS.length - 1

    try {
      const chat = await createImageChat(model)
      return await withRetry(() => chat.sendMessage(message))
    } catch (error) {
      const err = error as Error & { status?: number }

      // If it's a 503 and we have more models to try, continue to next model
      if (err.status === 503 && !isLastModel) {
        console.log(`Model ${model} overloaded, falling back to ${IMAGE_MODELS[i + 1]}`)
        continue
      }

      // Otherwise, rethrow the error
      throw error
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('All image models failed')
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
