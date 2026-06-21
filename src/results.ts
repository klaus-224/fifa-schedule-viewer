import type {
  Match,
  MatchGoal,
  MatchScore,
  WorldCupResultMatch,
  WorldCupResultsResponse,
  WorldCupPlayer,
  WorldCupSquad,
  WorldCupTeam,
} from './types'

export const WORLD_CUP_RESULTS_DATA_PATH = '/data/worldcup-results.json'
export const WORLD_CUP_TEAMS_DATA_PATH = '/data/worldcup-teams.json'
export const WORLD_CUP_SQUADS_DATA_PATH = '/data/worldcup-squads.json'

export const PLAYER_POSITION_ORDER = ['GK', 'DF', 'MF', 'FW']

const LOCAL_TEAM_ALIASES: Record<string, string> = {
  "cote d'ivoire": 'CIV',
  'cote divoire': 'CIV',
  "côte d'ivoire": 'CIV',
  'côte d’ivoire': 'CIV',
  'ivory coast': 'CIV',
  'korea republic': 'KOR',
  'south korea': 'KOR',
  turkey: 'TUR',
  turkiye: 'TUR',
  türkiye: 'TUR',
  usa: 'USA',
  'united states': 'USA',
}

export type TeamCodeLookup = Map<string, string>

const isHiddenUnicodeCodePoint = (codePoint: number | undefined) =>
  codePoint !== undefined &&
  ((codePoint >= 0x00 && codePoint <= 0x1f) ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x061c ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069) ||
    (codePoint >= 0xe0000 && codePoint <= 0xe007f))

export const stripHiddenUnicode = (value: string) =>
  Array.from(value)
    .filter((character) => !isHiddenUnicodeCodePoint(character.codePointAt(0)))
    .join('')

export const normalizeTeamLookupKey = (value: string) =>
  stripHiddenUnicode(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-zA-Z0-9'& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const registerTeamName = (lookup: TeamCodeLookup, name: string | undefined, code: string) => {
  if (!name || !code) return
  lookup.set(normalizeTeamLookupKey(name), code)
}

export const buildTeamCodeLookup = (teams: WorldCupTeam[]): TeamCodeLookup => {
  const lookup: TeamCodeLookup = new Map()

  teams.forEach((team) => {
    registerTeamName(lookup, team.name, team.fifa_code)
    registerTeamName(lookup, team.name_normalised, team.fifa_code)
  })

  Object.entries(LOCAL_TEAM_ALIASES).forEach(([alias, code]) => {
    registerTeamName(lookup, alias, code)
  })

  return lookup
}

export const getTeamCode = (lookup: TeamCodeLookup, team: string) =>
  lookup.get(normalizeTeamLookupKey(team))

const splitMatchTeams = (teams: string): [string, string] | null => {
  const parts = teams.split(/\s+vs\.?\s+/i).map((team) => team.trim())
  return parts.length === 2 ? [parts[0], parts[1]] : null
}

const scoreKey = (date: string, team1Code: string, team2Code: string, group?: string) =>
  [date, team1Code, team2Code, group ?? ''].join('|')

const normalizeGoals = (goals: MatchGoal[] | undefined) => goals ?? []

const buildScore = (
  result: WorldCupResultMatch,
  reverseScore: boolean,
): MatchScore | undefined => {
  const fulltime = result.score?.ft
  if (!fulltime) return undefined

  const halftime = result.score?.ht
  const goals1 = normalizeGoals(result.goals1)
  const goals2 = normalizeGoals(result.goals2)

  return {
    home: reverseScore ? fulltime[1] : fulltime[0],
    away: reverseScore ? fulltime[0] : fulltime[1],
    ...(halftime ? { halftime: reverseScore ? [halftime[1], halftime[0]] : halftime } : {}),
    goalsHome: reverseScore ? goals2 : goals1,
    goalsAway: reverseScore ? goals1 : goals2,
    source: 'OpenFootball worldcup.json',
  }
}

