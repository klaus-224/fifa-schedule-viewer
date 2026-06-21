import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const RESULTS_ENDPOINT =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const TEAMS_ENDPOINT =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json";
const SQUADS_ENDPOINT =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.squads.json";

const resultsOutputPath = resolve(process.cwd(), "public/data/worldcup-results.json");
const teamsOutputPath = resolve(process.cwd(), "public/data/worldcup-teams.json");
const squadsOutputPath = resolve(process.cwd(), "public/data/worldcup-squads.json");

const isHiddenUnicodeCodePoint = (codePoint) =>
  (codePoint >= 0x00 && codePoint <= 0x1f) ||
  (codePoint >= 0x7f && codePoint <= 0x9f) ||
  codePoint === 0x061c ||
  codePoint === 0x200e ||
  codePoint === 0x200f ||
  (codePoint >= 0x202a && codePoint <= 0x202e) ||
  (codePoint >= 0x2066 && codePoint <= 0x2069) ||
  (codePoint >= 0xe0000 && codePoint <= 0xe007f);

const cleanString = (value) =>
  Array.from(value)
    .filter((character) => !isHiddenUnicodeCodePoint(character.codePointAt(0)))
    .join("")
    .trim();

const cleanValue = (value) => {
  if (typeof value === "string") return cleanString(value);
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, cleanValue(entryValue)]),
    );
  }
  return value;
};

const sanitizeTeam = (team) => ({
  name: cleanString(team.name ?? ""),
  ...(team.name_normalised
    ? { name_normalised: cleanString(team.name_normalised) }
    : {}),
  fifa_code: cleanString(team.fifa_code ?? ""),
  group: cleanString(team.group ?? ""),
  confed: cleanString(team.confed ?? ""),
});

const sanitizePlayer = (player) => ({
  number: Number(player.number),
  pos: cleanString(player.pos ?? ""),
  name: cleanString(player.name ?? ""),
  club: {
    name: cleanString(player.club?.name ?? ""),
    country: cleanString(player.club?.country ?? ""),
  },
  date_of_birth: cleanString(player.date_of_birth ?? ""),
});

const sanitizeSquad = (squad) => ({
  name: cleanString(squad.name ?? ""),
  fifa_code: cleanString(squad.fifa_code ?? ""),
  group: cleanString(squad.group ?? ""),
  players: Array.isArray(squad.players) ? squad.players.map(sanitizePlayer) : [],
});

const hasCachedSnapshots = async () => {
  try {
    await access(resultsOutputPath);
    await access(teamsOutputPath);
    await access(squadsOutputPath);
    return true;
  } catch {
    return false;
  }
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status}`);
  }
  return response.json();
};

try {
  const [resultsPayload, teamsPayload, squadsPayload] = await Promise.all([
    fetchJson(RESULTS_ENDPOINT),
    fetchJson(TEAMS_ENDPOINT),
    fetchJson(SQUADS_ENDPOINT),
  ]);

  const sanitizedResults = cleanValue(resultsPayload);
  const sanitizedTeams = Array.isArray(teamsPayload)
    ? teamsPayload.map(sanitizeTeam)
    : [];
  const sanitizedSquads = Array.isArray(squadsPayload)
    ? squadsPayload.map(sanitizeSquad)
    : [];

  await mkdir(dirname(resultsOutputPath), { recursive: true });
  await writeFile(
    resultsOutputPath,
    JSON.stringify(sanitizedResults, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    teamsOutputPath,
    JSON.stringify(sanitizedTeams, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    squadsOutputPath,
    JSON.stringify(sanitizedSquads, null, 2) + "\n",
    "utf8",
  );

  console.log(`Synced World Cup results to ${resultsOutputPath}`);
  console.log(`Synced World Cup teams to ${teamsOutputPath}`);
  console.log(`Synced World Cup squads to ${squadsOutputPath}`);
} catch (error) {
  if (await hasCachedSnapshots()) {
    console.warn(
      `World Cup results refresh failed, keeping cached snapshots: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(0);
  }

  throw error;
}
