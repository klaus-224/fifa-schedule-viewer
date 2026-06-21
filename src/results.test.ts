import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseMatches } from './data'
import {
  attachResultsToMatches,
  buildTeamCodeLookup,
  buildSquadLookup,
  getTeamCode,
  groupPlayersByPosition,
  groupSquadsByGroup,
  parseWorldCupResultsResponse,
  parseWorldCupSquadsResponse,
  parseWorldCupTeamsResponse,
  stripHiddenUnicode,
} from './results'
import type { WorldCupResultsResponse, WorldCupSquad, WorldCupTeam } from './types'

const teams: WorldCupTeam[] = [
  {
    name: 'South Korea',
    name_normalised: 'Korea Republic',
    fifa_code: 'KOR',
    group: 'A',
    confed: 'AFC',
  },
  {
    name: 'Czech Republic',
    name_normalised: 'Czechia',
    fifa_code: 'CZE',
    group: 'A',
    confed: 'UEFA',
  },
  {
    name: 'USA',
    name_normalised: 'United States',
    fifa_code: 'USA',
    group: 'D',
    confed: 'CONCACAF',
  },
  {
    name: 'Turkey',
    name_normalised: 'Türkiye',
    fifa_code: 'TUR',
    group: 'D',
    confed: 'UEFA',
  },
  {
    name: 'Ivory Coast',
    name_normalised: "Cote d'Ivoire",
    fifa_code: 'CIV',
    group: 'E',
    confed: 'CAF',
  },
  {
    name: 'Mexico',
    fifa_code: 'MEX',
    group: 'A',
    confed: 'CONCACAF',
  },
  {
    name: 'South Africa',
    fifa_code: 'RSA',
    group: 'A',
    confed: 'CAF',
  },
  {
    name: 'England',
    fifa_code: 'ENG',
    group: 'L',
    confed: 'UEFA',
  },
  {
    name: 'Croatia',
    fifa_code: 'CRO',
    group: 'L',
    confed: 'UEFA',
  },
]

describe('World Cup result linking', () => {
  it('maps schedule and source aliases to FIFA codes', () => {
    const lookup = buildTeamCodeLookup(teams)

    expect(getTeamCode(lookup, 'South Korea')).toBe('KOR')
    expect(getTeamCode(lookup, 'Korea Republic')).toBe('KOR')
    expect(getTeamCode(lookup, 'USA')).toBe('USA')
    expect(getTeamCode(lookup, 'United States')).toBe('USA')
    expect(getTeamCode(lookup, 'Turkey')).toBe('TUR')
    expect(getTeamCode(lookup, 'Türkiye')).toBe('TUR')
    expect(getTeamCode(lookup, 'Ivory Coast')).toBe('CIV')
    expect(getTeamCode(lookup, 'Côte d’Ivoire')).toBe('CIV')
  })

  it('strips hidden Unicode used by subdivision flag tag sequences', () => {
    expect(stripHiddenUnicode('England\u{e0067}\u{e0062}')).toBe('England')
  })

  it('links group-stage scores by date, FIFA codes, and group', () => {
    const csv = `match_no,mdt_date,mdt_time,teams,stage,group,stadium,city,utc_datetime,match_source_url,official_fifa_schedule_pdf
2,2026-06-11,20:00,Korea Republic vs Czechia,Group stage,Group A,Estadio Akron,Guadalajara,2026-06-12 02:00,https://example.com/2,https://example.com/pdf`
    const results: WorldCupResultsResponse = {
      name: 'World Cup 2026',
      matches: [
        {
          round: 'Matchday 1',
          date: '2026-06-11',
          time: '20:00 UTC-6',
          team1: 'South Korea',
          team2: 'Czech Republic',
          score: { ft: [2, 1], ht: [0, 0] },
          group: 'Group A',
          ground: 'Guadalajara (Zapopan)',
        },
      ],
    }

    const [match] = attachResultsToMatches(parseMatches(csv), results, teams)

    expect(match.teamCodes).toEqual(['KOR', 'CZE'])
    expect(match.score).toMatchObject({ home: 2, away: 1, halftime: [0, 0] })
  })

  it('preserves app team order when source order is reversed', () => {
    const csv = `match_no,mdt_date,mdt_time,teams,stage,group,stadium,city,utc_datetime,match_source_url,official_fifa_schedule_pdf
1,2026-06-11,13:00,South Africa vs Mexico,Group stage,Group A,Estadio Azteca,Mexico City,2026-06-11 19:00,https://example.com/1,https://example.com/pdf`
    const results: WorldCupResultsResponse = {
      name: 'World Cup 2026',
      matches: [
        {
          round: 'Matchday 1',
          date: '2026-06-11',
          time: '13:00 UTC-6',
          team1: 'Mexico',
          team2: 'South Africa',
          score: { ft: [2, 0], ht: [1, 0] },
          group: 'Group A',
          ground: 'Mexico City',
        },
      ],
    }

    const [match] = attachResultsToMatches(parseMatches(csv), results, teams)

    expect(match.score).toMatchObject({ home: 0, away: 2, halftime: [0, 1] })
  })

  it('links knockout scores by match number', () => {
    const csv = `match_no,mdt_date,mdt_time,teams,stage,group,stadium,city,utc_datetime,match_source_url,official_fifa_schedule_pdf
104,2026-07-19,13:00,England vs Croatia,Final,,MetLife Stadium,New York/New Jersey,2026-07-19 19:00,https://example.com/104,https://example.com/pdf`
    const results: WorldCupResultsResponse = {
      name: 'World Cup 2026',
      matches: [
        {
          round: 'Final',
          num: 104,
          date: '2026-07-19',
          time: '15:00 UTC-4',
          team1: 'England',
          team2: 'Croatia',
          score: { ft: [3, 2] },
          ground: 'New York/New Jersey (East Rutherford)',
        },
      ],
    }

    const [match] = attachResultsToMatches(parseMatches(csv), results, teams)

    expect(match.score).toMatchObject({ home: 3, away: 2 })
  })

  it('enriches bundled snapshots without changing the schedule length', () => {
    const bundledCsv = readFileSync(resolve(process.cwd(), 'public/data/matches.csv'), 'utf8')
    const resultsPayload = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/worldcup-results.json'), 'utf8'),
    )
    const teamsPayload = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/worldcup-teams.json'), 'utf8'),
    )

    const matches = attachResultsToMatches(
      parseMatches(bundledCsv),
      parseWorldCupResultsResponse(resultsPayload),
      parseWorldCupTeamsResponse(teamsPayload),
    )

    expect(matches).toHaveLength(104)
    expect(matches.filter((match) => match.score)).not.toHaveLength(0)
  })
})

