interface LoadingOverlayProps {
  message: string
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
      <div
        role="status"
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
      />
      <p className="text-lg font-medium">{message}</p>
    </div>
  )
}
