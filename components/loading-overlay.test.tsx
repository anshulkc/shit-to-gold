import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingOverlay } from './loading-overlay'

describe('LoadingOverlay', () => {
  it('renders first message', () => {
    render(<LoadingOverlay messages={['Analyzing room...']} />)
    expect(screen.getByText('Analyzing room...')).toBeInTheDocument()
  })

  it('renders spinner', () => {
    render(<LoadingOverlay messages={['Loading']} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders first message when multiple provided', () => {
    render(<LoadingOverlay messages={['First message', 'Second message']} />)
    expect(screen.getByText('First message')).toBeInTheDocument()
  })
})
