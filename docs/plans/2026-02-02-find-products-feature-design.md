# Find Products Feature Design

## Overview

Add a "Find Products" mode that allows users to upload any image and get Amazon links for items identified in it, with interactive bounding box overlays.

## User Flow

1. User sees toggle at top: "Furnish Room" | "Find Products"
2. In "Find Products" mode, user uploads an image
3. Image is analyzed - Gemini identifies items with bounding box coordinates
4. Image displayed with subtle bounding box overlays
5. On hover: box highlights, tooltip shows item name + "Shop on Amazon" link

## API Design

### `POST /api/identify`

**Input:**
```json
{
  "image": "data:image/png;base64,..."
}
```

**Gemini Prompt:**
```
Detect all furniture, decor, and products in this image.
Return JSON array with box_2d as [ymin, xmin, ymax, xmax] normalized to 0-1000,
and label as a detailed product description suitable for Amazon search
(e.g., "mid-century walnut coffee table" not just "table").
```

**Config:**
```typescript
{ response_mime_type: "application/json" }
```

**Output:**
```json
{
  "items": [
    {
      "label": "mid-century walnut coffee table",
      "boundingBox": { "top": 45, "left": 20, "width": 30, "height": 15 }
    }
  ]
}
```

Bounding boxes converted from Gemini's `[ymin, xmin, ymax, xmax]` (0-1000) to percentage-based `{ top, left, width, height }` for CSS positioning.

## UI Components

### Mode Toggle
- Tab bar at top of page
- State: `mode: 'furnish' | 'identify'`
- Furnish mode shows existing workflow unchanged
- Identify mode shows new flow

### AnnotatedImage Component
```typescript
interface AnnotatedItem {
  label: string
  boundingBox: { top: number; left: number; width: number; height: number }
}

interface Props {
  imageSrc: string
  items: AnnotatedItem[]
}
```

- Container: `position: relative`
- Image fills container
- Each bounding box: `position: absolute` div with percentage positioning
- Default style: `border: 2px solid rgba(255,255,255,0.3)`
- Hover style: `border: 2px solid #3b82f6, background: rgba(59,130,246,0.1)`

### Hover Tooltip
- Appears on bounding box hover
- Shows item label + "Shop on Amazon" button
- Uses `generateAmazonUrl()` from `/lib/amazon-url.ts`
- Opens in new tab

## Files to Create/Modify

1. **Create** `/app/api/identify/route.ts` - New API endpoint
2. **Create** `/components/annotated-image.tsx` - Interactive image with bounding boxes
3. **Create** `/components/mode-toggle.tsx` - Tab toggle component
4. **Modify** `/app/page.tsx` - Add mode state and conditional rendering

## Reused Code

- `gemini.ts` - Model initialization, `withRetry()` for 503 handling
- `amazon-url.ts` - `generateAmazonUrl()` function
- `ImageDropzone` - File upload component
- `LoadingOverlay` - Loading state component
