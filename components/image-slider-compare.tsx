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
          style={{ width: sliderPosition > 0 ? `${100 / (sliderPosition / 100)}%` : '100%', maxWidth: 'none' }}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <span className="text-xs">&#8596;</span>
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
