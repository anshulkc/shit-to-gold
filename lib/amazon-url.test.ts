import { describe, it, expect } from 'vitest'
import { generateAmazonUrl } from './amazon-url'

describe('generateAmazonUrl', () => {
  it('generates search URL for simple item', () => {
    const url = generateAmazonUrl('gray sofa')
    expect(url).toBe('https://amazon.com/s?k=gray%20sofa')
  })

  it('handles special characters', () => {
    const url = generateAmazonUrl('mid-century walnut coffee table')
    expect(url).toBe('https://amazon.com/s?k=mid-century%20walnut%20coffee%20table')
  })

  it('trims whitespace', () => {
    const url = generateAmazonUrl('  lamp  ')
    expect(url).toBe('https://amazon.com/s?k=lamp')
  })
})
