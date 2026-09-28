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
 *  (2026-09-28, item 16): 13.1%. */
export const DAILY_STAKE = 2;

/** First day covered by DAILY_K. */
export const DAILY_FROM = '2026-10-01';
/** Vetted candidate index per day from DAILY_FROM (one base-36 digit per day). */
export const DAILY_K =
  '02100000000000021200000000001000020000040001100000001210110100110310010200020000' +
  '12010200000210400013110101000101010001010031130000010020000021211001020042110420' +
  '12003102100300000302000201022010000020100030003040100020050010102000311221012201' +
  '02101000230000100020103010023100032100300000022001000001121030000000000000300100' +
  '00001100000100012500101110000100000100001100000000200020112111010000010412100200' +
  '00012000200000001103001000020100100000010121000000001101041011000000000311120110' +
  '00100211011001211001002400021000001001000000001000000310140000021120120102000300' +
  '10000201010123020232100100021001001100010003000000005300003010000000010000101000' +
  '10120101120100000000000000010101300001000000000011130010020010001100000011001101' +
  '10000000021001100110101001103010001011002001000051011012101020001110010000120000' +
  '00000115050240121110001010014000020000000020001000000010210021002000002013001100' +
  '10200100000000200000010003000000030000000111012011000201000100100001000200100010' +
  '01000310011101000201110000021012010333000030000100011000110000011201001110001100' +
  '01000000001330100001000011001001000020001007000001101001';

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
