import * as cheerio from "cheerio";
import type { RaceResult, RaceResultEntry, Payout } from "./types.js";

export function parseJraResult(html: string, url: string): RaceResult {
  const $ = cheerio.load(html);

  // レース名・詳細
  const caption = $("table.basic caption");
  const raceName = caption.find(".race_name").first().contents().first().text().trim();
  const dateText = caption.find(".cell.date").text().trim();
  const courseText = caption.find(".cell.course").text().trim()
    .replace(/コース：/g, "").replace(/メートル/g, "m");
  const weatherText = caption.find(".cell.baba").text().replace(/\s+/g, " ").trim();
  const raceDetail = `${dateText} / ${courseText} / ${weatherText}`;

  // 着順結果テーブル
  const results: RaceResultEntry[] = [];
  $("table.basic tbody tr").each((_, row) => {
    const tr = $(row);

    const placeText = tr.find("td.place").text().trim();
    const place = /^\d+$/.test(placeText) ? parseInt(placeText, 10) : placeText;

    const wakuAlt = tr.find("td.waku img").attr("alt") ?? "";
    const wakuMatch = wakuAlt.match(/枠(\d)/);
    const wakuban = wakuMatch ? parseInt(wakuMatch[1], 10) : 0;

    const umaban = parseInt(tr.find("td.num").text().trim(), 10);
    if (isNaN(umaban)) return;

    const horseName = tr.find("td.horse").text().trim();
    const age = tr.find("td.age").text().trim();
    const burden = parseFloat(tr.find("td.weight").text().trim()) || 0;
    const jockey = tr.find("td.jockey").text().trim();
    const time = tr.find("td.time").text().trim();
    const margin = tr.find("td.margin").text().trim();
    const finalTime = tr.find("td.f_time").text().trim();
    const trainer = tr.find("td.trainer").text().trim();
    const popularity = parseInt(tr.find("td.pop").text().trim(), 10) || 0;

    const hwText = tr.find("td.h_weight").clone();
    const hwDiffText = hwText.find("span").text().replace(/[()（）]/g, "").trim();
    const bodyWeightDiff = parseInt(hwDiffText, 10) || 0;
    hwText.find("span").remove();
    const bodyWeight = parseInt(hwText.text().trim(), 10) || 0;

    const corners: string[] = [];
    tr.find("td.corner .corner_list li").each((_, li) => {
      corners.push($(li).text().trim());
    });

    results.push({
      place,
      wakuban,
      umaban,
      horseName,
      age,
      burden,
      jockey,
      time,
      margin,
      corners,
      finalTime,
      bodyWeight,
      bodyWeightDiff,
      trainer,
      popularity,
    });
  });

  // 払戻金
  const payouts: Payout[] = [];
  $(".refund_area li").each((_, li) => {
    const el = $(li);
    const type = el.find("dt").text().trim();
    if (!type) return;

    const combinations: Payout["combinations"] = [];
    el.find(".line").each((_, line) => {
      const lineEl = $(line);
      const numbers = lineEl.find(".num").text().trim();
      const amountText = lineEl.find(".yen").clone();
      amountText.find(".unit").remove();
      const amount = parseInt(amountText.text().replace(/,/g, "").trim(), 10) || 0;
      const popText = lineEl.find(".pop").clone();
      popText.find("span").remove();
      const popularity = parseInt(popText.text().trim(), 10) || 0;
      if (numbers) combinations.push({ numbers, amount, popularity });
    });

    if (combinations.length > 0) {
      payouts.push({ type, combinations });
    }
  });

  // ハロンタイム・上り
  let furlongTimes = "";
  let finalTimes = "";
  $(".result_time_data tbody tr").each((_, row) => {
    const tr = $(row);
    const label = tr.find("th").text().trim();
    const value = tr.find("td").text().trim();
    if (label === "ハロンタイム") furlongTimes = value;
    else if (label === "上り") finalTimes = value;
  });

  // コーナー通過順位
  const cornerOrder: RaceResult["cornerOrder"] = [];
  $(".result_corner_place tbody tr").each((_, row) => {
    const tr = $(row);
    const corner = tr.find("th").text().trim();
    const order = tr.find("td").text().trim();
    if (corner) cornerOrder.push({ corner, order });
  });

  return {
    raceName,
    raceDetail,
    url,
    results,
    payouts,
    furlongTimes,
    finalTimes,
    cornerOrder,
    fetchedAt: new Date().toISOString(),
  };
}
