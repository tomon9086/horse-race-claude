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
