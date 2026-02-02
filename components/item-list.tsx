import { ScrollArea } from '@/components/ui/scroll-area'
import { generateAmazonUrl } from '@/lib/amazon-url'
import { Minus, Plus, ExternalLink } from 'lucide-react'

interface ItemListProps {
  items: string[]
  title: string
  showLinks: boolean
  variant?: 'removed' | 'added'
}

export function ItemList({ items, title, showLinks, variant = 'removed' }: ItemListProps) {
  const isAdded = variant === 'added'

  return (
    <div className="flex flex-col border rounded-lg bg-card overflow-hidden">
      <div className={`px-4 py-3 border-b ${isAdded ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
        <h3 className="font-semibold flex items-center gap-2">
          {isAdded ? (
            <Plus className="h-4 w-4 text-green-600" />
          ) : (
            <Minus className="h-4 w-4 text-red-600" />
          )}
          {title}
          <span className="text-muted-foreground font-normal text-sm">
            ({items.length})
          </span>
        </h3>
      </div>
      <ScrollArea className="h-[180px]">
        <div className="p-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No items</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={index}
                  className={`text-sm flex items-start gap-2 p-2 rounded-md ${
                    isAdded ? 'bg-green-500/5 hover:bg-green-500/10' : 'bg-red-500/5 hover:bg-red-500/10'
                  } transition-colors`}
                >
                  <span className={`mt-0.5 ${isAdded ? 'text-green-600' : 'text-red-600'}`}>
                    {isAdded ? '•' : '−'}
                  </span>
                  {showLinks ? (
                    <a
                      href={generateAmazonUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex-1 flex items-center gap-1"
                    >
                      {item}
                      <ExternalLink className="h-3 w-3 inline-block opacity-50" />
                    </a>
                  ) : (
                    <span className="flex-1">{item}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
