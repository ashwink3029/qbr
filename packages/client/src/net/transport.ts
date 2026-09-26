// A connected message pipe between two phones, handed to NetGame once a coworker
// has agreed to play. Multipeer implements it on device (multipeerLink.ts); the
// in-memory pair below lets tests (and two NetGames in one page) play for real.
import type { CoworkerMessage } from '@qbr/shared';

export interface Transport {
  send(msg: CoworkerMessage): void;
  onMessage(cb: (msg: CoworkerMessage) => void): () => void;
  onClose(cb: () => void): () => void;
  close(): void;
}

/** Two ends of an in-memory link. Messages are delivered in order, on a microtask
 *  (never synchronously inside the sender's call, like a real network). */
export function loopbackPair(): [Transport, Transport] {
  const make = () => ({ msg: new Set<(m: CoworkerMessage) => void>(), close: new Set<() => void>() });
  const ends = [make(), make()];
  let open = true;
  const end = (me: 0 | 1): Transport => ({
    send(m) {
      if (!open) return;
      const copy = JSON.parse(JSON.stringify(m)) as CoworkerMessage; // crosses a wire
      queueMicrotask(() => {
        if (open) for (const cb of [...ends[1 - me]!.msg]) cb(copy);
      });
    },
    onMessage(cb) {
      ends[me]!.msg.add(cb);
      return () => ends[me]!.msg.delete(cb);
    },
    onClose(cb) {
      ends[me]!.close.add(cb);
      return () => ends[me]!.close.delete(cb);
    },
    close() {
      if (!open) return;
      open = false;
      for (const e of ends) for (const cb of [...e.close]) cb();
    },
  });
  return [end(0), end(1)];
}
