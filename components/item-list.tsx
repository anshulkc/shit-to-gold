import { ScrollArea } from '@/components/ui/scroll-area'
import { generateAmazonUrl } from '@/lib/amazon-url'

interface ItemListProps {
  items: string[]
  title: string
  showLinks: boolean
}

export function ItemList({ items, title, showLinks }: ItemListProps) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items found</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="text-sm">
                {showLinks ? (
                  <a
                    href={generateAmazonUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {item}
                  </a>
                ) : (
                  <span>{item}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
