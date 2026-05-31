import * as cheerio from "cheerio";
import type { RaceInfo, HorseEntry, PastRace, RaceResult, RaceResultEntry, Payout } from "./types.js";

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

// ─── race.netkeiba.com/race/shutuba.html?race_id=XXX ───────────────────────

export interface NetkeibaShutubaPrelimEntry {
  horseId: string;
  horseName: string;
  wakuban: number;
  umaban: number;
  age: string;      // 性齢 e.g. "牡3"
  burden: number;   // 斤量
  jockey: string;
  trainer: string;
  bodyWeight: number;
  bodyWeightDiff: number;
}

export interface NetkeibaShutuba {
  raceName: string;
  raceDetail: string;
  url: string;
  entries: NetkeibaShutubaPrelimEntry[];
}

export function parseNetkeibaShutuba(html: string, raceId: string): NetkeibaShutuba {
  const $ = cheerio.load(html);
  const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;

  const raceName = $("h1.RaceName").first().contents().filter((_, n) => n.type === "text").text().trim();
  const raceData01 = $(".RaceData01").text().replace(/\s+/g, " ").trim();
  const raceData02 = $(".RaceData02").text().replace(/\s+/g, " ").trim();
  const raceDetail = `${raceData01} / ${raceData02}`;

  const entries: NetkeibaShutubaPrelimEntry[] = [];

  $("tr.HorseList").each((_, tr) => {
    const row = $(tr);

    // 枠番: class like "Waku1 Txt_C"
    const wakuClass = row.find("td[class*='Waku']").first().attr("class") ?? "";
    const wakuMatch = wakuClass.match(/Waku(\d)/);
    const wakuban = wakuMatch ? parseInt(wakuMatch[1], 10) : 0;

    // 馬番: class like "Umaban1 Txt_C"
    const umabanClass = row.find("td[class*='Umaban']").first().attr("class") ?? "";
    const umabanMatch = umabanClass.match(/Umaban(\d+)/);
    const umaban = umabanMatch ? parseInt(umabanMatch[1], 10) : 0;
    if (!umaban) return;

    // 馬名・馬ID
    const horseLink = row.find(".HorseName a").first();
    const horseName = horseLink.attr("title") ?? horseLink.text().trim();
    const horseHref = horseLink.attr("href") ?? "";
    const horseId = horseHref.match(/horse\/(\d+)/)?.[1] ?? "";

    // 性齢
    const age = row.find("td.Barei").text().trim();

    // 斤量
    const burden = parseFloat(row.find("td.Dredging").text().trim()) || 0;

    // 騎手
    const jockey = row.find("td.Jockey a").first().text().trim();

    // 調教師
    const trainer = row.find("td.Trainer a").first().text().trim();

    // 馬体重
    const weightTd = row.find("td.Weight");
    const weightDiffText = weightTd.find("small").text().replace(/[()（）]/g, "").trim();
    const bodyWeightDiff = parseInt(weightDiffText, 10) || 0;
    const weightClone = weightTd.clone();
    weightClone.find("small").remove();
    const bodyWeight = parseInt(weightClone.text().trim(), 10) || 0;

    entries.push({ horseId, horseName, wakuban, umaban, age, burden, jockey, trainer, bodyWeight, bodyWeightDiff });
  });

  return { raceName, raceDetail, url, entries };
}

// ─── db.netkeiba.com/horse/{id}/ ───────────────────────────────────────────

export interface NetkeibaHorseDetail {
  owner: string;
  breeder: string;
  record: string;
}

export function parseHorseDetail(html: string): NetkeibaHorseDetail {
  const $ = cheerio.load(html);
  let owner = "";
  let breeder = "";
  let record = "";

  $("table.db_prof_table tr").each((_, tr) => {
    const th = $(tr).find("th").text().trim();
    const td = $(tr).find("td");
    if (th === "馬主") owner = td.find("a").text().trim() || td.text().trim();
    if (th === "生産者") breeder = td.find("a").text().trim() || td.text().trim();
    if (th === "通算成績") {
      record = td.clone().find("a").remove().end().text().trim() + " " + td.find("a").text().trim();
      record = record.trim();
    }
  });

  return { owner, breeder, record };
}

