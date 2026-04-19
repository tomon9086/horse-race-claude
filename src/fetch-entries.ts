import { fetchAndDecode } from "./lib/fetcher.js";
import { parseJraEntries } from "./lib/jra-parser.js";
import type { RaceInfo, HorseEntry, PastRace } from "./lib/types.js";

function formatPastRace(r: PastRace): string {
  const grade = r.grade ? ` (${r.grade})` : "";
  return `${r.date} ${r.venue} ${r.raceName}${grade} ${r.finish}着/${r.fieldSize}頭 ${r.popularity}人気 ${r.distance} ${r.time} ${r.condition}`;
}

function formatEntry(e: HorseEntry): string {
  const lines: string[] = [];
  lines.push(`### ${e.wakuban}枠 ${e.umaban}番 ${e.horseName}`);
  lines.push(`- ${e.age} / ${e.weight}kg / 騎手: ${e.jockey}`);
  lines.push(`- 戦績: ${e.record}${e.preRating ? ` / レーティング: ${e.preRating}` : ""}`);
  lines.push(`- 血統: ${e.pedigree.sire} × ${e.pedigree.dam} (母父: ${e.pedigree.damSire})`);
  lines.push(`- 調教師: ${e.trainer} / 馬主: ${e.owner}`);

  if (e.pastRaces.length > 0) {
    lines.push(`- 近走:`);
    for (const r of e.pastRaces) {
      lines.push(`  - ${formatPastRace(r)}`);
    }
  }

  return lines.join("\n");
}

function formatRaceInfo(info: RaceInfo): string {
  const lines: string[] = [];
  lines.push(`# ${info.raceName}`);
  lines.push(`${info.raceDetail}`);
  lines.push(`出走頭数: ${info.entries.length}頭`);
  lines.push("");

  for (const entry of info.entries) {
    lines.push(formatEntry(entry));
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx src/fetch-entries.ts <JRA_URL>");
    process.exit(1);
  }

  const html = await fetchAndDecode(url, "shift_jis");
  const raceInfo = parseJraEntries(html, url);
  console.log(formatRaceInfo(raceInfo));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
