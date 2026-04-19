import * as cheerio from "cheerio";
import type { HorseEntry, PastRace, RaceInfo } from "./types.js";

function parseWakuban(td: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): number {
  const alt = td.find("img").attr("alt") ?? "";
  const match = alt.match(/枠(\d)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parsePastRace(td: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): PastRace | null {
  const date = td.find(".date_line .date").text().trim();
  if (!date) return null;

  const venue = td.find(".date_line .rc").text().trim();
  const raceName = td.find(".race_line .name").text().trim();

  const gradeImg = td.find(".race_line .grade_icon img").attr("src") ?? "";
  let grade: string | undefined;
  if (gradeImg.includes("g1")) grade = "G1";
  else if (gradeImg.includes("g2")) grade = "G2";
  else if (gradeImg.includes("g3")) grade = "G3";

  const placeLine = td.find(".place_line");
  const finishText = placeLine.find(".place").text().replace(/着/g, "").trim();
  const finish = /^\d+$/.test(finishText) ? parseInt(finishText, 10) : finishText;

  const numDiv = placeLine.find(".num");
  const fieldSizeText = numDiv.find(".max").text().replace(/頭/g, "").trim();
  const fieldSize = parseInt(fieldSizeText, 10) || 0;
  const gateText = numDiv.find(".gate").text().replace(/番/g, "").trim();
  const gate = parseInt(gateText, 10) || 0;
  const popText = numDiv.find(".pop").text().replace(/番人気/g, "").trim();
  const popularity = parseInt(popText, 10) || 0;

  const jockey = td.find(".info_line1 .jockey").text().trim();
  const weightText = td.find(".info_line1 .weight").text().replace(/kg/g, "").trim();
  const weight = parseFloat(weightText) || 0;

  const distance = td.find(".info_line2 .dist").text().trim();
  const time = td.find(".info_line2 .time").text().trim();
  const condition = td.find(".info_line2 .condition").text().trim();
  const rating = td.find(".info_line2 .rating").text().trim() || undefined;

  return {
    date, venue, raceName, grade, finish, fieldSize, gate, popularity,
    jockey, weight, distance, time, condition, rating,
  };
}

export function parseJraEntries(html: string, url: string): RaceInfo {
  const $ = cheerio.load(html);

  const caption = $("table.basic caption");
  const raceName = caption.find(".race_name").first().contents().first().text().trim();
  const dateText = caption.find(".cell.date").text().trim();
  const courseText = caption.find(".cell.course").text().trim()
    .replace(/コース：/g, "").replace(/メートル/g, "m");
  const raceDetail = `${dateText} / ${courseText}`;

  const entries: HorseEntry[] = [];

  $("table.basic tbody tr").each((_, row) => {
    const tr = $(row);

    const wakuban = parseWakuban(tr.find("td.waku"), $);
    const umaban = parseInt(tr.find("td.num").text().trim(), 10);
    if (isNaN(umaban)) return;

    const horseTd = tr.find("td.horse");
    const horseName = horseTd.find(".name").first().text().trim();
    const record = horseTd.find(".result").text().replace(/[()（）]/g, "").trim();
    const owner = horseTd.find("p.owner").text().trim();
    const breeder = horseTd.find("p.breeder").text().trim();
    const trainerEl = horseTd.find("p.trainer");
    const trainer = trainerEl.text().trim();

    const familyLine = horseTd.find("ul.family_line li");
    const sireText = familyLine.filter(".sire").text().replace(/父：/g, "").trim();
    const mareText = familyLine.filter(".mare").text().trim();
    const damMatch = mareText.match(/母：(.+?)(?:\(|$)/);
    const damSireMatch = mareText.match(/母の父：(.+?)\)/);

    const jockeyTd = tr.find("td.jockey");
    const age = jockeyTd.find("p.age").text().trim();
    const weightText = jockeyTd.find("p.weight").text().replace(/kg/g, "").trim();
    const weight = parseFloat(weightText) || 0;
    const jockey = jockeyTd.find("p.jockey").text().trim();
    const preRating = jockeyTd.find(".rating .num").text().trim() || undefined;

    const pastRaces: PastRace[] = [];
    for (const cls of [".past.p1", ".past.p2", ".past.p3", ".past.p4"]) {
      const pastTd = tr.find(`td${cls}`);
      if (pastTd.length) {
        const race = parsePastRace(pastTd, $);
        if (race) pastRaces.push(race);
      }
    }

    entries.push({
      wakuban, umaban, horseName, age, weight, jockey, trainer, owner, breeder,
      pedigree: {
        sire: sireText,
        dam: damMatch?.[1] ?? "",
        damSire: damSireMatch?.[1] ?? "",
      },
      record, preRating, pastRaces,
    });
  });

  return {
    raceName,
    raceDetail,
    url,
    entries,
    fetchedAt: new Date().toISOString(),
  };
}
