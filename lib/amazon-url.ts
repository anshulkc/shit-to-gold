export function generateAmazonUrl(item: string): string {
  const searchTerm = encodeURIComponent(item.trim())
  return `https://amazon.com/s?k=${searchTerm}`
}
