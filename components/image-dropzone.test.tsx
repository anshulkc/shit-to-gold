import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageDropzone } from './image-dropzone'

describe('ImageDropzone', () => {
  it('renders upload prompt', () => {
    render(<ImageDropzone onImageSelect={vi.fn()} />)
    expect(screen.getByText(/drop room photo/i)).toBeInTheDocument()
  })

  it('calls onImageSelect when file is selected', async () => {
    const onImageSelect = vi.fn()
    render(<ImageDropzone onImageSelect={onImageSelect} />)

    const input = screen.getByTestId('file-input')
    const file = new File(['image'], 'room.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onImageSelect).toHaveBeenCalledWith(expect.any(String))
    })
  })

  it('shows error for non-image files', async () => {
    const onImageSelect = vi.fn()
    render(<ImageDropzone onImageSelect={onImageSelect} />)

    const input = screen.getByTestId('file-input')
    const file = new File(['text'], 'doc.txt', { type: 'text/plain' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(onImageSelect).not.toHaveBeenCalled()
  })
})
