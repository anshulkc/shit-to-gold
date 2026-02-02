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
