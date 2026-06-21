import type { StandingGroup, StandingsResponse } from "./types";

// curl 'https://statsapi.sports.bellmedia.ca/v2/standings/soccer/fifa_wc/division?brand=tsn&lang=en' \
//   -H 'sec-ch-ua-platform: "macOS"' \
//   -H 'Referer: https://www.tsn.ca/' \
//   -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' \
//   -H 'Accept: application/json, text/plain, */*' \
//   -H 'sec-ch-ua: "Chromium";v="149", "Not)A;Brand";v="24"' \
//   -H 'x-api-key: e3b3a64e5d298a82efd4e830949959eb539169ef' \
//   -H 'sec-ch-ua-mobile: ?0'
//
//
// curl 'https://cxm-api.fifa.com/fifaplusweb/api/pages/en/tournaments/mens/worldcup/canadamexicousa2026/standings' \
//   -H 'Accept: application/json, text/plain, */*' \
//   -H 'Accept-Language: en-US,en;q=0.9' \
//   -H 'Connection: keep-alive' \
//   -H 'Origin: https://www.fifa.com' \
//   -H 'Sec-Fetch-Dest: empty' \
//   -H 'Sec-Fetch-Mode: cors' \
//   -H 'Sec-Fetch-Site: same-site' \
//   -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' \
//   -H 'sec-ch-ua: "Chromium";v="149", "Not)A;Brand";v="24"' \
//   -H 'sec-ch-ua-mobile: ?0' \
//   -H 'sec-ch-ua-platform: "macOS"'
export const STANDINGS_ENDPOINT =
  "https://api.foxsports.com/bifrost/v1/soccer/league/standings?groupId=12&apikey=jE7yBJVRNAwdDesMgTzTXUUSx1It41Fq";

export const STANDINGS_DATA_PATH = "/data/standings.json";

export const STANDINGS_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "x-api-key": "e3b3a64e5d298a82efd4e830949959eb539169ef",
  Referer: "https://www.tsn.ca/",
};

export const parseStandingsResponse = (payload: unknown): StandingGroup[] => {
  const response = payload as StandingsResponse | undefined;
  return response?.divisionStandings ?? [];
};
