import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock gemini before importing route
vi.mock('@/lib/gemini', () => ({
  createGeminiChat: vi.fn().mockResolvedValue({
    sendMessage: vi.fn()
      .mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{ text: '["gray sofa", "coffee table"]' }]
          }
        }]
      })
      .mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{ inlineData: { data: 'clearedImageBase64', mimeType: 'image/png' } }]
          }
        }]
      }),
  }),
  extractImageFromResponse: vi.fn().mockReturnValue({ data: 'clearedImageBase64', mimeType: 'image/png' }),
  extractTextFromResponse: vi.fn().mockReturnValue('["gray sofa", "coffee table"]'),
}))

import { POST } from './route'

describe('POST /api/analyze', () => {
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
})
