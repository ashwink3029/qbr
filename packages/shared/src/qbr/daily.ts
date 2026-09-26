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
 *  freeze: 37.3% (1096 days). */
export const DAILY_STAKE = 2;

/** First day covered by DAILY_K. */
export const DAILY_FROM = '2026-10-01';
/** Vetted candidate index per day from DAILY_FROM (one base-36 digit per day). */
export const DAILY_K =
  'a0387016303328201111321100005018165041177a401221220321029257019600345032d002b523' +
  '301112546c7221f5d4204505236564620170320401233110372156300eb562260171732060107300' +
  '450087023042e70023141090a001122k7570321687000a1221341261a361202j311922003d027042' +
  '0421k403012000373d1531110741240002020816307428010f6041002210324520a2234111863105' +
  'h10342183307230241428030d1023004b71360004942234292555f44212a520b220f4201a4707033' +
  '022136734f0000035013435353120320038e0325057057257515032412103e12ed104a0301702134' +
  '040027232g0103m138900800603000391153a20121032e1311021620442013112203300103b8160b' +
  '07236041477013411601900m28b9420341037297421421043253417010101002340009010252a2b0' +
  '6a833221000e604155013d1102143069013203f13881100a13421d30208431582d509116142d8f63' +
  '1022a124146702544054211421203a103517121036722004021410142334021l6a85210101e36507' +
  '3125224695043580302222433052780114422145232090205112a00935404a02202104g0011j6015' +
  '7400015917301111322c200404500386621063b12551800562432400942111125320b1m77d600019' +
  '0511134337773630a2ia0d003012004b133080130f20100002012313034054704334820104695182' +
  '1210011365007002308111308010000422b108173209052182h31463';

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
