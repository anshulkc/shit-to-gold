import { test, expect } from '@playwright/test'

test.describe('Furnishing Flow', () => {
  test('shows upload screen initially', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/drop room photo/i)).toBeVisible()
  })

  test('has correct page title', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /ai room furnisher/i })).toBeVisible()
  })
})
