import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock functions need to be defined inside the factory or use vi.hoisted
const mockImageChatSendMessage = vi.fn()
const mockTextChatSendMessage = vi.fn()

vi.mock('@/lib/gemini', async () => {
  return {
    createImageChat: vi.fn().mockImplementation(async () => ({
      sendMessage: mockImageChatSendMessage,
    })),
    createTextChat: vi.fn().mockImplementation(async () => ({
      sendMessage: mockTextChatSendMessage,
    })),
    extractImageFromResponse: vi.fn().mockReturnValue({ data: 'furnishedBase64', mimeType: 'image/png' }),
    extractTextFromResponse: vi.fn().mockReturnValue('["walnut coffee table", "blue velvet sofa"]'),
  }
})

import { POST } from './route'
import { createImageChat, createTextChat } from '@/lib/gemini'

describe('POST /api/furnish', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up mock responses
    mockImageChatSendMessage.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ inlineData: { data: 'furnishedBase64', mimeType: 'image/png' } }]
        }
      }]
    })

    mockTextChatSendMessage.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ text: '["walnut coffee table", "blue velvet sofa"]' }]
        }
      }]
    })
  })

  it('returns furnished image and added items', async () => {
    const request = new Request('http://localhost/api/furnish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clearedImage: 'data:image/png;base64,clearedBase64',
        prompt: 'cozy scandinavian style',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.furnishedImage).toBe('data:image/png;base64,furnishedBase64')
    expect(data.addedItems).toEqual(['walnut coffee table', 'blue velvet sofa'])
  })

  it('uses createImageChat for Turn 1 (image generation)', async () => {
    const request = new Request('http://localhost/api/furnish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clearedImage: 'data:image/png;base64,clearedBase64',
        prompt: 'modern minimalist',
      }),
    })

    await POST(request)

    expect(createImageChat).toHaveBeenCalledTimes(1)
    expect(mockImageChatSendMessage).toHaveBeenCalledTimes(1)
    expect(mockImageChatSendMessage).toHaveBeenCalledWith({
      message: expect.arrayContaining([
        expect.objectContaining({ inlineData: expect.any(Object) }),
        expect.objectContaining({ text: expect.stringContaining('modern minimalist') }),
      ]),
    })
  })

  it('uses createTextChat for Turn 2 (item listing)', async () => {
    const request = new Request('http://localhost/api/furnish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clearedImage: 'data:image/png;base64,clearedBase64',
        prompt: 'industrial loft',
      }),
    })

    await POST(request)

    expect(createTextChat).toHaveBeenCalledTimes(1)
    expect(mockTextChatSendMessage).toHaveBeenCalledTimes(1)
    expect(mockTextChatSendMessage).toHaveBeenCalledWith({
      message: expect.arrayContaining([
        expect.objectContaining({ inlineData: expect.any(Object) }),
        expect.objectContaining({ text: expect.stringContaining('JSON array') }),
      ]),
    })
  })
})
