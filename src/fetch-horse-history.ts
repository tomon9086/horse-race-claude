import { fetchAndDecode } from "./lib/fetcher.js";
import {
  parseHorseEntries,
  parseHorseHistory,
} from "./lib/netkeiba-parser.js";
import type { NetkeibaHorseHistory, NetkeibaRaceRecord } from "./lib/netkeiba-parser.js";

function formatRecord(r: NetkeibaRaceRecord): string {
  const finish = typeof r.finish === "number" ? `${r.finish}着` : r.finish;
  return `| ${r.date} | ${r.raceName} | ${r.distance}/${r.condition} | ${finish} | ${r.fieldSize}頭 | ${r.popularity}人気 | ${r.finalTime} | ${r.corners} | ${r.pace} | ${r.margin} | ${r.bodyWeight} |`;
}

function formatHistory(h: NetkeibaHorseHistory): string {
  const lines: string[] = [];
  lines.push(`### ${h.umaban}番 ${h.horseName} (${h.horseId})`);
  lines.push("");
  if (h.records.length === 0) {
    lines.push("（成績データなし）");
  } else {
    lines.push(
      "| 日付 | レース名 | 距離/馬場 | 着順 | 頭数 | 人気 | 上り3F | 通過順 | ペース | 着差 | 馬体重 |",
    );
    lines.push(
      "|------|---------|----------|------|------|------|--------|--------|--------|------|--------|",
    );
    for (const r of h.records) {
      lines.push(formatRecord(r));
    }
  }
  return lines.join("\n");
}

async function main() {
  const raceId = process.argv[2];
  if (!raceId) {
    console.error("Usage: npx tsx src/fetch-horse-history.ts <netkeiba_race_id>");
    console.error("Example: npx tsx src/fetch-horse-history.ts 202608030511");
    process.exit(1);
  }

  const shutubaUrl = `https://race.netkeiba.com/race/shutuba_past.html?race_id=${raceId}`;
  process.stderr.write(`Fetching entry list: ${shutubaUrl}\n`);
  const shutubaHtml = await fetchAndDecode(shutubaUrl, "euc-jp");
  const entries = parseHorseEntries(shutubaHtml);

  if (entries.length === 0) {
    console.error("No horse entries found. Check the race_id.");
    process.exit(1);
  }
  process.stderr.write(`Found ${entries.length} horses\n`);

  const histories: NetkeibaHorseHistory[] = [];

  for (const entry of entries) {
    const url = `https://db.netkeiba.com/horse/result/${entry.horseId}/`;
    process.stderr.write(`Fetching ${entry.umaban}番 ${entry.horseName}...\n`);
    try {
      const html = await fetchAndDecode(url, "euc-jp");
      const history = parseHorseHistory(html, entry.horseId, entry.horseName, entry.umaban);
      histories.push(history);
    } catch (e) {
      process.stderr.write(`  Error: ${e}\n`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  histories.sort((a, b) => a.umaban - b.umaban);

  console.log(`# netkeibaデータ: race_id=${raceId}`);
  console.log(`取得馬数: ${histories.length}頭`);
  console.log("");
  for (const h of histories) {
    console.log(formatHistory(h));
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
