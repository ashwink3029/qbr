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
  /** A cell is being previewed (the next tap on it places the card). */
  readonly previewing?: boolean;
  readonly previewFlips: boolean;
  readonly financeClosedOut: boolean;
  /** Who you're facing ("Finance", "The VP"). */
  readonly who: string;
  /** Your revenue minus theirs, this quarter. */
  readonly lead: number;
  readonly mods: Mods;
  /** Some card in your hand costs more than any open cell you own. */
  readonly hasUnaffordable: boolean;
  /** Name of a card with purple (takeover) cells you can PLAY right now (item 16). A grey
   *  (unaffordable) one doesn't count: a tip about a card you can't use made no sense. */
  readonly purpleCard?: string | undefined;
  /** The opponent's last move took one of your cards over. */
  readonly lostToPurple?: boolean;
  /** Your cards currently on the sheet this quarter. */
  readonly myCardsOnBoard: number;
  /** 1-based quarter of the current year. */
  readonly quarterNo: number;
}

export interface Tip {
  readonly id: string;
  readonly text: string;
  readonly mood: Mood;
  /** What on screen the tip is about; Game makes it glow while the tip shows. */
  readonly points?: 'sums' | 'unaffordable' | 'lives' | 'hearts' | 'backs' | 'pass' | 'purple' | 'lost';
}

/** The most relevant unseen tip for this moment, or null. Pure. */
export function pickTip(ctx: TipContext, seen: ReadonlySet<string>): Tip | null {
  const candidates: Tip[] = [];
  if (ctx.mods.boss) {
    const b = BOSSES[ctx.mods.boss]!;
    candidates.push({ id: `boss:${b.id}`, text: `Heads up — ${b.name} is in this meeting. ${b.blurb}.`, mood: 'worried' });
  }
  // Until the first card is ever placed, Bindy walks the three taps one line at a time,
  // while the screen makes the next thing to tap glow (Game's data-guide).
  if (ctx.humanTurn && !seen.has('place')) {
    candidates.push({
      id: 'place',
      text: ctx.previewing
        ? 'Like it? Tap the same cell again to place it.'
        : ctx.selected
          ? 'Now tap a glowing cell to see its spread.'
          : 'Your move — tap a glowing card.',
      mood: 'talk',
    });
  }
  // The two rules that decide who wins, taught in play rather than by losing.
  // Shown the moment your first card lands (even while the opponent thinks).
  if (ctx.myCardsOnBoard >= 1 && !ctx.selected) {
    candidates.push({
      id: 'lanes',
      text: 'Those cells are yours now. Only a lane’s leader scores it — watch the =SUM row.',
      mood: 'talk',
      points: 'sums',
    });
  }
  // Purple takeover cells (item 16) — not a simple concept, so taught at each first meeting.
  if (ctx.previewFlips) {
    candidates.push({
      id: 'purple-preview',
      text: `Purple stripes: that card of ${ctx.who}'s flips to you when you place this — any value.`,
      mood: 'talk',
    });
  }
  if (ctx.humanTurn && ctx.lostToPurple) {
    candidates.push({
      id: 'purple-lost',
      text: `${ctx.who}'s purple square just took your card. Keep key cards out of reach of their purple.`,
      mood: 'worried',
      points: 'lost',
    });
  }
  if (ctx.humanTurn && ctx.purpleCard && !ctx.selected) {
    candidates.push({
      id: 'purple',
      text: `See the purple square on ${ctx.purpleCard}? It takes over: an enemy card there flips to you, whatever its value. Green squares only claim empty cells.`,
      mood: 'talk',
      points: 'purple',
    });
  }
  // The two rows by the opponent's name (user, 2026-09-28: "not clear what the green and red
  // squares mean"), taught in the first quarter once a card is down.
  if (ctx.humanTurn && ctx.myCardsOnBoard >= 1 && !ctx.selected) {
    candidates.push({
      id: 'hearts',
      text: 'Hearts are lives: lose a quarter, lose a heart. Out of hearts loses the year.',
      mood: 'talk',
      points: 'hearts',
    });
    candidates.push({
      id: 'backs',
      text: `The cards by ${ctx.who}'s name are ${ctx.who}'s hand — what they have left to play.`,
      mood: 'talk',
      points: 'backs',
    });
  }
  if (ctx.humanTurn && ctx.quarterNo === 2) {
    candidates.push({
      id: 'lives',
      text: `Fresh sheet for Q2, but your hand carries over. Lose two quarters — both hearts — and the year goes to ${ctx.who}.`,
      mood: 'talk',
      points: 'lives',
    });
  }
  if (ctx.humanTurn && ctx.hasUnaffordable && !ctx.selected) {
    candidates.push({
      id: 'cost',
      text: 'Grey cards need a richer cell. Spreads add $ — tap one to see why.',
      mood: 'talk',
      points: 'unaffordable',
    });
  }
  if (ctx.humanTurn && ctx.financeClosedOut && ctx.lead > 0) {
    candidates.push({
      id: 'closeout-ahead',
      text: `${ctx.who} closed out and you’re ahead. Close out now — unplayed cards carry into next quarter.`,
      mood: 'talk',
      points: 'pass',
    });
  }
  if (ctx.humanTurn && ctx.financeClosedOut && ctx.lead <= 0) {
    candidates.push({
      id: 'closeout-behind',
      text: `${ctx.who} closed out. You play on alone now — stop the moment you’re ahead.`,
      mood: 'worried',
    });
  }
  // Lowest priority: the card inspector (item 21) is otherwise only mentioned in the deck builder.
  if (ctx.humanTurn && ctx.myCardsOnBoard >= 2 && !ctx.selected) {
    candidates.push({
      id: 'inspect',
      text: 'Hold any card — in your hand or on the sheet — to see it up close.',
      mood: 'talk',
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
