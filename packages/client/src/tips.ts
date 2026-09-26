// Which one-time tips Bindy has already given on this device. Same storage
// rules as record.ts: guarded, and the game works identically without it (tips
// then simply reappear next launch).
import { BOSSES, type Mods } from '@qbr/shared';
import type { Mood } from './Mascot.js';

const KEY = 'qbr.tips.v1';

export function loadSeenTips(): ReadonlySet<string> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markTipSeen(seen: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(seen);
  next.add(id);
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // Storage unavailable: the tip may show again next launch.
  }
  return next;
}

export interface TipContext {
  readonly humanTurn: boolean;
  readonly firstTurnOfMatch: boolean;
  readonly selected: boolean;
  readonly previewFlips: boolean;
  readonly financeClosedOut: boolean;
  /** Who you're facing ("Finance", "The VP"). */
  readonly who: string;
  /** Your revenue minus theirs, this quarter. */
  readonly lead: number;
  readonly mods: Mods;
  /** Some card in your hand costs more than any open cell you own. */
  readonly hasUnaffordable: boolean;
  /** Your cards currently on the sheet this quarter. */
  readonly myCardsOnBoard: number;
  /** 1-based quarter of the current year. */
  readonly quarterNo: number;
}

export interface Tip {
  readonly id: string;
  readonly text: string;
  readonly mood: Mood;
}

/** The most relevant unseen tip for this moment, or null. Pure. */
export function pickTip(ctx: TipContext, seen: ReadonlySet<string>): Tip | null {
  const candidates: Tip[] = [];
  if (ctx.mods.boss) {
    const b = BOSSES[ctx.mods.boss]!;
    candidates.push({ id: `boss:${b.id}`, text: `Heads up — ${b.name} is in this meeting. ${b.blurb}.`, mood: 'worried' });
  }
  if (ctx.humanTurn && ctx.firstTurnOfMatch && !ctx.selected) {
    candidates.push({
      id: 'place',
      text: 'Tap a card, then a yellow cell to preview its spread. Tap the same cell again to commit.',
      mood: 'talk',
    });
  }
  // The two rules that decide who wins, taught in play rather than by losing.
  if (ctx.humanTurn && ctx.myCardsOnBoard >= 1 && !ctx.selected) {
    candidates.push({
      id: 'lanes',
      text: 'Nice — the cells your card reached are yours now. Each column is a lane: when the quarter closes, each lane’s leader banks its total.',
      mood: 'talk',
    });
  }
  if (ctx.humanTurn && ctx.quarterNo === 2) {
    candidates.push({
      id: 'lives',
      text: `Fresh sheet for Q2, but your hand carries over. Two lives each: lose two quarters and the year goes to ${ctx.who}.`,
      mood: 'talk',
    });
  }
  if (ctx.humanTurn && ctx.hasUnaffordable && !ctx.selected) {
    candidates.push({
      id: 'cost',
      text: 'Grey cards cost more $ than any open cell you own. Spreads add $ to the cells they reach — tap a grey card to see what it needs.',
      mood: 'talk',
    });
  }
  if (ctx.previewFlips) {
    candidates.push({
      id: 'takeover',
      text: `Orange stripes: that card of ${ctx.who}'s is weaker than yours, so it flips to you.`,
      mood: 'talk',
    });
  }
  if (ctx.humanTurn && ctx.financeClosedOut && ctx.lead > 0) {
    candidates.push({
      id: 'closeout-ahead',
      text: `${ctx.who} closed out and you’re ahead. Close out now — unplayed cards carry into next quarter.`,
      mood: 'talk',
    });
  }
  if (ctx.humanTurn && ctx.financeClosedOut && ctx.lead <= 0) {
    candidates.push({
      id: 'closeout-behind',
      text: `${ctx.who} closed out. You play on alone now — stop the moment you’re ahead.`,
      mood: 'worried',
    });
  }
  return candidates.find((t) => !seen.has(t.id)) ?? null;
}

/** Bindy's line on the Home Screen. */
export function homeLine(runs: number, promotions: number): string {
  if (runs === 0) return 'New here? Start a career. I’ll point things out as we go.';
  if (promotions === 0) return 'Finance again. Save a card or two for Q3.';
  return 'Back for another promotion? Coffee Mug never hurts.';
}
