import { fetchAndDecode } from "./lib/fetcher.js";
import {
  parseNetkeibaShutuba,
  parseHorseDetail,
  parseHorsePedigree,
  parseHorseHistory,
  buildRaceInfo,
} from "./lib/netkeiba-parser.js";
import type { NetkeibaRaceRecord } from "./lib/netkeiba-parser.js";
import type { RaceInfo, HorseEntry, PastRace } from "./lib/types.js";

function formatPastRace(r: PastRace): string {
  const grade = r.grade ? ` (${r.grade})` : "";
  return `${r.date} ${r.venue} ${r.raceName}${grade} ${r.finish}着/${r.fieldSize}頭 ${r.popularity}人気 ${r.distance} ${r.time} ${r.condition}`;
}

function formatEntry(e: HorseEntry): string {
  const lines: string[] = [];
  lines.push(`### ${e.wakuban}枠 ${e.umaban}番 ${e.horseName}`);
  lines.push(`- ${e.age} / ${e.weight}kg / 騎手: ${e.jockey}`);
  lines.push(`- 戦績: ${e.record}`);
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
  const raceId = process.argv[2];
  if (!raceId) {
    console.error("Usage: npx tsx src/fetch-netkeiba-entries.ts <race_id>");
    console.error("Example: npx tsx src/fetch-netkeiba-entries.ts 202605021211");
    process.exit(1);
  }

  if (!/^\d{12}$/.test(raceId)) {
    console.error("race_id は12桁の数字で指定してください (例: 202605021211)");
    process.exit(1);
  }

  const shutubaUrl = `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;
  process.stderr.write(`Fetching shutuba: ${shutubaUrl}\n`);
  const shutubaHtml = await fetchAndDecode(shutubaUrl, "euc-jp");
  const shutuba = parseNetkeibaShutuba(shutubaHtml, raceId);

  if (shutuba.entries.length === 0) {
    console.error("出走馬が見つかりませんでした。race_id を確認してください。");
    process.exit(1);
  }
  process.stderr.write(`出走頭数: ${shutuba.entries.length}頭\n`);

  const horseDetails = new Map<string, ReturnType<typeof parseHorseDetail>>();
  const horsePedigrees = new Map<string, ReturnType<typeof parseHorsePedigree>>();
  const horseHistories = new Map<string, NetkeibaRaceRecord[]>();

  for (const entry of shutuba.entries) {
    const { horseId, horseName, umaban } = entry;
    process.stderr.write(`[${umaban}] ${horseName} (${horseId}) を取得中...\n`);

    try {
      const detailUrl = `https://db.netkeiba.com/horse/${horseId}/`;
      const detailHtml = await fetchAndDecode(detailUrl, "euc-jp");
      horseDetails.set(horseId, parseHorseDetail(detailHtml));
      await new Promise(r => setTimeout(r, 200));

      const pedUrl = `https://db.netkeiba.com/horse/ped/${horseId}/`;
      const pedHtml = await fetchAndDecode(pedUrl, "euc-jp");
      horsePedigrees.set(horseId, parseHorsePedigree(pedHtml));
      await new Promise(r => setTimeout(r, 200));

      const histUrl = `https://db.netkeiba.com/horse/result/${horseId}/`;
      const histHtml = await fetchAndDecode(histUrl, "euc-jp");
      const hist = parseHorseHistory(histHtml, horseId, horseName, umaban);
      horseHistories.set(horseId, hist.records);
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      process.stderr.write(`  Error: ${e}\n`);
    }
  }

  const raceInfo = buildRaceInfo(shutuba, horseDetails, horsePedigrees, horseHistories);
  console.log(formatRaceInfo(raceInfo));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
