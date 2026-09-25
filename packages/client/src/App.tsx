import { useState } from 'react';
import type { Player, QuarterResult } from '@qbr/shared';
import { Game } from './Game.js';
import { Home } from './Home.js';
import { loadRecord, recordRun, recordYear, saveRecord, type Record } from './record.js';
import { Run, type RunResult } from './Run.js';

type Screen = 'home' | 'play';

/** One thing in progress at a time: a run (the main mode) or a quick year. */
interface Session {
  readonly kind: 'run' | 'quick';
  readonly id: number;
}

function freshSeed(): number {
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

/**
 * The shell: the Home Screen at launch and after every finished run or year, and
 * the session in between. A session in progress stays MOUNTED (hidden, paused)
 * while the player is home, so "Resume" is exact and Finance never moves in the
 * background. Starting something new replaces it.
 */
export function App({ seed }: { seed?: number } = {}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [record, setRecord] = useState<Record>(loadRecord);

  const start = (kind: Session['kind']) => {
    setSession((s) => ({ kind, id: (s?.id ?? 0) + 1 }));
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
        />
      )}
      {session && (
        <div className="game-host" hidden={screen !== 'play'}>
          {session.kind === 'run' ? (
            <Run
              key={session.id}
              seed={sessionSeed(session.id)}
              paused={screen !== 'play'}
              onExit={() => setScreen('home')}
              onRunEnd={runEnded}
            />
          ) : (
            <Game
              key={session.id}
              seed={sessionSeed(session.id)}
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
