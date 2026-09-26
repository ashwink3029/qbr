import { useState } from 'react';
import {
  DAILY_STAKE,
  STAKES,
  STARTER_DECK,
  dailySeed,
  dayKey,
  playerDeck,
  unlockedSpecials,
  type Player,
  type QuarterResult,
} from '@qbr/shared';
import { loadBench, saveBench } from './bench.js';
import { CoworkerView } from './CoworkerView.js';
import { DeckView } from './DeckView.js';
import { createNetLink, nearbySupported, type NetLink } from './net/multipeerLink.js';
import { Game } from './Game.js';
import { Home } from './Home.js';
import { setFeedbackPrefs } from './feedback.js';
import {
  EMPTY_RECORD,
  loadRecord,
  progressOf,
  recordDailyEnd,
  recordCoworker,
  recordDailyStart,
  recordRun,
  recordYear,
  saveRecord,
  type Record,
} from './record.js';
import { Run, type RunResult } from './Run.js';
import { loadSettings, resetProgress, resetTips, saveSettings, type Settings } from './settings.js';
import { SettingsView } from './SettingsView.js';

type Screen = 'home' | 'play' | 'deck' | 'settings' | 'coworker';

/** One thing in progress at a time: a career (a "run" in code) or one year. The
 *  deck is fixed when it starts, so unlocks earned mid-way apply next time. */
interface Session {
  readonly kind: 'run' | 'quick';
  readonly id: number;
  readonly deck: readonly string[];
  /** A career's stake (1 = Standard); fixed when it starts. */
  readonly stake: number;
  /** The daily career's day (`YYYY-MM-DD`), when this career is the daily. */
  readonly daily?: string;
}

function freshSeed(): number {
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

/**
 * The shell: the Home Screen at launch and after every finished career or year,
 * the deck view, and the session in between. A session in progress stays
 * MOUNTED (hidden, paused) while the player is elsewhere, so "Resume" is exact
 * and the opponent never moves in the background. Starting something new
 * replaces it.
 */
export function App({
  seed,
  today = dayKey(new Date()),
  nearby = nearbySupported() ? createNetLink : undefined,
}: {
  seed?: number;
  today?: string;
  /** The nearby link for "Play your coworker" (Multipeer in the iOS app; absent on the web). */
  nearby?: (() => NetLink) | undefined;
} = {}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [record, setRecord] = useState<Record>(loadRecord);
  const [bench, setBench] = useState<string[]>(loadBench);
  // Your deck opens from Home or from a career's opening org chart; close returns there.
  const [deckReturn, setDeckReturn] = useState<'home' | 'play'>('home');
  const changeBench = (b: string[]) => {
    setBench(b);
    saveBench(b);
  };
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings();
    setFeedbackPrefs(s);
    return s;
  });

  const changeSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
    setFeedbackPrefs(s);
  };

  // Stakes open to play: everything up to one past the highest promotion.
  const maxStake = Math.min(STAKES.length, record.stakeCleared + 1);
  const [stake, setStake] = useState(1);
  const chosenStake = Math.min(stake, maxStake);

  const start = (kind: Session['kind']) => {
    setSession((s) => ({
      kind,
      id: (s?.id ?? 0) + 1,
      deck: playerDeck(progressOf(record), bench),
      stake: kind === 'run' ? chosenStake : 1,
    }));
    setScreen('play');
  };

  // Today's daily: the same seed for everyone, Budget freeze, the starter deck.
  // It counts as attempted the moment it starts — one try a day.
  const startDaily = () => {
    const next = recordDailyStart(record, today);
    setRecord(next);
    saveRecord(next);
    setSession((s) => ({ kind: 'run', id: (s?.id ?? 0) + 1, deck: STARTER_DECK, stake: DAILY_STAKE, daily: today }));
    setScreen('play');
  };

  const finish = (next: Record) => {
    setRecord(next);
    saveRecord(next);
    setSession(null);
    setScreen('home');
  };

  const yearEnded = (winner: Player | null, results: readonly QuarterResult[]) =>
    finish(recordYear(record, winner, results));
  const runEnded = (r: RunResult) => {
    const next = recordRun(record, r.promoted, r.meetingsWon, session?.stake ?? 1);
    finish(session?.daily ? recordDailyEnd(next, session.daily, r.meetingsWon, r.promoted) : next);
  };

  const sessionSeed = (id: number) => (seed !== undefined ? seed + id - 1 : freshSeed());

  return (
    <>
      {screen === 'home' && (
        <Home
          record={record}
          inProgress={session?.kind ?? null}
          onStartRun={() => start('run')}
          onStartQuick={() => start('quick')}
          today={today}
          onDaily={startDaily}
          dailyLive={session?.daily === today}
          onResume={() => setScreen('play')}
          onDeck={() => {
            setDeckReturn('home');
            setScreen('deck');
          }}
          onSettings={() => setScreen('settings')}
          {...(nearby ? { onCoworker: () => setScreen('coworker') } : {})}
          stake={chosenStake}
          maxStake={maxStake}
          onStake={setStake}
        />
      )}
      {screen === 'deck' && (
        <DeckView progress={progressOf(record)} benched={bench} onBench={changeBench} onClose={() => setScreen(deckReturn)} />
      )}
      {screen === 'coworker' && nearby && (
        <CoworkerView
          makeLink={nearby}
          name={settings.name}
          deck={playerDeck(progressOf(record), bench)}
          onName={(name) => changeSettings({ ...settings, name })}
          onEnd={(winner) => {
            const next = recordCoworker(record, winner);
            setRecord(next);
            saveRecord(next);
            setScreen('home');
          }}
          onClose={() => setScreen('home')}
        />
      )}
      {screen === 'settings' && (
        <SettingsView
          settings={settings}
          onChange={changeSettings}
          onResetTips={resetTips}
          onResetProgress={() => {
            resetProgress();
            setRecord(EMPTY_RECORD);
          }}
          onClose={() => setScreen('home')}
        />
      )}
      {session && (
        <div className="game-host" hidden={screen !== 'play'}>
          {session.kind === 'run' ? (
            <Run
              key={session.id}
              seed={session.daily ? dailySeed(session.daily) : sessionSeed(session.id)}
              deck={session.daily ? session.deck : playerDeck(progressOf(record), bench)}
              stake={session.stake}
              daily={session.daily !== undefined}
              {...(session.daily || unlockedSpecials(progressOf(record)).length === 0
                ? {}
                : {
                    onEditDeck: () => {
                      setDeckReturn('play');
                      setScreen('deck');
                    },
                  })}
              progress={progressOf(record)}
              paused={screen !== 'play'}
              onExit={() => setScreen('home')}
              onRunEnd={runEnded}
            />
          ) : (
            <Game
              key={session.id}
              seed={sessionSeed(session.id)}
              deck={session.deck}
              paused={screen !== 'play'}
              onExit={() => setScreen('home')}
              onYearEnd={yearEnded}
            />
          )}
        </div>
      )}
    </>
  );
}