const getScheduleCodes = (match: Match, lookup: TeamCodeLookup): [string, string] | null => {
  const teams = splitMatchTeams(match.teams)
  if (!teams) return null
  const team1Code = getTeamCode(lookup, teams[0])
  const team2Code = getTeamCode(lookup, teams[1])
  return team1Code && team2Code ? [team1Code, team2Code] : null
}

const getResultCodes = (
  result: WorldCupResultMatch,
  lookup: TeamCodeLookup,
): [string, string] | null => {
  const team1Code = getTeamCode(lookup, result.team1)
  const team2Code = getTeamCode(lookup, result.team2)
  return team1Code && team2Code ? [team1Code, team2Code] : null
}

export const attachResultsToMatches = (
  matches: Match[],
  resultsResponse: WorldCupResultsResponse,
  teams: WorldCupTeam[],
) => {
  const lookup = buildTeamCodeLookup(teams)
  const resultsByMatchNo = new Map<number, WorldCupResultMatch>()
  const resultsByKey = new Map<string, WorldCupResultMatch>()

  resultsResponse.matches.forEach((result) => {
    if (!result.score?.ft) return

    if (result.num) {
      resultsByMatchNo.set(result.num, result)
      return
    }

    const resultCodes = getResultCodes(result, lookup)
    if (!resultCodes) return

    resultsByKey.set(scoreKey(result.date, resultCodes[0], resultCodes[1], result.group), result)
  })

  return matches.map((match) => {
    const scheduleCodes = getScheduleCodes(match, lookup)
    const numberedResult = resultsByMatchNo.get(match.matchNo)
    const keyedResult = scheduleCodes
      ? resultsByKey.get(scoreKey(match.date, scheduleCodes[0], scheduleCodes[1], match.group))
      : undefined
    const reversedKeyedResult = scheduleCodes
      ? resultsByKey.get(scoreKey(match.date, scheduleCodes[1], scheduleCodes[0], match.group))
      : undefined
    const result = numberedResult ?? keyedResult ?? reversedKeyedResult

    if (!scheduleCodes) return match

    const score = result ? buildScore(result, result === reversedKeyedResult) : undefined

    return {
      ...match,
      teamCodes: scheduleCodes,
      ...(score ? { score } : {}),
    }
  })
}

export const parseWorldCupResultsResponse = (payload: unknown): WorldCupResultsResponse => {
  const response = payload as WorldCupResultsResponse | undefined
  return {
    name: response?.name ?? '',
    matches: Array.isArray(response?.matches) ? response.matches : [],
  }
}

export const parseWorldCupTeamsResponse = (payload: unknown): WorldCupTeam[] =>
  Array.isArray(payload) ? (payload as WorldCupTeam[]) : []

export const parseWorldCupSquadsResponse = (payload: unknown): WorldCupSquad[] =>
  Array.isArray(payload) ? (payload as WorldCupSquad[]) : []

export const buildSquadLookup = (squads: WorldCupSquad[]) =>
  new Map(squads.filter((squad) => squad.fifa_code).map((squad) => [squad.fifa_code, squad]))

export const groupSquadsByGroup = (squads: WorldCupSquad[]) =>
  squads
    .slice()
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    .reduce<Record<string, WorldCupSquad[]>>((groups, squad) => {
      const groupName = squad.group ? `Group ${squad.group}` : 'Ungrouped'
      groups[groupName] = groups[groupName] ?? []
      groups[groupName].push(squad)
      return groups
    }, {})

export const groupPlayersByPosition = (players: WorldCupPlayer[]) => {
  const groups = players.reduce<Record<string, WorldCupPlayer[]>>((positionGroups, player) => {
    const position = player.pos || 'Other'
    positionGroups[position] = positionGroups[position] ?? []
    positionGroups[position].push(player)
    return positionGroups
  }, {})

  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => {
      const positionA = PLAYER_POSITION_ORDER.indexOf(a)
      const positionB = PLAYER_POSITION_ORDER.indexOf(b)
      const rankA = positionA === -1 ? PLAYER_POSITION_ORDER.length : positionA
      const rankB = positionB === -1 ? PLAYER_POSITION_ORDER.length : positionB
      return rankA - rankB || a.localeCompare(b)
    }),
  )
}
