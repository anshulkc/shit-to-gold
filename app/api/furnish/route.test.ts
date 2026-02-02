import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/gemini', () => ({
  createGeminiChat: vi.fn().mockResolvedValue({
    sendMessage: vi.fn()
      .mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{ inlineData: { data: 'furnishedBase64', mimeType: 'image/png' } }]
          }
        }]
      })
      .mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{ text: '["walnut coffee table", "blue velvet sofa"]' }]
          }
        }]
      }),
  }),
  extractImageFromResponse: vi.fn().mockReturnValue({ data: 'furnishedBase64', mimeType: 'image/png' }),
  extractTextFromResponse: vi.fn().mockReturnValue('["walnut coffee table", "blue velvet sofa"]'),
}))

import { POST } from './route'

describe('POST /api/furnish', () => {
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
})
