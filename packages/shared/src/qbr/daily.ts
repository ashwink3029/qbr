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
 *  (2026-09-28, item 16): 13.1%; after the joker pool grew 6 -> 9 (item 25): 16.5%. */
export const DAILY_STAKE = 2;

/** First day covered by DAILY_K. */
export const DAILY_FROM = '2026-10-01';
/** Vetted candidate index per day from DAILY_FROM (one base-36 digit per day). */
export const DAILY_K =
  '00500002000000110000000000000000010010040000000000102010100000000001000200001000' +
  '00000110000601000006100101001100111101011012010002011100000020010000010000100100' +
  '03000100000011000300100100011010000000010030101001110110011010001100001000000000' +
  '00000000200000100201100010001100000000101100012100000101011010000000000000202002' +
  '01010000000104000101002110000001000020100001010000001021100100000000000100100000' +
  '00001000100110010000001100010110200100000001000000111000000000000000000100000010' +
  '10000020100001100000000101220200131001020203000001000002110000003001310011020000' +
  '00000111300000011222200000000011000101010001000100001101000010000100000000012012' +
  '00100100100000000001000000103103000000000000100040000000000010000000000020000101' +
  '00000000003100001020011020502011010001001000000041010010001100000100000000001000' +
  '00000002001100000010001000000000000000100010001000313000100010120000001000001110' +
  '10201100000001000002000000000100131000020001100110000001030000000200001020102000' +
  '01010000021021000000000000200010210022000121001000001000000300000031000021000000' +
  '00001000001001001010000001200201000100501000020200100000';

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
