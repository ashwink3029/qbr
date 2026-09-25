import { useState } from 'react';
import type { Player, QuarterResult } from '@qbr/shared';
import { Game } from './Game.js';
import { Home } from './Home.js';
import { loadRecord, recordYear, saveRecord, type Record } from './record.js';

type Screen = 'home' | 'game';

/**
 * The shell: the Home Screen at launch and after every finished year, and the
 * Game in between. A game in progress stays MOUNTED (hidden, paused) while the
 * player is home, so "Resume" is exact and Finance never moves in the background.
 */
export function App({ seed }: { seed?: number } = {}) {
  const [screen, setScreen] = useState<Screen>('home');
  // Bumping the id mounts a brand-new Game; null = no year in progress.
  const [gameId, setGameId] = useState<number | null>(null);
  const [record, setRecord] = useState<Record>(loadRecord);

  const start = () => {
    setGameId((id) => (id ?? 0) + 1);
    setScreen('game');
  };

  const yearEnded = (winner: Player | null, results: readonly QuarterResult[]) => {
    const next = recordYear(record, winner, results);
    setRecord(next);
    saveRecord(next);
    setGameId(null);
    setScreen('home');
  };

  return (
    <>
      {screen === 'home' && (
        <Home record={record} inProgress={gameId !== null} onStart={start} onResume={() => setScreen('game')} />
      )}
      {gameId !== null && (
        <div className="game-host" hidden={screen !== 'game'}>
          <Game
            key={gameId}
            {...(seed !== undefined ? { seed: seed + gameId - 1 } : {})}
            paused={screen !== 'game'}
            onExit={() => setScreen('home')}
            onYearEnd={yearEnded}
          />
        </div>
      )}
    </>
  );
}
