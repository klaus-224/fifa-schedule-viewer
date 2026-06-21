import Papa from 'papaparse'
import type { Match, MatchFilters, MatchRow } from './types'

export const EMPTY_FILTERS: MatchFilters = {
  query: '',
  team: 'all',
  stage: 'all',
  group: 'all',
  city: 'all',
  startDate: '',
  endDate: '',
}

export const normalizeMatch = (row: MatchRow): Match => ({
  matchNo: Number(row.match_no),
  date: row.mdt_date.trim(),
  time: row.mdt_time.trim(),
  teams: row.teams.trim(),
  stage: row.stage.trim(),
  group: row.group.trim(),
  stadium: row.stadium.trim(),
  city: row.city.trim(),
  utcDateTime: row.utc_datetime.trim(),
  matchSourceUrl: row.match_source_url.trim(),
  officialFifaSchedulePdf: row.official_fifa_schedule_pdf.trim(),
})

export const parseMatches = (csv: string): Match[] => {
  const result = Papa.parse<MatchRow>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    throw new Error(result.errors.map((error) => error.message).join('; '))
  }

  return result.data
    .filter((row) => row.match_no && row.mdt_date && row.teams)
    .map(normalizeMatch)
    .sort(compareMatches)
}

export const compareMatches = (a: Match, b: Match) =>
  a.utcDateTime.localeCompare(b.utcDateTime) || a.matchNo - b.matchNo

export const formatLongDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))

export const formatMonthDay = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))

export const formatLocalTime = (utcDateTime: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(`${utcDateTime.replace(' ', 'T')}Z`))

export const parseUtcDateTime = (utcDateTime: string) =>
  new Date(`${utcDateTime.replace(' ', 'T')}Z`)

const MATCH_DURATION_MINUTES = 120
const getLocalDateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

export const isMatchLive = (match: Match, now = new Date()) => {
  const start = parseUtcDateTime(match.utcDateTime).getTime()
  const end = start + MATCH_DURATION_MINUTES * 60 * 1000
  const current = now.getTime()
  return current >= start && current < end
}

export const isMatchPlayed = (match: Match, now = new Date()) =>
  match.date < getLocalDateKey(now)

export const isMatchDayPlayed = (matches: Match[], now = new Date()) =>
  matches.length > 0 && matches.every((match) => isMatchPlayed(match, now))

export const getUniqueOptions = (matches: Match[], key: keyof Match) =>
  Array.from(new Set(matches.map((match) => String(match[key])).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  )

export const filterMatches = (matches: Match[], filters: MatchFilters) => {
  const query = filters.query.trim().toLowerCase()
  const team = filters.team.trim().toLowerCase()

  return matches.filter((match) => {
    const haystack = [
      match.teams,
      match.stage,
      match.group,
      match.stadium,
      match.city,
      String(match.matchNo),
    ]
      .join(' ')
      .toLowerCase()

    const teamMatches =
      !team ||
      team === 'all' ||
      match.teams.toLowerCase().includes(team)

    return (
      (!query || haystack.includes(query)) &&
      teamMatches &&
      (filters.stage === 'all' || match.stage === filters.stage) &&
      (filters.group === 'all' || match.group === filters.group) &&
      (filters.city === 'all' || match.city === filters.city) &&
      (!filters.startDate || match.date >= filters.startDate) &&
      (!filters.endDate || match.date <= filters.endDate)
    )
  })
}

export const groupMatchesByDate = (matches: Match[]) =>
  matches.reduce<Record<string, Match[]>>((groups, match) => {
    groups[match.date] = groups[match.date] ?? []
    groups[match.date].push(match)
    return groups
  }, {})

export const groupMatchesByCity = (matches: Match[]) =>
  matches.reduce<Record<string, Match[]>>((groups, match) => {
    groups[match.city] = groups[match.city] ?? []
    groups[match.city].push(match)
    return groups
  }, {})

export const groupMatchesByTeam = (matches: Match[]) =>
  matches.reduce<Record<string, Match[]>>((groups, match) => {
    match.teams
      .split(/\s+vs\.?\s+/i)
      .map((team) => team.trim())
      .filter(Boolean)
      .forEach((team) => {
        groups[team] = groups[team] ?? []
        groups[team].push(match)
      })
    return groups
  }, {})

export const calendarDays = (year: number, monthIndex: number) => {
  const first = new Date(year, monthIndex, 1)
  const firstWeekday = first.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const days: Array<string | null> = []

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  return days
}
