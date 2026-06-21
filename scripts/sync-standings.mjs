import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import process from "node:process";

export const STANDINGS_ENDPOINT =
  "https://statsapi.sports.bellmedia.ca/v2/standings/soccer/fifa_wc/division?brand=tsn&lang=en";

const STANDINGS_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "x-api-key": "e3b3a64e5d298a82efd4e830949959eb539169ef",
  Referer: "https://www.tsn.ca/",
};

const outputPath = resolve(process.cwd(), "public/data/standings.json");
const hasCachedSnapshot = async () => {
  try {
    await access(outputPath);
    return true;
  } catch {
    return false;
  }
};

try {
  const response = await fetch(STANDINGS_ENDPOINT, {
    headers: STANDINGS_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Standings sync failed: ${response.status}`);
  }

  const payload = await response.json();

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`Synced standings to ${outputPath}`);
} catch (error) {
  if (await hasCachedSnapshot()) {
    console.warn(
      `Standings refresh failed, keeping cached snapshot at ${outputPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(0);
  }

  throw error;
}
