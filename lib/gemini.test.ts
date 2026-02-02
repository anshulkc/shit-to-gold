import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTextChat, createImageChat, extractImageFromResponse, extractTextFromResponse } from './gemini'

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
})