// ─── db.netkeiba.com/horse/ped/{id}/ ───────────────────────────────────────

export function parseHorsePedigree(html: string): { sire: string; dam: string; damSire: string } {
  const $ = cheerio.load(html);

  const allCells: Array<{ rowspan: number; cls: string; name: string }> = [];
  $("table.blood_table td[rowspan]").each((_, td) => {
    const el = $(td);
    const rowspan = parseInt(el.attr("rowspan") ?? "0", 10);
    const cls = el.attr("class") ?? "";
    const name = el.find("a").first().contents().first().text().trim();
    if (name) allCells.push({ rowspan, cls, name });
  });

  // 父 = first b_ml with highest rowspan
  const sireCell = allCells.find(c => c.cls.includes("b_ml") && c.rowspan >= 8);
  // 母 = first b_fml with same high rowspan
  const damCell = allCells.find(c => c.cls.includes("b_fml") && c.rowspan >= 8);
  // 母父 = first b_ml after dam in allCells with rowspan >= 4
  const damIdx = damCell ? allCells.indexOf(damCell) : -1;
  const damSireCell = damIdx >= 0
    ? allCells.slice(damIdx + 1).find(c => c.cls.includes("b_ml") && c.rowspan >= 4)
    : undefined;

  return {
    sire: sireCell?.name ?? "",
    dam: damCell?.name ?? "",
    damSire: damSireCell?.name ?? "",
  };
}

// ─── race.netkeiba.com/race/result.html?race_id=XXX ────────────────────────

