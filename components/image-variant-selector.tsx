'use client'

import { cn } from '@/lib/utils'

interface ImageVariantSelectorProps {
    variants: Array<{ image: string }>
    selectedIndex: number
    onSelect: (index: number) => void
}

export function ImageVariantSelector({
    variants,
    selectedIndex,
    onSelect,
}: ImageVariantSelectorProps) {
    if (variants.length <= 1) return null

    return (
        <div className="flex gap-3 justify-center py-4">
            {variants.map((variant, index) => (
                <button
                    key={index}
                    onClick={() => onSelect(index)}
                    className={cn(
                        'relative w-24 h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105',
                        index === selectedIndex
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                    )}
                >
                    <img
                        src={variant.image}
                        alt={`Variant ${index + 1}`}
                        className="w-full h-full object-cover"
                    />
                    <span
                        className={cn(
                            'absolute bottom-1 right-1 text-xs font-medium px-1.5 py-0.5 rounded',
                            index === selectedIndex
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-black/50 text-white'
                        )}
                    >
                        {index + 1}
                    </span>
                </button>
            ))}
        </div>
    )
}
