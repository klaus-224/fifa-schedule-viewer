import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CITY_LOCATIONS } from './cities'
import {
  calendarDays,
  filterMatches,
  formatLocalTime,
  isMatchDayPlayed,
  isMatchPlayed,
  groupMatchesByCity,
  parseMatches,
} from './data'
import { formatMatchTitle } from './teams'

const csv = `match_no,mdt_date,mdt_time,teams,stage,group,stadium,city,utc_datetime,match_source_url,official_fifa_schedule_pdf
1,2026-06-11,13:00,Mexico vs South Africa,Group stage,Group A,Estadio Azteca,Mexico City,2026-06-11 19:00,https://example.com/1,https://example.com/pdf
104,2026-07-19,13:00,W101 vs W102,Final,,MetLife Stadium,New York/New Jersey,2026-07-19 19:00,https://example.com/104,https://example.com/pdf`

describe('schedule data utilities', () => {
  it('parses and normalizes CSV rows', () => {
    const matches = parseMatches(csv)

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      matchNo: 1,
      teams: 'Mexico vs South Africa',
      group: 'Group A',
      city: 'Mexico City',
    })
  })

  it('keeps knockout placeholders as normal team labels', () => {
    const matches = parseMatches(csv)

    expect(matches[1].teams).toBe('W101 vs W102')
    expect(matches[1].stage).toBe('Final')
  })

  it('filters by search, stage, group, city, and dates', () => {
    const matches = parseMatches(csv)
    const filtered = filterMatches(matches, {
      query: 'azteca',
      stage: 'Group stage',
      group: 'Group A',
      city: 'Mexico City',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    })

    expect(filtered.map((match) => match.matchNo)).toEqual([1])
  })

  it('aggregates matches by city', () => {
    const matches = parseMatches(csv)

    expect(groupMatchesByCity(matches)['New York/New Jersey']).toHaveLength(1)
  })

  it('builds padded calendar days for June 2026', () => {
    const days = calendarDays(2026, 5)

    expect(days[0]).toBeNull()
    expect(days).toContain('2026-06-11')
    expect(days.length % 7).toBe(0)
  })

  it('formats viewer-local time from UTC without throwing', () => {
    expect(formatLocalTime('2026-06-11 19:00')).toEqual(expect.any(String))
  })

  it('parses the bundled schedule and has coordinates for every city', () => {
    const bundledCsv = readFileSync(resolve(process.cwd(), 'public/data/matches.csv'), 'utf8')
    const matches = parseMatches(bundledCsv)
    const cities = Array.from(new Set(matches.map((match) => match.city)))

    expect(matches).toHaveLength(104)
    expect(cities.every((city) => CITY_LOCATIONS[city])).toBe(true)
  })

  it('formats the visible match title with flags and punctuation', () => {
    expect(formatMatchTitle('Mexico vs South Africa')).toBe('Mexico 🇲🇽 vs. South Africa 🇿🇦')
  })

  it('marks played matches and played days using the current time', () => {
    const matches = parseMatches(csv)
    const afterFirstMatch = new Date('2026-06-12T00:00:00Z')
    const beforeFirstMatch = new Date('2026-06-11T18:59:59Z')

    expect(isMatchPlayed(matches[0], afterFirstMatch)).toBe(true)
    expect(isMatchPlayed(matches[0], beforeFirstMatch)).toBe(false)
    expect(isMatchDayPlayed(matches, afterFirstMatch)).toBe(false)
  })
})
