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
 *  ladder and stakes retuned): 14.2%. */
export const DAILY_STAKE = 2;

/** First day covered by DAILY_K. */
export const DAILY_FROM = '2026-10-01';
/** Vetted candidate index per day from DAILY_FROM (one base-36 digit per day). */
export const DAILY_K =
  '00111010100000002204100030011010020000040410100001000140100500320110300412000101' +
  '31110220100110300010001001001001002000010041020700010021211300111000010002040000' +
  '10001000100002002300011001300020300010100201013200122024120040005000002000112110' +
  '00001011203020102010100010103000101000010000022030100100020110020000000000400200' +
  '04000120000100012221221010103041000300001103001003200101012211001001011213100300' +
  '00000004111105000202000000011210000042000031303000201106051012000101000010121420' +
  '00100300000011010002000220220300131121020000020001060011110100122100002121120020' +
  '00421121020010000120100110001003314200010201021000036200000012300200300000220000' +
  '10102011001030100300020002000203000000012010112000000010121000000300203013030000' +
  '14004000000011210000000231001031201011001000000002001004341001024400110000020302' +
  '00160035060340120121003010011100330105100023001304204000000041410001033012100100' +
  '10221100201240000202030101001100000000300112002001000202013100100010000110110030' +
  '01000230140100000224210000201010110322121010101013011100110000011202000020100102' +
  '05000110010174040021110111301211001100001060010002210103';

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
