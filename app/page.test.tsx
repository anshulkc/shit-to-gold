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
