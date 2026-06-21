const TEAM_FLAGS: Record<string, string> = {
  Algeria: '🇩🇿',
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  Austria: '🇦🇹',
  Belgium: '🇧🇪',
  Bosnia: '🇧🇦',
  Brazil: '🇧🇷',
  'Bosnia & Herzegovina': '🇧🇦',
  'Cape Verde': '🇨🇻',
  Canada: '🇨🇦',
  Chile: '🇨🇱',
  Colombia: '🇨🇴',
  Croatia: '🇭🇷',
  'Curaçao': '🇨🇼',
  Czechia: '🇨🇿',
  'DR Congo': '🇨🇩',
  Denmark: '🇩🇰',
  Ecuador: '🇪🇨',
  Egypt: '🇪🇬',
  England: '🏴',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Ghana: '🇬🇭',
  Haiti: '🇭🇹',
  Iran: '🇮🇷',
  Iraq: '🇮🇶',
  Japan: '🇯🇵',
  Jordan: '🇯🇴',
  Mexico: '🇲🇽',
  Morocco: '🇲🇦',
  Netherlands: '🇳🇱',
  New: '',
  'New Zealand': '🇳🇿',
  Norway: '🇳🇴',
  Panama: '🇵🇦',
  Paraguay: '🇵🇾',
  Portugal: '🇵🇹',
  Qatar: '🇶🇦',
  Scotland: '🏴',
  Senegal: '🇸🇳',
  'Saudi Arabia': '🇸🇦',
  South: '',
  'South Africa': '🇿🇦',
  Spain: '🇪🇸',
  Sweden: '🇸🇪',
  Switzerland: '🇨🇭',
  'Türkiye': '🇹🇷',
  Tunisia: '🇹🇳',
  'United States': '🇺🇸',
  Uruguay: '🇺🇾',
  Uzbekistan: '🇺🇿',
  'Côte d’Ivoire': '🇨🇮',
}

const formatSide = (raw: string) => {
  const team = raw.trim()
  const flag = TEAM_FLAGS[team]
  return flag ? `${team} ${flag}` : team
}

export const getTeamFlag = (team: string) => TEAM_FLAGS[team.trim()] ?? ''

export const formatTeamWithFlag = (team: string) => formatSide(team)

export const formatMatchTitle = (teams: string) => {
  const parts = teams.split(/\s+vs\.?\s+/i)
  if (parts.length !== 2) {
    return teams
  }

  return `${formatSide(parts[0])} vs. ${formatSide(parts[1])}`
}
