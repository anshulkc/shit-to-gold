# AI Furnishing App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app where users upload room photos, clear furniture with AI, refurnish based on text prompts, and refine specific areas.

**Architecture:** Next.js App Router with shadcn/ui components. Nano Banana Pro (`gemini-3-pro-image-preview`) handles all image analysis, generation, and editing via multi-turn chat. No database - images stay in browser memory.

**Tech Stack:** Next.js 15, shadcn/ui, react-image-crop, @google/genai, Vitest, React Testing Library, Playwright

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`
- Create: `.env.local.example`, `.gitignore`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

Expected: Project scaffolded with App Router

**Step 2: Install shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Expected: `components.json` created, `lib/utils.ts` created

**Step 3: Add shadcn components we need**

Run:
```bash
npx shadcn@latest add button card dialog input textarea scroll-area skeleton
```

Expected: Components added to `components/ui/`

**Step 4: Install additional dependencies**

Run:
```bash
npm install @google/genai react-image-crop
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom happy-dom playwright @playwright/test
```

Expected: Dependencies in package.json

**Step 5: Create environment template**

Create `.env.local.example`:
```
GEMINI_API_KEY=your_api_key_here
```

**Step 6: Update .gitignore**

Add to `.gitignore`:
```
.env.local
```

**Step 7: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 8: Add test scripts to package.json**

Add to `scripts`:
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:e2e": "playwright test"
}
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with shadcn/ui and testing setup"
```

---

## Task 2: Amazon URL Utility (TDD)

**Files:**
- Create: `lib/amazon-url.ts`
- Create: `lib/amazon-url.test.ts`

**Step 1: Write the failing test**

Create `lib/amazon-url.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateAmazonUrl } from './amazon-url'

describe('generateAmazonUrl', () => {
  it('generates search URL for simple item', () => {
    const url = generateAmazonUrl('gray sofa')
    expect(url).toBe('https://amazon.com/s?k=gray%20sofa')
  })

  it('handles special characters', () => {
    const url = generateAmazonUrl('mid-century walnut coffee table')
    expect(url).toBe('https://amazon.com/s?k=mid-century%20walnut%20coffee%20table')
  })

  it('trims whitespace', () => {
    const url = generateAmazonUrl('  lamp  ')
    expect(url).toBe('https://amazon.com/s?k=lamp')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/amazon-url.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `lib/amazon-url.ts`:
```typescript
export function generateAmazonUrl(item: string): string {
  const searchTerm = encodeURIComponent(item.trim())
  return `https://amazon.com/s?k=${searchTerm}`
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/amazon-url.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/amazon-url.ts lib/amazon-url.test.ts
git commit -m "feat: add Amazon URL generator with tests"
```

---

## Task 3: Item List Parser (TDD)

**Files:**
- Create: `lib/parse-items.ts`
- Create: `lib/parse-items.test.ts`

**Step 1: Write the failing test**

Create `lib/parse-items.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseItemList } from './parse-items'

