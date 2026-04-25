import { fetchAndDecode } from "./lib/fetcher.js";
import { parseJraResult } from "./lib/jra-result-parser.js";
import type { RaceResult, RaceResultEntry, Payout } from "./lib/types.js";

function formatEntry(e: RaceResultEntry): string {
  const place = typeof e.place === "number" ? `${e.place}着` : e.place;
  const diff = e.bodyWeightDiff >= 0 ? `+${e.bodyWeightDiff}` : `${e.bodyWeightDiff}`;
  const corners = e.corners.join("-");
  return `| ${place} | ${e.wakuban} | ${e.umaban} | ${e.horseName} | ${e.age} | ${e.burden}kg | ${e.jockey} | ${e.time} | ${e.margin} | ${corners} | ${e.finalTime} | ${e.bodyWeight}(${diff}) | ${e.trainer} | ${e.popularity}人気 |`;
}

function formatPayout(p: Payout): string {
  return p.combinations.map(c =>
    `| ${p.type} | ${c.numbers} | ${c.amount.toLocaleString()}円 | ${c.popularity}番人気 |`
  ).join("\n");
}

function formatRaceResult(r: RaceResult): string {
  const lines: string[] = [];
  lines.push(`# ${r.raceName}`);
  lines.push(`${r.raceDetail}`);
  lines.push("");

  lines.push("## 着順");
  lines.push("| 着順 | 枠 | 馬番 | 馬名 | 性齢 | 負担重量 | 騎手 | タイム | 着差 | コーナー通過順 | 上り3F | 馬体重(増減) | 調教師 | 人気 |");
  lines.push("|------|-----|------|------|------|---------|------|--------|------|--------------|-------|------------|------|------|");
  for (const e of r.results) {
    lines.push(formatEntry(e));
  }
  lines.push("");

  if (r.payouts.length > 0) {
    lines.push("## 払戻金");
    lines.push("| 券種 | 組合せ | 払戻金 | 人気 |");
    lines.push("|------|--------|--------|------|");
    for (const p of r.payouts) {
      lines.push(formatPayout(p));
    }
    lines.push("");
  }

  if (r.furlongTimes) {
    lines.push("## タイム");
    lines.push(`- ハロンタイム: ${r.furlongTimes}`);
    lines.push(`- 上り: ${r.finalTimes}`);
    lines.push("");
  }

  if (r.cornerOrder.length > 0) {
    lines.push("## コーナー通過順位");
    for (const c of r.cornerOrder) {
      lines.push(`- ${c.corner}: ${c.order}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx src/fetch-results.ts <JRA_URL>");
    process.exit(1);
  }

  const html = await fetchAndDecode(url, "shift_jis");
  const result = parseJraResult(html, url);
  console.log(formatRaceResult(result));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
