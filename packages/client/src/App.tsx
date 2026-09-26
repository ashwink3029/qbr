import { useState } from 'react';
import { playerDeck, type Player, type QuarterResult } from '@qbr/shared';
import { DeckView } from './DeckView.js';
import { Game } from './Game.js';
import { Home } from './Home.js';
import { setFeedbackPrefs } from './feedback.js';
import { EMPTY_RECORD, loadRecord, progressOf, recordRun, recordYear, saveRecord, type Record } from './record.js';
import { Run, type RunResult } from './Run.js';
import { loadSettings, resetProgress, resetTips, saveSettings, type Settings } from './settings.js';
import { SettingsView } from './SettingsView.js';

type Screen = 'home' | 'play' | 'deck' | 'settings';

/** One thing in progress at a time: a career (a "run" in code) or one year. The
 *  deck is fixed when it starts, so unlocks earned mid-way apply next time. */
interface Session {
  readonly kind: 'run' | 'quick';
  readonly id: number;
  readonly deck: readonly string[];
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
export function App({ seed }: { seed?: number } = {}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [record, setRecord] = useState<Record>(loadRecord);
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

  const start = (kind: Session['kind']) => {
    setSession((s) => ({ kind, id: (s?.id ?? 0) + 1, deck: playerDeck(progressOf(record)) }));
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
  const runEnded = (r: RunResult) => finish(recordRun(record, r.promoted, r.meetingsWon));

  const sessionSeed = (id: number) => (seed !== undefined ? seed + id - 1 : freshSeed());

  return (
    <>
      {screen === 'home' && (
        <Home
          record={record}
          inProgress={session?.kind ?? null}
          onStartRun={() => start('run')}
          onStartQuick={() => start('quick')}
          onResume={() => setScreen('play')}
          onDeck={() => setScreen('deck')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'deck' && <DeckView progress={progressOf(record)} onClose={() => setScreen('home')} />}
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
              seed={sessionSeed(session.id)}
              deck={session.deck}
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
