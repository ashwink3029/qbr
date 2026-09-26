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
 *  pool: 17.6%. */
export const DAILY_STAKE = 2;

/** First day covered by DAILY_K. */
export const DAILY_FROM = '2026-10-01';
/** Vetted candidate index per day from DAILY_FROM (one base-36 digit per day). */
export const DAILY_K =
  '00002001102000000000100100000010010000010132001300002002011000100010100010000101' +
  '20112100000000110000100010102000000000201101110130110000010101110000000000000000' +
  '01101101011210001010000110000201000001000030011000000101000200000000100200003000' +
  '01001000000100010001311101021201000020010001000000012100000001000100100002000202' +
  '00011100000020001200200021000000000000000000100002131020301030000000000000000020' +
  '00100011000100021030002100010200000101000000002001021000001000022010000100311110' +
  '00001020210000000000000000300011000011010000000020000010000010110100200001021102' +
  'a0111000001210012100000000010000003000000010201000000200020010010000000000100100' +
  '21010010000102101000120000000000002001302000000000020000103300000100000010100101' +
  '00120002001200000000010120201000020030010001110201200102010000000010000002001000' +
  '30120002000010000000000000000001100100000000011010100000200001001000000101001001' +
  '10000111020020000001010000000201100000000021000021200000001002000001000000000000' +
  '02101000121100000010000010000000100000020300100101001101000000001010001100003000' +
  '10011000030010110010020100001000001001002010010002012020';

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
