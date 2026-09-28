// The daily career: one shared seed per calendar day, the same on every device, so
// everyone gets the same VP boss, closet offers and deals.
//
// Seeds are VETTED offline (sim/src/dailyvet.ts): a raw date hash gave a day that 20
// different drafts all lost on 69% of dates (sim/src/dailybars.ts D2) — the deals
// decide too much. Each day instead uses the first candidate hash(date#k) that a
// smart-lookahead player promotes with at least one draft ordering; DAILY_K stores
// that k per day from DAILY_FROM. Days outside the table fall back to k = 0.

/** The local calendar date as `YYYY-MM-DD` — the daily career's key. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Candidate k for a day (k = 0 is the plain date hash). */
export function dailyCandidate(day: string, k: number): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`not a YYYY-MM-DD day: ${day}`);
  return fnv1a(k === 0 ? day : `${day}#${k}`);
}

/** The daily runs at Budget freeze on the starter deck, the same for everyone. On
 *  vetted seeds, Standard promoted 46.7% of days (bar D1 <= 40%); Budget freeze
 *  33.3%, Restructuring 23.3% (150 days each). The shipped 3-year table at Budget
 *  freeze: 37.3% (1096 days); re-vetted after iteration 13 grew the joker/boss
 *  pool: 17.6%; re-vetted after the 2026-09-27 rebalance (Cold Call fan, Mug,
 *  ladder and stakes retuned): 14.2%; re-vetted after purple takeover cells
 *  (2026-09-28, item 16): 13.1%; after the joker pool grew 6 -> 9 (item 25): 16.5%; 9 -> 10 (Corner Office): 16.2%. */
export const DAILY_STAKE = 2;

/** First day covered by DAILY_K. */
export const DAILY_FROM = '2026-10-01';
/** Vetted candidate index per day from DAILY_FROM (one base-36 digit per day). */
export const DAILY_K =
  '00010001001100001000000101000001000001121000000011000010100000000100100100000010' +
  '02100010000000000043000000002020000000030031013000000020020000111011000002100210' +
  '00002200000001000100100200010010000110000040000100100400101000001000000200020000' +
  '02100010012000000111100120000000100000100100010000000020000000010001000000000000' +
  '10000000000100121101001000100000100010000000000000010000100000000000010121000000' +
  '00120000010001011001002101001011100010300100000001002110000010000010001110000100' +
  '10201020100001200001100010010000000000003100020000100000100110101101000000120020' +
  '00001101000200000100000030021000000003010010001000101200001210310001100000000000' +
  '10100000001000021210000000010002010000011000100020200000010021100000000010000110' +
  '02000000204102002000000000001010000001012001001121001003011002100100000000111000' +
  '00001000100050101200001001001100000000000000000000103011020002000000001131100102' +
  '10210100011100100301001010000100220000000000001200001001000010100110000010000000' +
  '00000311003110000100010000210000112001000280011100001000010200001011000020000000' +
  '01100010000030000011030001000110100200000003020110000000';

/** Whole days from DAILY_FROM to `day` (calendar arithmetic, DST-safe via UTC). */
function dayIndex(day: string): number {
  const utc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(day) - utc(DAILY_FROM)) / 86_400_000);
}

/** The daily career's seed for a `YYYY-MM-DD` day. */
export function dailySeed(day: string): number {
  const i = dayIndex(day);
  const k = i >= 0 && i < DAILY_K.length ? parseInt(DAILY_K[i]!, 36) : 0;
  return dailyCandidate(day, k);
}