export function parseNetkeibaResult(html: string, raceId: string): RaceResult {
  const $ = cheerio.load(html);
  const url = `https://race.netkeiba.com/race/result.html?race_id=${raceId}`;

  const raceName = $("h1.RaceName").first().contents().filter((_, n) => n.type === "text").text().trim();
  const raceData01 = $(".RaceData01").text().replace(/\s+/g, " ").trim();
  const raceData02 = $(".RaceData02").text().replace(/\s+/g, " ").trim();
  const raceDetail = `${raceData01} / ${raceData02}`;

  // 着順結果
  const results: RaceResultEntry[] = [];
  $("table.RaceTable01 tr.HorseList").each((_, tr) => {
    const row = $(tr);

    const placeText = row.find("td.Result_Num .Rank").text().trim();
    const place = /^\d+$/.test(placeText) ? parseInt(placeText, 10) : placeText;

    // 枠番: class like "Num Waku3"
    const wakuNumTd = row.find("td[class*='Waku']").first();
    const wakuCls = wakuNumTd.attr("class") ?? "";
    const wakuMatch = wakuCls.match(/Waku(\d)/);
    const wakuban = wakuMatch ? parseInt(wakuMatch[1], 10) : 0;

    const umaban = parseInt(row.find("td.Num.Txt_C div").text().trim(), 10) || 0;
    if (!umaban) return;

    const horseName = row.find("td.Horse_Info .HorseNameSpan").text().trim();
    const age = row.find("td.Horse_Info.Txt_C .Lgt_Txt").text().trim();
    const burden = parseFloat(row.find("td.Jockey_Info .JockeyWeight").text().trim()) || 0;
    const jockey = row.find("td.Jockey .JockeyNameSpan").text().trim();

    const timeCells = row.find("td.Time .RaceTime");
    const time = $(timeCells[0]).text().trim();
    const margin = $(timeCells[1]).text().trim();

    const popularity = parseInt(row.find("td.Odds.BgYellow .OddsPeople").text().trim(), 10) || 0;
    const finalTime = row.find("td.Time.BgOrange").text().trim();
    const cornerStr = row.find("td.PassageRate").text().trim();
    const corners = cornerStr ? cornerStr.split("-") : [];

    const trainer = row.find("td.Trainer .TrainerNameSpan").text().trim();

    const weightTd = row.find("td.Weight");
    const weightDiffText = weightTd.find("small").text().replace(/[()（）]/g, "").trim();
    const bodyWeightDiff = parseInt(weightDiffText, 10) || 0;
    const weightClone = weightTd.clone();
    weightClone.find("small").remove();
    const bodyWeight = parseInt(weightClone.text().trim(), 10) || 0;

    results.push({ place, wakuban, umaban, horseName, age, burden, jockey, time, margin, corners, finalTime, bodyWeight, bodyWeightDiff, trainer, popularity });
  });

  // 払戻金
  const payouts: Payout[] = [];
  const typeMap: Record<string, string> = {
    Tansho: "単勝", Fukusho: "複勝", Wakuren: "枠連", Umaren: "馬連",
    Wide: "ワイド", Umatan: "馬単", Fuku3: "3連複", Tan3: "3連単",
  };

  $("table.Payout_Detail_Table tr").each((_, tr) => {
    const row = $(tr);
    const cls = row.attr("class") ?? "";
    const type = typeMap[cls];
    if (!type) return;

    const resultTd = row.find("td.Result");
    const payoutTd = row.find("td.Payout");
    const ninkiTd = row.find("td.Ninki");

    // Get number combinations (single td.Result structure varies)
    const combinations: Payout["combinations"] = [];
    const payoutSpans = payoutTd.find("span");
    const ninkiSpans = ninkiTd.find("span");

    if (cls === "Fukusho" || cls === "Wide") {
      // Multiple results: parse divs with spans
      const divs = resultTd.find("div");
      const payoutTexts = payoutTd.text().split(/\n/).map(s => s.trim()).filter(Boolean);
      const ninkiTexts = ninkiTd.text().split(/\n/).map(s => s.trim()).filter(Boolean);

      let groupNumbers: string[] = [];
      divs.each((i, div) => {
        const num = $(div).find("span").text().trim();
        if (num) {
          groupNumbers.push(num);
        }
        // A group ends after 3 divs (number, empty, empty pattern) or after 2 in wakuren
        if (groupNumbers.length === 1 && cls === "Fukusho") {
          // Single number per combination
          const payout = payoutTexts.shift() ?? "";
          const ninki = ninkiTexts.shift() ?? "";
          const amount = parseInt(payout.replace(/[,円]/g, ""), 10) || 0;
          const popularity = parseInt(ninki.replace(/人気/g, ""), 10) || 0;
          if (amount) combinations.push({ numbers: groupNumbers[0], amount, popularity });
          groupNumbers = [];
        }
      });
      // If not handled above (Wide = 2 numbers)
      if (combinations.length === 0) {
        // fallback: use ul/li structure
        const uls = resultTd.find("ul");
        uls.each((i, ul) => {
          const nums = $(ul).find("li span").map((_, s) => $(s).text().trim()).get().filter(Boolean);
          const combo = nums.join("-");
          const payout = payoutTexts[i] ?? "";
          const ninki = ninkiTexts[i] ?? "";
          const amount = parseInt(payout.replace(/[,円]/g, ""), 10) || 0;
          const popularity = parseInt(ninki.replace(/人気/g, ""), 10) || 0;
          if (combo && amount) combinations.push({ numbers: combo, amount, popularity });
        });
      }
    } else if (resultTd.find("ul").length > 0) {
      // ul/li structure
      const uls = resultTd.find("ul");
      const payoutTexts = payoutTd.text().split(/\n/).map(s => s.trim()).filter(Boolean);
      const ninkiTexts = ninkiTd.text().split(/\n/).map(s => s.trim()).filter(Boolean);
      uls.each((i, ul) => {
        const nums = $(ul).find("li span").map((_, s) => $(s).text().trim()).get().filter(Boolean);
        const combo = nums.join("-");
        const payout = payoutTexts[i] ?? "";
        const ninki = ninkiTexts[i] ?? "";
        const amount = parseInt(payout.replace(/[,円]/g, ""), 10) || 0;
        const popularity = parseInt(ninki.replace(/人気/g, ""), 10) || 0;
        if (combo && amount) combinations.push({ numbers: combo, amount, popularity });
      });
    } else {
      // div structure (単勝/複勝)
      const divGroups = resultTd.find("div");
      const payoutTexts = payoutTd.text().split(/\n/).map(s => s.trim()).filter(/^\d/.test.bind(/^\d/));
      const ninkiTexts = ninkiTd.text().split(/\n/).map(s => s.trim()).filter(/^\d/.test.bind(/^\d/));
      divGroups.each((i, div) => {
        const num = $(div).find("span").text().trim();
        if (!num) return;
        const payout = payoutTexts[i] ?? "";
        const ninki = ninkiTexts[i] ?? "";
        const amount = parseInt(payout.replace(/[,円]/g, ""), 10) || 0;
        const popularity = parseInt(ninki.replace(/人気/g, ""), 10) || 0;
        if (amount) combinations.push({ numbers: num, amount, popularity });
      });
    }

    if (combinations.length > 0) payouts.push({ type, combinations });
  });

  // コーナー通過順位
  const cornerOrder: RaceResult["cornerOrder"] = [];
  $("table.Corner_Num tr").each((_, tr) => {
    const row = $(tr);
    const corner = row.find("th").text().trim();
    const order = row.find("td").text().replace(/\s+/g, "").trim();
    if (corner && order) cornerOrder.push({ corner, order });
  });

  // ラップタイム (netkeiba result page may not have this in same format)
  let furlongTimes = "";
  let finalTimes = "";
  $("table.race_lap_summary tr").each((_, tr) => {
    const label = $(tr).find("th").text().trim();
    const val = $(tr).find("td").map((_, td) => $(td).text().trim()).get().join(" ");
    if (label.includes("ラップ")) furlongTimes = val;
    if (label.includes("上り")) finalTimes = val;
  });

  return { raceName, raceDetail, url, results, payouts, furlongTimes, finalTimes, cornerOrder, fetchedAt: new Date().toISOString() };
}

