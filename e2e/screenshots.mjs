// End-to-end run against a LeadFlow server in demo mode.
// It walks through the main flows in Chromium, fails on any broken step or browser error,
// and saves the screenshots used in the README to docs/.
//
// Usage: BASE_URL=http://localhost:3030 node screenshots.mjs
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3030'
const OUT = process.env.SHOTS_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs')
const errors = []

function watch(page) {
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const url = msg.location().url || ''
    // expected: the session check answers 401 before login, and web fonts are optional (offline runs use system fonts)
    if (url.endsWith('/api/auth/me') || /fonts\.(googleapis|gstatic)\.com/.test(url)) return
    errors.push(`${msg.text()} ${url}`.trim())
  })
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page)
  const shot = (p, file) => p.screenshot({ path: path.join(OUT, file) })

  // login screen
  await page.goto(BASE)
  const demo = page.getByRole('button', { name: 'Try the live demo' })
  await demo.waitFor()
  await page.evaluate(() => document.fonts.ready)
  await shot(page, 'login.png')

  // demo login: the board loads and the live connection is up
  await demo.click()
  await page.getByRole('heading', { name: 'Pipeline' }).waitFor()
  await page.locator('.card').first().waitFor()
  await page.locator('.live.on').waitFor({ timeout: 10_000 })
  console.log('cards on the board:', await page.locator('.card').count())

  // drag the first "New" card to "Contacted"
  const newCol = page.locator("section[aria-label='New column']")
  const contactedCol = page.locator("section[aria-label='Contacted column']")
  const first = newCol.locator('.card').first()
  const name = await first.locator('.card-name').innerText()
  const before = await newCol.locator('.card').count()
  const box = await first.boundingBox()
  const target = await contactedCol.boundingBox()
  await page.mouse.move(box.x + 40, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + 60, box.y + 40, { steps: 5 })
  await page.mouse.move(target.x + target.width / 2, target.y + 120, { steps: 15 })
  await page.mouse.up()
  await contactedCol.locator('.card-name', { hasText: name }).waitFor({ timeout: 5000 })
  assert.equal(await newCol.locator('.card').count(), before - 1)
  console.log('drag and drop ok:', name)

  // a lead arrives from an outside form while the board is open
  const me = await page.evaluate(() => fetch('/api/auth/me').then((res) => res.json()))
  const res = await fetch(`${BASE}/api/hook/${me.hookToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Shir Ben Ami', email: 'shir@example.com', phone: '054-9988776', company: 'Ben Ami Dental',
      message: 'Saw your site, can you call me about reminders for patients?', source: 'website',
      utm_source: 'google', utm_medium: 'cpc',
    }),
  })
  assert.equal(res.status, 201)
  await page.locator('.toast', { hasText: 'Shir Ben Ami' }).waitFor({ timeout: 5000 })
  await newCol.locator('.card-name', { hasText: 'Shir Ben Ami' }).waitFor()
  await page.waitForTimeout(300)
  await shot(page, 'board.png')
  console.log('live update ok')

  // open the new lead, add a note and move it to another stage
  await page.locator('.toast button', { hasText: 'Open lead' }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByLabel('New note').fill('Called back within 5 minutes. Sending a quote today.')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.locator('.note', { hasText: 'Called back' }).waitFor()
  await page.getByLabel('Move to stage').selectOption('qualified')
  await page.locator('.timeline', { hasText: 'Moved from New to Qualified' }).waitFor()
  await page.waitForTimeout(300)
  await shot(page, 'lead.png')
  await page.keyboard.press('Escape')

  // dashboard
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await page.locator('.kpi').first().waitFor()
  await page.waitForTimeout(1200) // let the charts finish animating
  await shot(page, 'dashboard.png')

  // "Connect a form": send a test lead and show the Make example
  await page.getByRole('link', { name: 'Connect a form' }).click()
  await page.getByRole('button', { name: 'Send a test lead' }).click()
  await page.locator('.toast').last().waitFor({ timeout: 5000 })
  await page.getByRole('tab', { name: 'Make' }).click()
  await page.waitForTimeout(300)
  await shot(page, 'settings.png')

  // all leads table
  await page.getByRole('link', { name: 'All leads' }).click()
  await page.locator('table.leads tbody tr').first().waitFor()
  console.log('rows in the table:', await page.locator('table.leads tbody tr').count())

  // phone layout, same session
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: await ctx.storageState() })
  const mobile = await phone.newPage()
  watch(mobile)
  await mobile.goto(BASE)
  await mobile.locator('.card').first().waitFor()
  await mobile.waitForTimeout(500)
  await shot(mobile, 'mobile.png')
  const width = await mobile.evaluate(() => document.documentElement.scrollWidth)
  assert.ok(width <= 390, `the page is wider than the phone screen: ${width}px`)

  assert.deepEqual(errors, [], 'the browser reported errors')
  console.log(`e2e ok, screenshots saved to ${OUT}`)
} finally {
  await browser.close()
}
