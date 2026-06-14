import { access, mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import process from 'node:process'

const STANDINGS_ENDPOINT =
  'https://statsapi.sports.bellmedia.ca/v2/standings/soccer/fifa_wc/division?brand=tsn&lang=en&season=2026'

const STANDINGS_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'x-api-key': 'a1fa8ec36e36de75a6e9b1d87ec24469a7ce4e2a',
  Referer: 'https://www.tsn.ca/',
}

const outputPath = resolve(process.cwd(), 'public/data/standings.json')
const hasCachedSnapshot = async () => {
  try {
    await access(outputPath)
    return true
  } catch {
    return false
  }
}

try {
  const response = await fetch(STANDINGS_ENDPOINT, {
    headers: STANDINGS_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`Standings sync failed: ${response.status}`)
  }

  const payload = await response.json()

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')

  console.log(`Synced standings to ${outputPath}`)
} catch (error) {
  if (await hasCachedSnapshot()) {
    console.warn(
      `Standings refresh failed, keeping cached snapshot at ${outputPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    process.exit(0)
  }

  throw error
}
