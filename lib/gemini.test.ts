import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGeminiChat, extractImageFromResponse, extractTextFromResponse } from './gemini'

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    chats = {
      create: vi.fn().mockReturnValue({
        sendMessage: vi.fn(),
      }),
    }
  },
}))

describe('gemini client', () => {
  it('creates chat with correct model', async () => {
    const chat = await createGeminiChat()
    expect(chat).toBeDefined()
    expect(chat.sendMessage).toBeDefined()
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