describe('parseItemList', () => {
  it('parses valid JSON array', () => {
    const response = '["gray sofa", "coffee table", "lamp"]'
    expect(parseItemList(response)).toEqual(['gray sofa', 'coffee table', 'lamp'])
  })

  it('extracts JSON from surrounding text', () => {
    const response = 'Here are the items: ["sofa", "chair"] in the room.'
    expect(parseItemList(response)).toEqual(['sofa', 'chair'])
  })

  it('returns empty array for invalid response', () => {
    const response = 'No items found'
    expect(parseItemList(response)).toEqual([])
  })

  it('handles nested quotes in items', () => {
    const response = '["24\\" TV", "lamp"]'
    expect(parseItemList(response)).toEqual(['24" TV', 'lamp'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/parse-items.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `lib/parse-items.ts`:
```typescript
export function parseItemList(response: string): string[] {
  // Try to find JSON array in response
  const match = response.match(/\[[\s\S]*?\]/)
  if (!match) return []

  try {
    const parsed = JSON.parse(match[0])
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/parse-items.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/parse-items.ts lib/parse-items.test.ts
git commit -m "feat: add item list parser with tests"
```

---

## Task 4: Gemini Client Wrapper

**Files:**
- Create: `lib/gemini.ts`
- Create: `lib/gemini.test.ts`

**Step 1: Write the failing test**

Create `lib/gemini.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGeminiChat, extractImageFromResponse, extractTextFromResponse } from './gemini'

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    chats: {
      create: vi.fn().mockReturnValue({
        sendMessage: vi.fn(),
      }),
    },
  })),
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/gemini.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `lib/gemini.ts`:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/gemini.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/gemini.ts lib/gemini.test.ts
git commit -m "feat: add Gemini client wrapper with tests"
```

---

## Task 5: Analyze API Route

**Files:**
- Create: `app/api/analyze/route.ts`
- Create: `app/api/analyze/route.test.ts`

**Step 1: Write the failing test**

Create `app/api/analyze/route.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- app/api/analyze/route.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `app/api/analyze/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createGeminiChat, extractImageFromResponse, extractTextFromResponse } from '@/lib/gemini'
import { parseItemList } from '@/lib/parse-items'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageFile.type || 'image/png'

    const chat = await createGeminiChat()

    // Turn 1: Get item list (text only)
    const itemsResponse = await chat.sendMessage({
      message: [
        { inlineData: { data: base64Image, mimeType } },
        { text: 'List all furniture and decor items visible in this room as a JSON array of strings. Only output the JSON array, nothing else.' },
      ],
    })
    const itemsText = extractTextFromResponse(itemsResponse)
    const removedItems = parseItemList(itemsText)

    // Turn 2: Clear the room (image only)
    const clearResponse = await chat.sendMessage({
      message: 'Now generate this same room with all furniture and decor removed. Keep the room structure intact: walls, floors, windows, doors, built-in features. The room should look empty and clean.',
    })
    const clearedImageData = extractImageFromResponse(clearResponse)

    if (!clearedImageData) {
      return NextResponse.json({ error: 'Failed to generate cleared image' }, { status: 500 })
    }

    return NextResponse.json({
      removedItems,
      clearedImage: `data:${clearedImageData.mimeType};base64,${clearedImageData.data}`,
    })
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- app/api/analyze/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/analyze/route.ts app/api/analyze/route.test.ts
git commit -m "feat: add analyze API route with tests"
```

---

## Task 6: Furnish API Route

**Files:**
- Create: `app/api/furnish/route.ts`
- Create: `app/api/furnish/route.test.ts`

**Step 1: Write the failing test**

Create `app/api/furnish/route.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- app/api/furnish/route.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `app/api/furnish/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createGeminiChat, extractImageFromResponse, extractTextFromResponse } from '@/lib/gemini'
import { parseItemList } from '@/lib/parse-items'

export async function POST(request: NextRequest) {
  try {
    const { clearedImage, prompt } = await request.json()

    if (!clearedImage || !prompt) {
      return NextResponse.json({ error: 'Missing clearedImage or prompt' }, { status: 400 })
    }

    // Extract base64 data from data URL
    const base64Match = clearedImage.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }
    const [, mimeType, base64Data] = base64Match

    const chat = await createGeminiChat()

    // Turn 1: Generate furnished room
    const furnishResponse = await chat.sendMessage({
      message: [
        { inlineData: { data: base64Data, mimeType } },
        { text: `Furnish this empty room with the following style: ${prompt}. Add appropriate furniture, decor, and accessories that match this style. Make it look like a professionally designed, lived-in space.` },
      ],
    })
    const furnishedImageData = extractImageFromResponse(furnishResponse)

    if (!furnishedImageData) {
      return NextResponse.json({ error: 'Failed to generate furnished image' }, { status: 500 })
    }

    // Turn 2: Get item list
    const itemsResponse = await chat.sendMessage({
      message: 'List every furniture and decor item you added to this room as a JSON array of searchable product descriptions. Be specific (e.g., "mid-century walnut coffee table" not just "coffee table"). Only output the JSON array, nothing else.',
    })
    const itemsText = extractTextFromResponse(itemsResponse)
    const addedItems = parseItemList(itemsText)

    return NextResponse.json({
      furnishedImage: `data:${furnishedImageData.mimeType};base64,${furnishedImageData.data}`,
      addedItems,
    })
  } catch (error) {
    console.error('Furnish error:', error)
    return NextResponse.json({ error: 'Furnishing failed' }, { status: 500 })
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- app/api/furnish/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/furnish/route.ts app/api/furnish/route.test.ts
git commit -m "feat: add furnish API route with tests"
```

---

## Task 7: Refine API Route

**Files:**
- Create: `app/api/refine/route.ts`
- Create: `app/api/refine/route.test.ts`

**Step 1: Write the failing test**

Create `app/api/refine/route.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/gemini', () => ({
  createGeminiChat: vi.fn().mockResolvedValue({
    sendMessage: vi.fn().mockResolvedValue({
      candidates: [{
        content: {
          parts: [{ inlineData: { data: 'refinedBase64', mimeType: 'image/png' } }]
        }
      }]
    }),
  }),
  extractImageFromResponse: vi.fn().mockReturnValue({ data: 'refinedBase64', mimeType: 'image/png' }),
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- app/api/refine/route.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `app/api/refine/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createGeminiChat, extractImageFromResponse } from '@/lib/gemini'

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export async function POST(request: NextRequest) {
  try {
    const { furnishedImage, crop, prompt } = await request.json() as {
      furnishedImage: string
      crop: CropArea
      prompt: string
    }

    if (!furnishedImage || !crop || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const base64Match = furnishedImage.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }
    const [, mimeType, base64Data] = base64Match

    const chat = await createGeminiChat()

    const refineResponse = await chat.sendMessage({
      message: [
        { inlineData: { data: base64Data, mimeType } },
        {
          text: `In this room image, there is a region at coordinates (x: ${crop.x}, y: ${crop.y}, width: ${crop.width}, height: ${crop.height}) that needs to be changed. Replace the item in that region with: ${prompt}. Keep everything outside this region exactly the same. Maintain the same lighting, perspective, and style as the rest of the room.`
        },
      ],
    })

    const refinedImageData = extractImageFromResponse(refineResponse)

    if (!refinedImageData) {
      return NextResponse.json({ error: 'Failed to generate refined image' }, { status: 500 })
    }

    return NextResponse.json({
      refinedImage: `data:${refinedImageData.mimeType};base64,${refinedImageData.data}`,
    })
  } catch (error) {
    console.error('Refine error:', error)
    return NextResponse.json({ error: 'Refinement failed' }, { status: 500 })
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- app/api/refine/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/refine/route.ts app/api/refine/route.test.ts
git commit -m "feat: add refine API route with tests"
```

---

## Task 8: ImageDropzone Component

**Files:**
- Create: `components/image-dropzone.tsx`
- Create: `components/image-dropzone.test.tsx`

**Step 1: Write the failing test**

Create `components/image-dropzone.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageDropzone } from './image-dropzone'

describe('ImageDropzone', () => {
  it('renders upload prompt', () => {
    render(<ImageDropzone onImageSelect={vi.fn()} />)
    expect(screen.getByText(/drop room photo/i)).toBeInTheDocument()
  })

  it('calls onImageSelect when file is selected', async () => {
    const onImageSelect = vi.fn()
    render(<ImageDropzone onImageSelect={onImageSelect} />)

    const input = screen.getByTestId('file-input')
    const file = new File(['image'], 'room.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(onImageSelect).toHaveBeenCalledWith(expect.any(String))
  })

  it('shows error for non-image files', async () => {
    const onImageSelect = vi.fn()
    render(<ImageDropzone onImageSelect={onImageSelect} />)

    const input = screen.getByTestId('file-input')
    const file = new File(['text'], 'doc.txt', { type: 'text/plain' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(onImageSelect).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/image-dropzone.test.tsx`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `components/image-dropzone.tsx`:
```typescript
'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface ImageDropzoneProps {
  onImageSelect: (dataUrl: string) => void
}

export function ImageDropzone({ onImageSelect }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onImageSelect(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [onImageSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-16">
        <label className="cursor-pointer text-center">
          <div className="text-4xl mb-4">📷</div>
          <p className="text-lg font-medium">Drop room photo or click to upload</p>
          <p className="text-sm text-muted-foreground mt-2">Supports JPG, PNG</p>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            data-testid="file-input"
          />
        </label>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/image-dropzone.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/image-dropzone.tsx components/image-dropzone.test.tsx
git commit -m "feat: add ImageDropzone component with tests"
```

---

## Task 9: ImageSliderCompare Component

**Files:**
- Create: `components/image-slider-compare.tsx`
- Create: `components/image-slider-compare.test.tsx`

**Step 1: Write the failing test**

Create `components/image-slider-compare.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImageSliderCompare } from './image-slider-compare'

describe('ImageSliderCompare', () => {
  it('renders both images', () => {
    render(
      <ImageSliderCompare
        beforeImage="data:image/png;base64,before"
        afterImage="data:image/png;base64,after"
        beforeLabel="Before"
        afterLabel="After"
      />
    )

    expect(screen.getByAltText('Before')).toBeInTheDocument()
    expect(screen.getByAltText('After')).toBeInTheDocument()
  })

  it('renders slider control', () => {
    render(
      <ImageSliderCompare
        beforeImage="data:image/png;base64,before"
        afterImage="data:image/png;base64,after"
        beforeLabel="Before"
        afterLabel="After"
      />
    )

    expect(screen.getByRole('slider')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/image-slider-compare.test.tsx`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `components/image-slider-compare.tsx`:
```typescript
'use client'

import { useState, useCallback } from 'react'

interface ImageSliderCompareProps {
  beforeImage: string
  afterImage: string
  beforeLabel: string
  afterLabel: string
}

export function ImageSliderCompare({
  beforeImage,
  afterImage,
  beforeLabel,
  afterLabel,
}: ImageSliderCompareProps) {
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value))
  }, [])

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-lg">
      {/* After image (full) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <span className="text-xs">↔</span>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
        {beforeLabel}
      </div>
      <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
        {afterLabel}
      </div>

      {/* Invisible slider input */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={handleSliderChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        role="slider"
        aria-label="Compare images"
      />
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/image-slider-compare.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/image-slider-compare.tsx components/image-slider-compare.test.tsx
git commit -m "feat: add ImageSliderCompare component with tests"
```

---

## Task 10: ItemList Component

**Files:**
- Create: `components/item-list.tsx`
- Create: `components/item-list.test.tsx`

**Step 1: Write the failing test**

Create `components/item-list.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItemList } from './item-list'

describe('ItemList', () => {
  it('renders items with Amazon links', () => {
    const items = ['gray sofa', 'coffee table']
    render(<ItemList items={items} title="Added Items" showLinks />)

    expect(screen.getByText('Added Items')).toBeInTheDocument()
    expect(screen.getByText('gray sofa')).toBeInTheDocument()
    expect(screen.getByText('coffee table')).toBeInTheDocument()

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://amazon.com/s?k=gray%20sofa')
  })

  it('renders without links when showLinks is false', () => {
    const items = ['gray sofa']
    render(<ItemList items={items} title="Removed" showLinks={false} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<ItemList items={[]} title="Items" showLinks />)
    expect(screen.getByText(/no items/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/item-list.test.tsx`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `components/item-list.tsx`:
```typescript
import { ScrollArea } from '@/components/ui/scroll-area'
import { generateAmazonUrl } from '@/lib/amazon-url'

interface ItemListProps {
  items: string[]
  title: string
  showLinks: boolean
}

export function ItemList({ items, title, showLinks }: ItemListProps) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items found</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="text-sm">
                {showLinks ? (
                  <a
                    href={generateAmazonUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {item}
                  </a>
                ) : (
                  <span>{item}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/item-list.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/item-list.tsx components/item-list.test.tsx
git commit -m "feat: add ItemList component with tests"
```

---

## Task 11: RefineDialog Component

**Files:**
- Create: `components/refine-dialog.tsx`
- Create: `components/refine-dialog.test.tsx`

**Step 1: Write the failing test**

Create `components/refine-dialog.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RefineDialog } from './refine-dialog'

describe('RefineDialog', () => {
  it('renders when open', () => {
    render(
      <RefineDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    )
    expect(screen.getByText(/what would you like instead/i)).toBeInTheDocument()
  })

  it('calls onSubmit with prompt', () => {
    const onSubmit = vi.fn()
    render(
      <RefineDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
      />
    )

    const input = screen.getByPlaceholderText(/blue velvet armchair/i)
    fireEvent.change(input, { target: { value: 'modern floor lamp' } })
    fireEvent.click(screen.getByRole('button', { name: /replace/i }))

    expect(onSubmit).toHaveBeenCalledWith('modern floor lamp')
  })

  it('disables input when loading', () => {
    render(
      <RefineDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={true}
      />
    )

    expect(screen.getByRole('button', { name: /replacing/i })).toBeDisabled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/refine-dialog.test.tsx`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `components/refine-dialog.tsx`:
```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface RefineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (prompt: string) => void
  isLoading: boolean
}

export function RefineDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: RefineDialogProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt.trim())
      setPrompt('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What would you like instead?</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="e.g., blue velvet armchair"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          className="min-h-[100px]"
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !prompt.trim()}>
            {isLoading ? 'Replacing...' : 'Replace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/refine-dialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/refine-dialog.tsx components/refine-dialog.test.tsx
git commit -m "feat: add RefineDialog component with tests"
```

---

## Task 12: LoadingOverlay Component

**Files:**
- Create: `components/loading-overlay.tsx`
- Create: `components/loading-overlay.test.tsx`

**Step 1: Write the failing test**

Create `components/loading-overlay.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingOverlay } from './loading-overlay'

describe('LoadingOverlay', () => {
  it('renders message', () => {
    render(<LoadingOverlay message="Analyzing room..." />)
    expect(screen.getByText('Analyzing room...')).toBeInTheDocument()
  })

  it('renders spinner', () => {
    render(<LoadingOverlay message="Loading" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- components/loading-overlay.test.tsx`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `components/loading-overlay.tsx`:
```typescript
interface LoadingOverlayProps {
  message: string
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
      <div
        role="status"
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
      />
      <p className="text-lg font-medium">{message}</p>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- components/loading-overlay.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/loading-overlay.tsx components/loading-overlay.test.tsx
git commit -m "feat: add LoadingOverlay component with tests"
```

---

## Task 13: Main Page Integration

**Files:**
- Modify: `app/page.tsx`
- Create: `app/page.test.tsx`

**Step 1: Write the failing test**

Create `app/page.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from './page'

// Mock fetch
global.fetch = vi.fn()

describe('Home page', () => {
  it('renders upload state initially', () => {
    render(<Home />)
    expect(screen.getByText(/drop room photo/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- app/page.test.tsx`
Expected: FAIL (page may have default Next.js content)

**Step 3: Write implementation**

Modify `app/page.tsx`:
```typescript
'use client'

import { useState, useCallback } from 'react'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ImageDropzone } from '@/components/image-dropzone'
import { ImageSliderCompare } from '@/components/image-slider-compare'
import { ItemList } from '@/components/item-list'
import { RefineDialog } from '@/components/refine-dialog'
import { LoadingOverlay } from '@/components/loading-overlay'

type AppState = 'upload' | 'analyzing' | 'cleared' | 'furnishing' | 'furnished' | 'refining'

export default function Home() {
  const [state, setState] = useState<AppState>('upload')
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [clearedImage, setClearedImage] = useState<string | null>(null)
  const [furnishedImage, setFurnishedImage] = useState<string | null>(null)
  const [removedItems, setRemovedItems] = useState<string[]>([])
  const [addedItems, setAddedItems] = useState<string[]>([])
  const [stylePrompt, setStylePrompt] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [refineDialogOpen, setRefineDialogOpen] = useState(false)

  const handleImageSelect = useCallback(async (dataUrl: string) => {
    setOriginalImage(dataUrl)
    setState('analyzing')

    try {
      const blob = await fetch(dataUrl).then(r => r.blob())
      const formData = new FormData()
      formData.append('image', blob, 'room.png')

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Analysis failed')

      const data = await response.json()
      setClearedImage(data.clearedImage)
      setRemovedItems(data.removedItems)
      setState('cleared')
    } catch (error) {
      console.error(error)
      setState('upload')
    }
  }, [])

  const handleFurnish = useCallback(async () => {
    if (!clearedImage || !stylePrompt.trim()) return
    setState('furnishing')

    try {
      const response = await fetch('/api/furnish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearedImage,
          prompt: stylePrompt,
        }),
      })

      if (!response.ok) throw new Error('Furnishing failed')

      const data = await response.json()
      setFurnishedImage(data.furnishedImage)
      setAddedItems(data.addedItems)
      setState('furnished')
    } catch (error) {
      console.error(error)
      setState('cleared')
    }
  }, [clearedImage, stylePrompt])

  const handleRefine = useCallback(async (prompt: string) => {
    if (!furnishedImage || !crop) return
    setState('refining')
    setRefineDialogOpen(false)

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          furnishedImage,
          crop: {
            x: Math.round(crop.x),
            y: Math.round(crop.y),
            width: Math.round(crop.width),
            height: Math.round(crop.height),
          },
          prompt,
        }),
      })

      if (!response.ok) throw new Error('Refinement failed')

      const data = await response.json()
      setFurnishedImage(data.refinedImage)
      setState('furnished')
      setCrop(undefined)
    } catch (error) {
      console.error(error)
      setState('furnished')
    }
  }, [furnishedImage, crop])

  const handleDownload = useCallback(() => {
    if (!furnishedImage) return
    const link = document.createElement('a')
    link.href = furnishedImage
    link.download = 'furnished-room.png'
    link.click()
  }, [furnishedImage])

  const handleStartOver = useCallback(() => {
    setOriginalImage(null)
    setClearedImage(null)
    setFurnishedImage(null)
    setRemovedItems([])
    setAddedItems([])
    setStylePrompt('')
    setCrop(undefined)
    setState('upload')
  }, [])

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AI Room Furnisher</h1>
        {state !== 'upload' && (
          <div className="flex gap-2">
            {state === 'furnished' && (
              <Button onClick={handleDownload}>Download</Button>
            )}
            <Button variant="outline" onClick={handleStartOver}>
              Start Over
            </Button>
          </div>
        )}
      </div>

      {state === 'upload' && (
        <ImageDropzone onImageSelect={handleImageSelect} />
      )}

      {state === 'analyzing' && originalImage && (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <img src={originalImage} alt="Original room" className="w-full h-full object-cover" />
          <LoadingOverlay message="Analyzing room..." />
        </div>
      )}

      {state === 'cleared' && originalImage && clearedImage && (
        <div className="space-y-6">
          <ImageSliderCompare
            beforeImage={originalImage}
            afterImage={clearedImage}
            beforeLabel="Original"
            afterLabel="Cleared"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Textarea
                placeholder="Describe your desired style (e.g., cozy scandinavian with warm wood tones)"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleFurnish}
                disabled={!stylePrompt.trim()}
                className="w-full"
              >
                Furnish Room
              </Button>
            </div>
            <ItemList items={removedItems} title="Items Removed" showLinks={false} />
          </div>
        </div>
      )}

      {state === 'furnishing' && clearedImage && (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <img src={clearedImage} alt="Cleared room" className="w-full h-full object-cover" />
          <LoadingOverlay message="Furnishing room..." />
        </div>
      )}

      {(state === 'furnished' || state === 'refining') && clearedImage && furnishedImage && (
        <div className="space-y-6">
          <div className="relative">
            {state === 'refining' ? (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <img src={furnishedImage} alt="Furnished room" className="w-full h-full object-cover" />
                <LoadingOverlay message="Refining selection..." />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Click and drag on the image to select an area to refine
                </p>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={() => {
                    if (crop && crop.width > 10 && crop.height > 10) {
                      setRefineDialogOpen(true)
                    }
                  }}
                >
                  <ImageSliderCompare
                    beforeImage={clearedImage}
                    afterImage={furnishedImage}
                    beforeLabel="Cleared"
                    afterLabel="Furnished"
                  />
                </ReactCrop>
              </>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ItemList items={removedItems} title="Items Removed" showLinks={false} />
            <ItemList items={addedItems} title="Items Added" showLinks />
          </div>
        </div>
      )}

      <RefineDialog
        open={refineDialogOpen}
        onOpenChange={setRefineDialogOpen}
        onSubmit={handleRefine}
        isLoading={state === 'refining'}
      />
    </main>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- app/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "feat: implement main page with full furnishing flow"
```

---

## Task 14: E2E Test Setup

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/furnish-flow.spec.ts`

**Step 1: Create Playwright config**

Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Step 2: Create E2E test**

Create `e2e/furnish-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Furnishing Flow', () => {
  test('shows upload screen initially', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/drop room photo/i)).toBeVisible()
  })

  test('has correct page title', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /ai room furnisher/i })).toBeVisible()
  })
})
```

**Step 3: Commit**

```bash
git add playwright.config.ts e2e/furnish-flow.spec.ts
git commit -m "feat: add Playwright E2E test setup"
```

---

## Task 15: Final Polish & Verification

**Step 1: Run all tests**

Run:
```bash
npm test
```

Expected: All unit and component tests pass

**Step 2: Run E2E tests**

Run:
```bash
npx playwright install chromium
npm run test:e2e
```

Expected: E2E tests pass

**Step 3: Start dev server and verify manually**

Run:
```bash
npm run dev
```

Expected: App loads at http://localhost:3000

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification complete"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Project Setup | - |
| 2 | Amazon URL Utility | 3 tests |
| 3 | Item List Parser | 4 tests |
| 4 | Gemini Client Wrapper | 4 tests |
| 5 | Analyze API Route | 1 test |
| 6 | Furnish API Route | 1 test |
| 7 | Refine API Route | 1 test |
| 8 | ImageDropzone Component | 3 tests |
| 9 | ImageSliderCompare Component | 2 tests |
| 10 | ItemList Component | 3 tests |
| 11 | RefineDialog Component | 3 tests |
| 12 | LoadingOverlay Component | 2 tests |
| 13 | Main Page Integration | 1 test |
| 14 | E2E Test Setup | 2 tests |
| 15 | Final Verification | - |
