import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/gemini', () => ({
  createImageChat: vi.fn().mockResolvedValue({
    sendMessage: vi.fn().mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ inlineData: { data: 'refinedBase64', mimeType: 'image/png' } }]
        }
      }]
    }),
  }),
  extractImageFromResponse: vi.fn().mockReturnValue({ data: 'refinedBase64', mimeType: 'image/png' }),
  withRetry: vi.fn().mockImplementation((fn) => fn()),
}))

import { POST } from './route'

describe('POST /api/refine', () => {
  it('returns refined image', async () => {
    const request = new Request('http://localhost/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        furnishedImage: 'data:image/png;base64,furnishedBase64',
        crop: { x: 100, y: 200, width: 150, height: 150 },
        prompt: 'blue velvet armchair',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.refinedImage).toBe('data:image/png;base64,refinedBase64')
  })
})
