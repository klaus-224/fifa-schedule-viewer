import type { StandingGroup, StandingsResponse } from './types'

export const STANDINGS_ENDPOINT =
  'https://statsapi.sports.bellmedia.ca/v2/standings/soccer/fifa_wc/division?brand=tsn&lang=en&season=2026'

export const STANDINGS_DATA_PATH = '/data/standings.json'

export const STANDINGS_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'x-api-key': 'a1fa8ec36e36de75a6e9b1d87ec24469a7ce4e2a',
  Referer: 'https://www.tsn.ca/',
}

export const parseStandingsResponse = (payload: unknown): StandingGroup[] => {
  const response = payload as StandingsResponse | undefined
  return response?.divisionStandings ?? []
}
