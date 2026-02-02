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
