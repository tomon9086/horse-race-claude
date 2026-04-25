export interface PastRace {
  date: string;
  venue: string;
  raceName: string;
  grade?: string;
  finish: number | string;
  fieldSize: number;
  gate: number;
  popularity: number;
  jockey: string;
  weight: number;
  distance: string;
  time: string;
  condition: string;
  rating?: string;
}

export interface HorseEntry {
  wakuban: number;
  umaban: number;
  horseName: string;
  age: string;
  weight: number;
  jockey: string;
  trainer: string;
  owner: string;
  breeder: string;
  pedigree: {
    sire: string;
    dam: string;
    damSire: string;
  };
  record: string;
  preRating?: string;
  pastRaces: PastRace[];
}

export interface RaceInfo {
  raceName: string;
  raceDetail: string;
  url: string;
  entries: HorseEntry[];
  fetchedAt: string;
}

export interface RaceResultEntry {
  place: number | string; // 着順（失格等の場合は文字列）
  wakuban: number;
  umaban: number;
  horseName: string;
  age: string;
  burden: number; // 負担重量
  jockey: string;
  time: string;
  margin: string; // 着差
  corners: string[]; // コーナー通過順位
  finalTime: string; // 推定上り3F
  bodyWeight: number;
  bodyWeightDiff: number; // 増減
  trainer: string;
  popularity: number; // 単勝人気
}

export interface Payout {
  type: string; // 単勝, 複勝, 枠連, 馬連, etc.
  combinations: Array<{
    numbers: string; // "16" or "7-16" or "4-7-16"
    amount: number; // 払戻金（円）
    popularity: number; // 何番人気
  }>;
}

export interface RaceResult {
  raceName: string;
  raceDetail: string; // 日時・コース等
  url: string;
  results: RaceResultEntry[];
  payouts: Payout[];
  furlongTimes: string; // ハロンタイム
  finalTimes: string; // 上り
  cornerOrder: Array<{ corner: string; order: string }>;
  fetchedAt: string;
}
