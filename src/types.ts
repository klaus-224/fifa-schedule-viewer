export type ViewMode = 'list' | 'calendar' | 'map'

export type MatchRow = {
  match_no: string
  mdt_date: string
  mdt_time: string
  teams: string
  stage: string
  group: string
  stadium: string
  city: string
  utc_datetime: string
  match_source_url: string
  official_fifa_schedule_pdf: string
}

export type Match = {
  matchNo: number
  date: string
  time: string
  teams: string
  stage: string
  group: string
  stadium: string
  city: string
  utcDateTime: string
  matchSourceUrl: string
  officialFifaSchedulePdf: string
}

export type MatchFilters = {
  query: string
  team: string
  stage: string
  group: string
  city: string
  startDate: string
  endDate: string
}

export type StandingStats = {
  gamesPlayed: { displayName: string; shortName: string; value: string }
  wins: { displayName: string; shortName: string; value: string }
  draws: { displayName: string; shortName: string; value: string }
  losses: { displayName: string; shortName: string; value: string }
  points: { displayName: string; shortName: string; value: string }
  goalsFor: { displayName: string; shortName: string; value: string }
  goalsAgainst: { displayName: string; shortName: string; value: string }
  differential: { displayName: string; shortName: string; value: string }
}

export type StandingCompetitor = {
  competitor: {
    name: string
    shortName: string
    club: string
    ranking: string
    place: number
    location: string
    primaryColor: string
  }
  place: number
  stats: StandingStats
}

export type StandingGroup = {
  name: string
  competitorStandings: StandingCompetitor[]
}

export type StandingsResponse = {
  divisionStandings: StandingGroup[]
}

export type CityLocation = {
  city: string
  label: string
  lat: number
  lng: number
}
