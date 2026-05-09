import * as cheerio from "cheerio";

export interface NetkeibaRaceRecord {
  date: string;
  venue: string;
  raceNo: number;
  raceName: string;
  grade?: string; // GI / GII / GIII / L
  fieldSize: number;
  gate: number;
  umaban: number;
  odds: number;
  popularity: number;
  finish: number | string;
  jockey: string;
  burden: number;
  distance: string; // e.g. 芝2400
  condition: string; // 良/稍/重/不良
  time: string;
  margin: string; // 着差
  corners: string; // 通過順 e.g. 3-3-4-4
  pace: string; // e.g. 35.5-35.2
  finalTime: string; // 上り3F
  bodyWeight: string; // e.g. 492(+4)
  winner: string; // 勝ち馬（または2着馬）
}

export interface NetkeibaHorseEntry {
  horseId: string;
  horseName: string;
  umaban: number;
}

export interface NetkeibaHorseHistory {
  horseId: string;
  horseName: string;
  umaban: number;
  records: NetkeibaRaceRecord[];
}

/**
 * race.netkeiba.com/race/shutuba_past.html?race_id=XXX から出走馬リストを取得する
 */
export function parseHorseEntries(html: string): NetkeibaHorseEntry[] {
  const $ = cheerio.load(html);
  const entries: NetkeibaHorseEntry[] = [];

  $("table.Shutuba_Past5_Table").first().find("tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 4) return;

    const umaban = parseInt($(tds[1]).text().trim(), 10);
    if (isNaN(umaban)) return;

    // td[3] の最初の horse リンクが出走馬本人
    const horseLink = $(tds[3]).find("a[href*='/horse/']").first();
    const href = horseLink.attr("href") ?? "";
    const horseId = href.match(/horse\/(\d+)/)?.[1] ?? "";
    const horseName = horseLink.text().trim();

    if (horseId && horseName) {
      entries.push({ horseId, horseName, umaban });
    }
  });

  return entries;
}

function extractGrade(raceName: string): string | undefined {
  return raceName.match(/\((G[I]+|L)\)/)?.[1];
}

function parseFinish(text: string): number | string {
  const t = text.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return t || "-";
}

/**
 * db.netkeiba.com/horse/result/{id}/ から過去全成績を取得する
 */
export function parseHorseHistory(
  html: string,
  horseId: string,
  horseName: string,
  umaban: number,
): NetkeibaHorseHistory {
  const $ = cheerio.load(html);
  const records: NetkeibaRaceRecord[] = [];

  $("table.db_h_race_results tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 28) return;

    const get = (i: number) => $(tds[i]).text().replace(/\s+/g, " ").trim();
    const getLink = (i: number) => $(tds[i]).find("a").first().text().trim();

    // 日付が yyyy/mm/dd 形式でなければスキップ
    const date = getLink(0) || get(0);
    if (!date.match(/^\d{4}\/\d{2}\/\d{2}$/)) return;

    const raceName = get(4);

    records.push({
      date,
      venue: getLink(1) || get(1),
      raceNo: parseInt(get(3), 10) || 0,
      raceName,
      grade: extractGrade(raceName),
      fieldSize: parseInt(get(6), 10) || 0,
      gate: parseInt(get(7), 10) || 0,
      umaban: parseInt(get(8), 10) || 0,
      odds: parseFloat(get(9)) || 0,
      popularity: parseInt(get(10), 10) || 0,
      finish: parseFinish(get(11)),
      jockey: getLink(12) || get(12),
      burden: parseFloat(get(13)) || 0,
      distance: get(14),
      condition: get(16),
      time: get(18),
      margin: get(19),
      corners: get(25),
      pace: get(26),
      finalTime: get(27),
      bodyWeight: get(28),
      winner: getLink(31) || get(31),
    });
  });

  return { horseId, horseName, umaban, records };
}
