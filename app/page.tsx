'use client'

import { useState, useCallback } from 'react'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ImageDropzone } from '@/components/image-dropzone'
import { ImageSliderCompare } from '@/components/image-slider-compare'
import { ItemList } from '@/components/item-list'
import { RefineDialog } from '@/components/refine-dialog'
import { LoadingOverlay } from '@/components/loading-overlay'

type AppState = 'upload' | 'analyzing' | 'cleared' | 'furnishing' | 'furnished' | 'refining'

export default function Home() {
  const [state, setState] = useState<AppState>('upload')
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [clearedImage, setClearedImage] = useState<string | null>(null)
  const [furnishedImage, setFurnishedImage] = useState<string | null>(null)
  const [removedItems, setRemovedItems] = useState<string[]>([])
  const [addedItems, setAddedItems] = useState<string[]>([])
  const [stylePrompt, setStylePrompt] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [refineDialogOpen, setRefineDialogOpen] = useState(false)

  const handleImageSelect = useCallback(async (dataUrl: string) => {
    setOriginalImage(dataUrl)
    setState('analyzing')

    try {
      const blob = await fetch(dataUrl).then(r => r.blob())
      const formData = new FormData()
      formData.append('image', blob, 'room.png')

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Analysis failed')

      const data = await response.json()
      setClearedImage(data.clearedImage)
      setRemovedItems(data.removedItems)
      setState('cleared')
    } catch (error) {
      console.error(error)
      setState('upload')
    }
  }, [])

  const handleFurnish = useCallback(async () => {
    if (!clearedImage || !stylePrompt.trim()) return
    setState('furnishing')

    try {
      const response = await fetch('/api/furnish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearedImage,
          prompt: stylePrompt,
        }),
      })

      if (!response.ok) throw new Error('Furnishing failed')

      const data = await response.json()
      setFurnishedImage(data.furnishedImage)
      setAddedItems(data.addedItems)
      setState('furnished')
    } catch (error) {
      console.error(error)
      setState('cleared')
    }
  }, [clearedImage, stylePrompt])

  const handleRefine = useCallback(async (prompt: string) => {
    if (!furnishedImage || !crop) return
    setState('refining')
    setRefineDialogOpen(false)

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          furnishedImage,
          crop: {
            x: Math.round(crop.x),
            y: Math.round(crop.y),
            width: Math.round(crop.width),
            height: Math.round(crop.height),
          },
          prompt,
        }),
      })

      if (!response.ok) throw new Error('Refinement failed')

      const data = await response.json()
      setFurnishedImage(data.refinedImage)
      setState('furnished')
      setCrop(undefined)
    } catch (error) {
      console.error(error)
      setState('furnished')
    }
  }, [furnishedImage, crop])

  const handleDownload = useCallback(() => {
    if (!furnishedImage) return
    const link = document.createElement('a')
    link.href = furnishedImage
    link.download = 'furnished-room.png'
    link.click()
  }, [furnishedImage])

  const handleStartOver = useCallback(() => {
    setOriginalImage(null)
    setClearedImage(null)
    setFurnishedImage(null)
    setRemovedItems([])
    setAddedItems([])
    setStylePrompt('')
    setCrop(undefined)
    setState('upload')
  }, [])

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AI Room Furnisher</h1>
        {state !== 'upload' && (
          <div className="flex gap-2">
            {state === 'furnished' && (
              <Button onClick={handleDownload}>Download</Button>
            )}
            <Button variant="outline" onClick={handleStartOver}>
              Start Over
            </Button>
          </div>
        )}
      </div>

      {state === 'upload' && (
        <ImageDropzone onImageSelect={handleImageSelect} />
      )}

      {state === 'analyzing' && originalImage && (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <img src={originalImage} alt="Original room" className="w-full h-full object-cover" />
          <LoadingOverlay message="Analyzing room..." />
        </div>
      )}

      {state === 'cleared' && originalImage && clearedImage && (
        <div className="space-y-6">
          <ImageSliderCompare
            beforeImage={originalImage}
            afterImage={clearedImage}
            beforeLabel="Original"
            afterLabel="Cleared"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Textarea
                placeholder="Describe your desired style (e.g., cozy scandinavian with warm wood tones)"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleFurnish}
                disabled={!stylePrompt.trim()}
                className="w-full"
              >
                Furnish Room
              </Button>
            </div>
            <ItemList items={removedItems} title="Items Removed" showLinks={false} />
          </div>
        </div>
      )}

      {state === 'furnishing' && clearedImage && (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <img src={clearedImage} alt="Cleared room" className="w-full h-full object-cover" />
          <LoadingOverlay message="Furnishing room..." />
        </div>
      )}

      {(state === 'furnished' || state === 'refining') && clearedImage && furnishedImage && (
        <div className="space-y-6">
          <div className="relative">
            {state === 'refining' ? (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <img src={furnishedImage} alt="Furnished room" className="w-full h-full object-cover" />
                <LoadingOverlay message="Refining selection..." />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Click and drag on the image to select an area to refine
                </p>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={() => {
                    if (crop && crop.width > 10 && crop.height > 10) {
                      setRefineDialogOpen(true)
                    }
                  }}
                >
                  <ImageSliderCompare
                    beforeImage={clearedImage}
                    afterImage={furnishedImage}
                    beforeLabel="Cleared"
                    afterLabel="Furnished"
                  />
                </ReactCrop>
              </>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ItemList items={removedItems} title="Items Removed" showLinks={false} />
            <ItemList items={addedItems} title="Items Added" showLinks />
          </div>
        </div>
      )}

      <RefineDialog
        open={refineDialogOpen}
        onOpenChange={setRefineDialogOpen}
        onSubmit={handleRefine}
        isLoading={state === 'refining'}
      />
    </main>
  )
}
