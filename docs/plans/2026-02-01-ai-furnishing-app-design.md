# AI Furnishing App Design

## Overview

Web app that lets users upload a room photo, clear existing furniture, refurnish with AI based on a style prompt, and refine specific items. Uses Nano Banana Pro (Gemini 3 Pro Image) for all image generation.

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** shadcn/ui
- **Image Selection:** react-image-crop
- **AI:** Nano Banana Pro (`gemini-3-pro-image-preview`)
- **Animations:** Framer Motion (only if needed)

No database. No external storage. Images stay in browser memory, users download when ready.

## User Flow

```
Upload → Analyze → Cleared Preview → Furnish → Refine (optional) → Download
```

### State 1: Upload
- Centered dropzone (shadcn Card)
- Accepts jpg/png

### State 2: Analyzing
- Full-width image with loading overlay

### State 3: Cleared Preview
- Slider comparison: Original ↔ Cleared room
- List of items that were removed
- Text input for style prompt
- "Furnish Room" button

### State 4: Furnished
- Slider comparison: Cleared ↔ Furnished
- Item list with Amazon search links
- Download button
- Click image to enter refine mode

### State 5: Refine
- react-image-crop overlay on furnished image
- Dialog: "What would you like instead?"
- Submit regenerates that region
- Returns to State 4 with updated image

## Components

```
├── ImageDropzone
├── ImageSliderCompare
├── RemovedItemList
├── FurnishedItemList (with Amazon links)
├── StylePromptInput
├── RefineDialog
├── DownloadButton
└── LoadingOverlay
```

## API Routes

### POST /api/analyze
Input: Room image
Output: `{ clearedImage, removedItems: string[] }`

### POST /api/furnish
Input: Cleared image + style prompt
Output: `{ furnishedImage, addedItems: string[] }`

### POST /api/refine
Input: Furnished image + crop coordinates + user request
Output: `{ refinedImage }`

## Nano Banana Pro Integration

Multi-turn approach separates image generation from structured text output.

### Analyze & Clear

```javascript
const chat = ai.chats.create({ model: "gemini-3-pro-image-preview" });

// Turn 1: Text only - get item list
const itemsRes = await chat.sendMessage([
  roomImage,
  "List all furniture and decor in this room as a JSON array of strings."
]);

// Turn 2: Image only - clear the room
const clearRes = await chat.sendMessage(
  "Generate this same room with all furniture and decor removed. Keep walls, floors, windows, doors intact."
);
```

### Furnish

```javascript
// Turn 1: Image generation
const furnishRes = await chat.sendMessage([
  clearedImage,
  `Furnish this empty room: ${userPrompt}`
]);

// Turn 2: Text only - get item list
const itemsRes = await chat.sendMessage(
  "List every item you added as a JSON array of searchable product descriptions."
);
```

### Refine

```javascript
const refineRes = await chat.sendMessage([
  furnishedImage,
  `Replace the item in region (x:${x}, y:${y}, width:${w}, height:${h}) with: ${userRequest}. Keep everything outside this region identical.`
]);
```

## Amazon Links

```javascript
const amazonUrl = `https://amazon.com/s?k=${encodeURIComponent(item)}`;
// Add &tag=youraffiliateId later if monetizing
```

## Testing Strategy (TDD)

### Unit Tests (Vitest)
- `lib/amazonUrl.test.ts` - URL generation
- `lib/parseItemList.test.ts` - JSON parsing from AI responses
- `lib/cropCoords.test.ts` - Coordinate normalization

### Component Tests (React Testing Library)
- `ImageDropzone.test.tsx` - File upload handling
- `ImageSliderCompare.test.tsx` - Slider interaction
- `RefineDialog.test.tsx` - Form submission
- `ItemList.test.tsx` - Renders items with links

### API Route Tests (mocked Nano Banana Pro)
- `app/api/analyze/route.test.ts`
- `app/api/furnish/route.test.ts`
- `app/api/refine/route.test.ts`

### E2E Tests (Playwright)
- Full flow: upload → analyze → furnish → refine → download
- Error states: invalid file, API failure

### Mocking Strategy
- Mock `@google/genai` in tests
- Use fixture images for consistent snapshots
