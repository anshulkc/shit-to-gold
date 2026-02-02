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
