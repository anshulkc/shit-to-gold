import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock sendMessage functions - defined inside factory to avoid hoisting issues
const mockTextSendMessage = vi.fn()
const mockImageSendMessage = vi.fn()

// Mock gemini before importing route
vi.mock('@/lib/gemini', () => {
  return {
    createTextChat: vi.fn().mockImplementation(() => Promise.resolve({
      sendMessage: mockTextSendMessage,
    })),
    createImageChat: vi.fn().mockImplementation(() => Promise.resolve({
      sendMessage: mockImageSendMessage,
    })),
    extractImageFromResponse: vi.fn().mockReturnValue({ data: 'clearedImageBase64', mimeType: 'image/png' }),
    extractTextFromResponse: vi.fn().mockReturnValue('["gray sofa", "coffee table"]'),
    withRetry: vi.fn().mockImplementation((fn) => fn()),
  }
})

import { POST } from './route'
import { createTextChat, createImageChat } from '@/lib/gemini'

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockTextSendMessage.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ text: '["gray sofa", "coffee table"]' }]
        }
      }]
    })
    mockImageSendMessage.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ inlineData: { data: 'clearedImageBase64', mimeType: 'image/png' } }]
        }
      }]
    })
  })

  it('returns removed items and cleared image', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['fake-image'], { type: 'image/png' }))

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.removedItems).toEqual(['gray sofa', 'coffee table'])
    expect(data.clearedImage).toBe('data:image/png;base64,clearedImageBase64')
  })

  it('uses createTextChat for Turn 1 (item listing)', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['fake-image'], { type: 'image/png' }))

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData,
    })

    await POST(request)

    expect(createTextChat).toHaveBeenCalledTimes(1)
    expect(mockTextSendMessage).toHaveBeenCalledTimes(1)
    // Verify it was called with the image and text prompt
    expect(mockTextSendMessage).toHaveBeenCalledWith({
      message: expect.arrayContaining([
        expect.objectContaining({ inlineData: expect.any(Object) }),
        expect.objectContaining({ text: expect.stringContaining('JSON array') }),
      ]),
    })
  })

  it('uses createImageChat for Turn 2 (image generation)', async () => {
    const formData = new FormData()
    formData.append('image', new Blob(['fake-image'], { type: 'image/png' }))

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData,
    })

    await POST(request)

    expect(createImageChat).toHaveBeenCalledTimes(1)
    expect(mockImageSendMessage).toHaveBeenCalledTimes(1)
    // Verify it was called with the clear room prompt and original image
    expect(mockImageSendMessage).toHaveBeenCalledWith({
      message: expect.arrayContaining([
        expect.objectContaining({ inlineData: expect.any(Object) }),
        expect.objectContaining({ text: expect.stringContaining('empty') }),
      ]),
    })
  })

  it('returns 400 when no image provided', async () => {
    const formData = new FormData()

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No image provided')
  })
})
