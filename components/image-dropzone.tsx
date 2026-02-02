'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface ImageDropzoneProps {
  onImageSelect: (dataUrl: string) => void
}

export function ImageDropzone({ onImageSelect }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onImageSelect(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [onImageSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-16">
        <label className="cursor-pointer text-center">
          <div className="text-4xl mb-4">📷</div>
          <p className="text-lg font-medium">Drop room photo or click to upload</p>
          <p className="text-sm text-muted-foreground mt-2">Supports JPG, PNG</p>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            data-testid="file-input"
          />
        </label>
      </CardContent>
    </Card>
  )
}
