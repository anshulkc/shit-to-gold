import { describe, it, expect } from 'vitest'
import { parseItemList } from './parse-items'

describe('parseItemList', () => {
  it('parses valid JSON array', () => {
    const response = '["gray sofa", "coffee table", "lamp"]'
    expect(parseItemList(response)).toEqual(['gray sofa', 'coffee table', 'lamp'])
  })

  it('extracts JSON from surrounding text', () => {
    const response = 'Here are the items: ["sofa", "chair"] in the room.'
    expect(parseItemList(response)).toEqual(['sofa', 'chair'])
  })

  it('returns empty array for invalid response', () => {
    const response = 'No items found'
    expect(parseItemList(response)).toEqual([])
  })

  it('handles nested quotes in items', () => {
    const response = '["24\\" TV", "lamp"]'
    expect(parseItemList(response)).toEqual(['24" TV', 'lamp'])
  })
})
