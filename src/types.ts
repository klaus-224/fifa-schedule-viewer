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
  stage: string
  group: string
  city: string
  startDate: string
  endDate: string
}

export type CityLocation = {
  city: string
  label: string
  lat: number
  lng: number
}
