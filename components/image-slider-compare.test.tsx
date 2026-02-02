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
