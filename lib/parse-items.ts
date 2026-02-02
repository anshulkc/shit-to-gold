export function parseItemList(response: string): string[] {
  // Try to find JSON array in response
  const match = response.match(/\[[\s\S]*?\]/)
  if (!match) return []

  try {
    const parsed = JSON.parse(match[0])
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}
