import type { StandingGroup, StandingsResponse } from "./types";

export const STANDINGS_DATA_PATH = "/data/standings.json";

export const parseStandingsResponse = (payload: unknown): StandingGroup[] => {
  const response = payload as StandingsResponse | undefined;
  return response?.divisionStandings ?? [];
};
