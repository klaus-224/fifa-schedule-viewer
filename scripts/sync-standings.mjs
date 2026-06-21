import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import process from 'node:process'

// ESPN's public scoreboard does not require a client API key.  It supplies the
// completed group-stage results; we derive the table from those results and
// the checked-in FIFA schedule, which provides the group membership.
const SCOREBOARD_ENDPOINT =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200'

const outputPath = resolve(process.cwd(), 'public/data/standings.json')
const matchesPath = resolve(process.cwd(), 'public/data/matches.csv')

const teamAliases = new Map([
  ['south korea', 'Korea Republic'],
  ['bosnia-herzegovina', 'Bosnia & Herzegovina'],
])

const normalizeTeamKey = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase()

const parseScheduledGroups = async () => {
  const csv = await readFile(matchesPath, 'utf8')
  const teamGroups = new Map()

  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [, , , teams, stage, group] = line.split(',')
    if (stage !== 'Group stage') continue

    for (const team of teams.split(/\s+vs\.?\s+/i)) {
      teamGroups.set(normalizeTeamKey(team), { name: team, group })
    }
  }

  return teamGroups
}

const emptyStats = () => ({
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  points: 0,
  goalsFor: 0,
  goalsAgainst: 0,
})

const stat = (displayName, shortName, value) => ({
  displayName,
  shortName,
  value: String(value),
})

const toStandingResponse = async (payload) => {
  const scheduledGroups = await parseScheduledGroups()
  const groups = new Map()
  const teamCodes = new Map()

  for (const { name, group } of scheduledGroups.values()) {
    const members = groups.get(group) ?? new Map()
    members.set(name, emptyStats())
    groups.set(group, members)
  }

  for (const event of payload.events ?? []) {
    if (event.season?.slug !== 'group-stage' || !event.status?.type?.completed) continue

    const competitors = event.competitions?.[0]?.competitors ?? []
    if (competitors.length !== 2) continue

    const resolved = competitors.map((competitor) => {
      const espnName = competitor.team?.displayName ?? ''
      const canonicalName = teamAliases.get(espnName.toLowerCase()) ?? espnName
      return {
        name: scheduledGroups.get(normalizeTeamKey(canonicalName))?.name,
        score: Number(competitor.score),
        code: competitor.team?.abbreviation ?? '',
      }
    })

    if (resolved.some(({ name, score }) => !name || !Number.isFinite(score))) continue

    const [home, away] = resolved
    const homeGroup = scheduledGroups.get(normalizeTeamKey(home.name))?.group
    const awayGroup = scheduledGroups.get(normalizeTeamKey(away.name))?.group
    if (!homeGroup || homeGroup !== awayGroup) continue

    const members = groups.get(homeGroup)
    const homeStats = members?.get(home.name)
    const awayStats = members?.get(away.name)
    if (!homeStats || !awayStats) continue

    teamCodes.set(home.name, home.code)
    teamCodes.set(away.name, away.code)
    homeStats.played += 1
    awayStats.played += 1
    homeStats.goalsFor += home.score
    homeStats.goalsAgainst += away.score
    awayStats.goalsFor += away.score
    awayStats.goalsAgainst += home.score

    if (home.score === away.score) {
      homeStats.draws += 1
      awayStats.draws += 1
      homeStats.points += 1
      awayStats.points += 1
    } else {
      const winner = home.score > away.score ? homeStats : awayStats
      const loser = home.score > away.score ? awayStats : homeStats
      winner.wins += 1
      winner.points += 3
      loser.losses += 1
    }
  }

  return {
    divisionStandings: [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, members]) => {
        const competitors = [...members.entries()]
          .sort(([leftName, left], [rightName, right]) => {
            const leftDifference = left.goalsFor - left.goalsAgainst
            const rightDifference = right.goalsFor - right.goalsAgainst
            return (
              right.points - left.points ||
              rightDifference - leftDifference ||
              right.goalsFor - left.goalsFor ||
              leftName.localeCompare(rightName)
            )
          })
          .map(([teamName, stats], index) => {
            const differential = stats.goalsFor - stats.goalsAgainst
            return {
              competitor: {
                name: teamName,
                shortName: teamCodes.get(teamName) ?? '',
                club: '',
                ranking: String(index + 1),
                place: index + 1,
                location: '',
                primaryColor: '',
              },
              place: index + 1,
              stats: {
                gamesPlayed: stat('Games played', 'GP', stats.played),
                wins: stat('Wins', 'W', stats.wins),
                draws: stat('Draws', 'D', stats.draws),
                losses: stat('Losses', 'L', stats.losses),
                points: stat('Points', 'PTS', stats.points),
                goalsFor: stat('Goals for', 'GF', stats.goalsFor),
                goalsAgainst: stat('Goals against', 'GA', stats.goalsAgainst),
                differential: stat('Goal difference', 'GD', differential),
              },
            }
          })

        return { name, competitorStandings: competitors }
      }),
  }
}

const hasCachedSnapshot = async () => {
  try {
    await access(outputPath)
    return true
  } catch {
    return false
  }
}

try {
  const response = await fetch(SCOREBOARD_ENDPOINT)

  if (!response.ok) {
    throw new Error(`Standings sync failed: ${response.status}`)
  }

  const payload = await response.json()
  const standings = await toStandingResponse(payload)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(standings, null, 2) + '\n', 'utf8')

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