// ─── Convert Netkeiba history to PastRace[] ────────────────────────────────

export function toPastRaces(records: NetkeibaRaceRecord[]): PastRace[] {
  return records.slice(0, 10).map(r => ({
    date: r.date,
    venue: r.venue,
    raceName: r.raceName,
    grade: r.grade,
    finish: r.finish,
    fieldSize: r.fieldSize,
    gate: r.gate,
    popularity: r.popularity,
    jockey: r.jockey,
    weight: r.burden,
    distance: r.distance,
    time: r.time,
    condition: r.condition,
  }));
}

// ─── Build full RaceInfo from shutuba + horse details ─────────────────────

export function buildRaceInfo(
  shutuba: NetkeibaShutuba,
  horseDetails: Map<string, NetkeibaHorseDetail>,
  horsePedigrees: Map<string, { sire: string; dam: string; damSire: string }>,
  horseHistories: Map<string, NetkeibaRaceRecord[]>,
): RaceInfo {
  const entries: HorseEntry[] = shutuba.entries.map(e => {
    const detail = horseDetails.get(e.horseId) ?? { owner: "", breeder: "", record: "" };
    const pedigree = horsePedigrees.get(e.horseId) ?? { sire: "", dam: "", damSire: "" };
    const records = horseHistories.get(e.horseId) ?? [];
    const pastRaces: PastRace[] = toPastRaces(records);
    return {
      wakuban: e.wakuban,
      umaban: e.umaban,
      horseName: e.horseName,
      age: e.age,
      weight: e.bodyWeight,
      jockey: e.jockey,
      trainer: e.trainer,
      owner: detail.owner,
      breeder: detail.breeder,
      pedigree,
      record: detail.record,
      pastRaces,
    };
  });

  return {
    raceName: shutuba.raceName,
    raceDetail: shutuba.raceDetail,
    url: shutuba.url,
    entries,
    fetchedAt: new Date().toISOString(),
  };
}
