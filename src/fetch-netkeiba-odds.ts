/**
 * netkeibaのオッズAPIから単勝・複勝・馬連・ワイドを取得して出力する。
 * Usage: npx tsx src/fetch-netkeiba-odds.ts <race_id>
 * Example: npx tsx src/fetch-netkeiba-odds.ts 202605030111
 */

interface OddsEntry {
  umaban: number;
  odds: number;
  popularity: number;
}

interface FukushoEntry {
  umaban: number;
  lo: number;
  hi: number;
  popularity: number;
}

interface PairEntry {
  num1: number;
  num2: number;
  odds: number;
}

interface WideEntry {
  num1: number;
  num2: number;
  lo: number;
  hi: number;
}

interface OddsData {
  tansho: OddsEntry[];
  fukusho: FukushoEntry[];
  umaren: PairEntry[];
  wide: WideEntry[];
}

async function fetchOddsApi(raceId: string, type: number): Promise<unknown> {
  const url = `https://race.netkeiba.com/api/api_get_jra_odds.html?race_id=${raceId}&type=${type}&action=update`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://race.netkeiba.com/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

export async function fetchAllOdds(raceId: string): Promise<OddsData> {
  const [tanJson, fukuJson, umarenJson, wideJson] = await Promise.all([
    fetchOddsApi(raceId, 1),
    fetchOddsApi(raceId, 2),
    fetchOddsApi(raceId, 4),
    fetchOddsApi(raceId, 5),
  ]) as [any, any, any, any];

  const tansho: OddsEntry[] = Object.entries(tanJson.data.odds["1"] as Record<string, string[]>)
    .map(([num, arr]) => ({
      umaban: parseInt(num),
      odds: parseFloat(arr[0]),
      popularity: parseInt(arr[2]),
    }))
    .sort((a, b) => a.popularity - b.popularity);

  const fukusho: FukushoEntry[] = Object.entries(fukuJson.data.odds["2"] as Record<string, string[]>)
    .map(([num, arr]) => ({
      umaban: parseInt(num),
      lo: parseFloat(arr[0]),
      hi: parseFloat(arr[1]),
      popularity: parseInt(arr[2]),
    }))
    .sort((a, b) => a.popularity - b.popularity);

  // 馬連・ワイドのキーは「0112」のように2桁+2桁を連結したフラット形式
  const parsePairKey = (key: string): [number, number] | null => {
    if (key.length !== 4) return null;
    const a = parseInt(key.slice(0, 2));
    const b = parseInt(key.slice(2, 4));
    return isNaN(a) || isNaN(b) ? null : [a, b];
  };

  const umaren: PairEntry[] = [];
  const umarenData = umarenJson.data.odds["4"] as Record<string, string[]>;
  if (umarenData) {
    for (const [key, arr] of Object.entries(umarenData)) {
      const pair = parsePairKey(key);
      const odds = parseFloat(arr[0]);
      if (pair && !isNaN(odds)) {
        umaren.push({ num1: pair[0], num2: pair[1], odds });
      }
    }
    umaren.sort((a, b) => a.odds - b.odds);
  }

  const wide: WideEntry[] = [];
  const wideData = wideJson.data.odds["5"] as Record<string, string[]>;
  if (wideData) {
    for (const [key, arr] of Object.entries(wideData)) {
      const pair = parsePairKey(key);
      const lo = parseFloat(arr[0]);
      const hi = parseFloat(arr[1]);
      if (pair && !isNaN(lo)) {
        wide.push({ num1: pair[0], num2: pair[1], lo, hi });
      }
    }
    wide.sort((a, b) => a.lo - b.lo);
  }

  return { tansho, fukusho, umaren, wide };
}

function formatOdds(data: OddsData): string {
  const lines: string[] = [];

  lines.push("## 単勝オッズ（人気順）");
  lines.push("| 人気 | 馬番 | 単勝 |");
  lines.push("|------|------|------|");
  for (const r of data.tansho) {
    lines.push(`| ${r.popularity} | ${r.umaban} | ${r.odds} |`);
  }

  lines.push("");
  lines.push("## 複勝オッズ（人気順）");
  lines.push("| 人気 | 馬番 | 複勝 |");
  lines.push("|------|------|------|");
  for (const r of data.fukusho) {
    lines.push(`| ${r.popularity} | ${r.umaban} | ${r.lo}〜${r.hi} |`);
  }

  if (data.umaren.length > 0) {
    lines.push("");
    lines.push("## 馬連オッズ（安い順 TOP30）");
    lines.push("| 馬番 | 馬連オッズ |");
    lines.push("|------|-----------|");
    for (const r of data.umaren.slice(0, 30)) {
      lines.push(`| ${r.num1}-${r.num2} | ${r.odds} |`);
    }
  }

  if (data.wide.length > 0) {
    lines.push("");
    lines.push("## ワイドオッズ（安い順 TOP30）");
    lines.push("| 馬番 | ワイドオッズ |");
    lines.push("|------|------------|");
    for (const r of data.wide.slice(0, 30)) {
      lines.push(`| ${r.num1}-${r.num2} | ${r.lo}〜${r.hi} |`);
    }
  }

  return lines.join("\n");
}

async function main() {
  const raceId = process.argv[2];
  if (!raceId) {
    console.error("Usage: npx tsx src/fetch-netkeiba-odds.ts <race_id>");
    console.error("Example: npx tsx src/fetch-netkeiba-odds.ts 202605030111");
    process.exit(1);
  }

  if (!/^\d{12}$/.test(raceId)) {
    console.error("race_id は12桁の数字で指定してください (例: 202605030111)");
    process.exit(1);
  }

  const data = await fetchAllOdds(raceId);
  console.log(formatOdds(data));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