describe('World Cup squad helpers', () => {
  const squads: WorldCupSquad[] = [
    {
      name: 'Mexico',
      fifa_code: 'MEX',
      group: 'A',
      players: [
        {
          number: 9,
          pos: 'FW',
          name: 'Raul Jimenez',
          club: { name: 'Fulham FC', country: 'ENG' },
          date_of_birth: '1991-05-05',
        },
        {
          number: 1,
          pos: 'GK',
          name: 'Raul Rangel',
          club: { name: 'CD Guadalajara', country: 'MEX' },
          date_of_birth: '2000-02-25',
        },
      ],
    },
    {
      name: 'Canada',
      fifa_code: 'CAN',
      group: 'B',
      players: [],
    },
  ]

  it('parses squad payloads defensively', () => {
    expect(parseWorldCupSquadsResponse(squads)).toEqual(squads)
    expect(parseWorldCupSquadsResponse({ squads })).toEqual([])
  })

  it('indexes squads by FIFA code', () => {
    const lookup = buildSquadLookup(squads)

    expect(lookup.get('MEX')?.name).toBe('Mexico')
    expect(lookup.get('CAN')?.name).toBe('Canada')
  })

  it('groups squads by display group name', () => {
    expect(groupSquadsByGroup(squads)).toMatchObject({
      'Group A': [expect.objectContaining({ fifa_code: 'MEX' })],
      'Group B': [expect.objectContaining({ fifa_code: 'CAN' })],
    })
  })

  it('orders player groups by position', () => {
    expect(Object.keys(groupPlayersByPosition(squads[0].players))).toEqual(['GK', 'FW'])
  })

  it('parses the bundled squads snapshot', () => {
    const squadsPayload = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/worldcup-squads.json'), 'utf8'),
    )
    const parsedSquads = parseWorldCupSquadsResponse(squadsPayload)

    expect(parsedSquads.length).toBeGreaterThan(0)
    expect(parsedSquads.every((squad) => squad.fifa_code && Array.isArray(squad.players))).toBe(
      true,
    )
  })
})
