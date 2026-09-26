// The native MultipeerConnectivity link (ios/App/App/MultipeerPlugin.swift), ported
// from Cubes. Payloads cross the bridge as base64 strings. Real devices only — the
// Simulator can't do Multipeer discovery.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { CoworkerMessage } from '@qbr/shared';
import type { Transport } from './transport.js';

interface MultipeerPlugin {
  startHosting(opts: { displayName: string; service: string }): Promise<void>;
  startBrowsing(opts: { displayName: string; service: string }): Promise<void>;
  stop(): Promise<void>;
  invite(opts: { peerId: string }): Promise<void>;
  send(opts: { data: string }): Promise<void>;
  disconnect(): Promise<void>;
  addListener(event: string, cb: (data: any) => void): Promise<PluginListenerHandle>;
}

const Multipeer = registerPlugin<MultipeerPlugin>('Multipeer');
const SERVICE = 'qbr-cowork'; // Bonjour: _qbr-cowork._tcp (Info.plist NSBonjourServices)

/** Discovery + connection. `pair()` advertises AND browses; the phone with the
 *  larger token invites, the other auto-accepts. `onConnected` hands over a Transport. */
export interface NetLink {
  pair(): void;
  cancel(): void;
  listen(l: { onConnected?: (t: Transport) => void; onError?: (msg: string) => void }): () => void;
}

// UTF-8-safe JSON <-> base64 (names can be non-ASCII).
const encode = (msg: CoworkerMessage): string => btoa(unescape(encodeURIComponent(JSON.stringify(msg))));
const decode = (data: string): CoworkerMessage => JSON.parse(decodeURIComponent(escape(atob(data)))) as CoworkerMessage;

const makePeerToken = (): string => {
  const rnd = globalThis.crypto?.randomUUID?.();
  return `qbr-${rnd ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
};

class MultipeerTransport implements Transport {
  private readonly msgCbs = new Set<(m: CoworkerMessage) => void>();
  private readonly closeCbs = new Set<() => void>();
  private handles: PluginListenerHandle[] = [];
  constructor() {
    void Multipeer.addListener('receive', (d: { data: string }) => {
      const msg = decode(d.data);
      for (const cb of [...this.msgCbs]) cb(msg);
    }).then((h) => this.handles.push(h));
    void Multipeer.addListener('disconnected', () => {
      for (const cb of [...this.closeCbs]) cb();
    }).then((h) => this.handles.push(h));
  }
  send(msg: CoworkerMessage): void {
    void Multipeer.send({ data: encode(msg) });
  }
  onMessage(cb: (m: CoworkerMessage) => void): () => void {
    this.msgCbs.add(cb);
    return () => this.msgCbs.delete(cb);
  }
  onClose(cb: () => void): () => void {
    this.closeCbs.add(cb);
    return () => this.closeCbs.delete(cb);
  }
  close(): void {
    for (const h of this.handles) void h.remove();
    this.handles = [];
    void Multipeer.disconnect();
  }
}

class MultipeerLink implements NetLink {
  private readonly listeners = new Set<{ onConnected?: (t: Transport) => void; onError?: (msg: string) => void }>();
  private readonly peers = new Set<string>();
  private readonly displayName = makePeerToken();
  private pairing = false;
  private paired = false;
  private transport: MultipeerTransport | null = null;

  constructor() {
    void this.wire().catch((e) => this.fail(e));
  }
  private fail(e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    for (const l of [...this.listeners]) l.onError?.(`Couldn’t look for coworkers: ${msg}`);
  }
  private async wire(): Promise<void> {
    const add = async (ev: string, cb: (d: any) => void) => void (await Multipeer.addListener(ev, cb));
    await add('peerFound', (d: { peerId: string }) => {
      this.peers.add(d.peerId);
      this.tryPair();
    });
    await add('peerLost', (d: { peerId: string }) => this.peers.delete(d.peerId));
    await add('connected', () => {
      this.paired = true;
      void Multipeer.stop(); // a third phone can't muscle in (the advertiser auto-accepts)
      this.transport = new MultipeerTransport();
      for (const l of [...this.listeners]) l.onConnected?.(this.transport);
    });
  }
  /** Both phones see the same tokens, so both agree who invites: the larger one. */
  private tryPair(): void {
    if (!this.pairing || this.paired) return;
    const best = [...this.peers].reduce<string | null>((hi, p) => (hi && hi >= p ? hi : p), null);
    if (best && this.displayName > best) Multipeer.invite({ peerId: best }).catch((e) => this.fail(e));
  }
  pair(): void {
    this.pairing = true;
    this.paired = false;
    Multipeer.startHosting({ displayName: this.displayName, service: SERVICE }).catch((e) => this.fail(e));
    Multipeer.startBrowsing({ displayName: this.displayName, service: SERVICE }).catch((e) => this.fail(e));
  }
  cancel(): void {
    this.pairing = false;
    this.paired = false;
    this.transport?.close();
    this.transport = null;
    this.peers.clear();
    void Multipeer.stop();
  }
  listen(l: { onConnected?: (t: Transport) => void; onError?: (msg: string) => void }): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

/** Nearby play exists only in the iOS app: there is no web transport. */
export const nearbySupported = (): boolean => Capacitor.isNativePlatform();

export function createNetLink(): NetLink {
  if (!nearbySupported()) throw new Error('Play your coworker needs the iOS app.');
  return new MultipeerLink();
}
