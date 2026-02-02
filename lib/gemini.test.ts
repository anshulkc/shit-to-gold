import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTextChat, createImageChat, extractImageFromResponse, extractTextFromResponse, withRetry } from './gemini'

// Track the last call arguments
let lastCreateCallArgs: { model: string; config?: { responseModalities?: string[] } } | null = null

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    chats = {
      create: vi.fn().mockImplementation((args) => {
        lastCreateCallArgs = args
        return {
          sendMessage: vi.fn(),
        }
      }),
    }
  },
}))

describe('gemini client', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key')
    lastCreateCallArgs = null
  })

  describe('createTextChat', () => {
    it('uses gemini-2.5-flash model', async () => {
      await createTextChat()
      expect(lastCreateCallArgs?.model).toBe('gemini-2.5-flash')
    })

    it('does not set responseModalities', async () => {
      await createTextChat()
      expect(lastCreateCallArgs?.config?.responseModalities).toBeUndefined()
    })

    it('returns a chat object with sendMessage', async () => {
      const chat = await createTextChat()
      expect(chat).toBeDefined()
      expect(chat.sendMessage).toBeDefined()
    })
  })

  describe('createImageChat', () => {
    it('uses gemini-3-pro-image-preview model', async () => {
      await createImageChat()
      expect(lastCreateCallArgs?.model).toBe('gemini-3-pro-image-preview')
    })

    it('sets responseModalities to TEXT and IMAGE', async () => {
      await createImageChat()
      expect(lastCreateCallArgs?.config?.responseModalities).toEqual(['TEXT', 'IMAGE'])
    })

    it('returns a chat object with sendMessage', async () => {
      const chat = await createImageChat()
      expect(chat).toBeDefined()
      expect(chat.sendMessage).toBeDefined()
    })
  })

  it('extracts image from response', () => {
    const response = {
      candidates: [{
        content: {
          parts: [
            { inlineData: { data: 'base64data', mimeType: 'image/png' } }
          ]
        }
      }]
    }
    const image = extractImageFromResponse(response)
    expect(image).toEqual({ data: 'base64data', mimeType: 'image/png' })
  })

  it('extracts text from response', () => {
    const response = {
      candidates: [{
        content: {
          parts: [
            { text: 'Hello world' }
          ]
        }
      }]
    }
    const text = extractTextFromResponse(response)
    expect(text).toBe('Hello world')
  })

  it('returns null for missing image', () => {
    const response = {
      candidates: [{
        content: {
          parts: [{ text: 'No image' }]
        }
      }]
    }
    const image = extractImageFromResponse(response)
    expect(image).toBeNull()
  })

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      const result = await withRetry(fn)
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on 503 error and succeeds', async () => {
      const error503 = new Error('Model overloaded') as Error & { status?: number }
      error503.status = 503

      const fn = vi.fn()
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce('success after retry')

      // Use small delays for fast tests
      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 })
      expect(result).toBe('success after retry')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('throws after max retries exhausted', async () => {
      const error503 = new Error('Model overloaded') as Error & { status?: number }
      error503.status = 503

      const fn = vi.fn().mockRejectedValue(error503)

      await expect(withRetry(fn, { maxRetries: 2, initialDelayMs: 10 })).rejects.toThrow('Model overloaded')
      expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
    })

    it('does not retry on non-503 errors', async () => {
      const error400 = new Error('Bad request') as Error & { status?: number }
      error400.status = 400

      const fn = vi.fn().mockRejectedValue(error400)

      await expect(withRetry(fn)).rejects.toThrow('Bad request')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('uses exponential backoff', async () => {
      const error503 = new Error('Model overloaded') as Error & { status?: number }
      error503.status = 503

      const callTimes: number[] = []
      const fn = vi.fn().mockImplementation(() => {
        callTimes.push(Date.now())
        if (callTimes.length < 3) {
          return Promise.reject(error503)
        }
        return Promise.resolve('success')
      })

      const startTime = Date.now()
      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 50 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)

      // Verify delays are approximately correct (allow some tolerance)
      // First retry after ~50ms, second retry after ~100ms more
      const totalTime = Date.now() - startTime
      expect(totalTime).toBeGreaterThanOrEqual(140) // 50 + 100 = 150ms minimum, with some tolerance
    })
  })
})
