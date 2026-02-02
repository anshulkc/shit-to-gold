'use client'

import { useState, useEffect } from 'react'

interface LoadingOverlayProps {
  messages: string[]
  intervalMs?: number
}

export function LoadingOverlay({ messages, intervalMs = 5000 }: LoadingOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [messages.length, intervalMs])

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
      <div
        role="status"
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
      />
      <p className="text-lg font-medium">{messages[currentIndex]}</p>
    </div>
  )
}
