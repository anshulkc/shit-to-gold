# Manual Clear Highlighting

## Overview

Add an optional stage after auto-clearing where users can manually highlight rectangular areas to clear. This handles cases where the AI didn't fully clear the room or users want to remove specific items.

## User Flow

```
Upload → Analyzing → Cleared ←→ Manual-Clearing → Furnishing → Furnished
                         ↑____________↓
                    "Need to clear more?" / "Done"
```

1. After auto-clear, user sees the cleared image with a "Need to clear more?" button
2. Clicking it enters `manual-clearing` state - ReactCrop activates on the cleared image
3. User draws a rectangle → immediately calls API → image updates
4. Stays in selection mode for more clearing
5. "Done clearing" button returns to normal `cleared` state
6. User proceeds to furnishing as usual

## UI Components

### Cleared State (modified)

- Before/after slider comparison (unchanged)
- Removed items list (unchanged)
- Style prompt input (unchanged)
- **New:** "Need to clear more?" button (secondary style, below the slider)

### Manual-Clearing State (new)

- ReactCrop wrapper around the cleared image
- Instruction text: "Draw a rectangle around areas to clear"
- "Done clearing" button (primary)
- Loading spinner overlay when clearing is in progress

## API

### `POST /api/clear-region`

**Input:**
```typescript
{
  image: string,        // Current cleared image (base64 data URL)
  crop: {
    x: number,          // Pixel coordinates
    y: number,
    width: number,
    height: number
  }
}
```

**Output:**
```typescript
{
  clearedImage: string  // Updated image with region cleared
}
```

**Implementation:**
- Reuse `sendImageMessageWithFallback()` from existing code
- Fixed prompt: "Remove all furniture, decor, and items in the region (x:{x}, y:{y}, width:{w}, height:{h}). Keep the room structure - walls, floors, windows, doors. Leave the area empty."
- Same model fallback pattern as other image endpoints

## State Management

### Changes to `app/page.tsx`

```typescript
// Updated AppState type
type AppState = 'upload' | 'analyzing' | 'cleared' | 'manual-clearing' | 'furnishing' | 'furnished' | 'editing' | 'refining'

// New state for crop during manual clearing
const [clearCrop, setClearCrop] = useState<Crop>()

// New handler
const handleClearRegion = async (crop: Crop) => {
  // Call /api/clear-region
  // Update clearedImage with result
  // Clear the crop selection
  // Stay in 'manual-clearing' state
}
```

**Key behaviors:**
- `clearedImage` gets updated each time a region is cleared
- Crop state (`clearCrop`) is separate from the existing `crop` used in refine
- No prompt dialog needed - clearing triggers immediately on crop complete
- "Done" button sets state back to `cleared`

## Files to Change

### New
- `app/api/clear-region/route.ts`

### Modified
- `app/page.tsx`

## Design Decisions

- **Rectangular selection** - Reuses existing ReactCrop, consistent with refine UX
- **Optional button** - Keeps happy path fast, doesn't add friction for users who don't need it
- **Immediate clear** - No prompt needed since intent is always "clear this area"
- **Stay in mode** - Users can clear multiple areas without re-entering the mode
