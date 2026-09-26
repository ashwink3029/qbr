// Player settings, kept on the device. Same storage rules as record.ts and
// tips.ts: every access is guarded, and the game works identically without it.

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  /** Shown to coworkers across the table ("Play your coworker"). */
  readonly name: string;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true, name: '' };

const KEY = 'qbr.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
      haptics: typeof s.haptics === 'boolean' ? s.haptics : DEFAULT_SETTINGS.haptics,
      name: typeof s.name === 'string' ? s.name.slice(0, 24) : DEFAULT_SETTINGS.name,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: the setting lasts for this session only.
  }
}

/** Forget every one-time tip, so Bindy explains things again. */
export function resetTips(): void {
  try {
    globalThis.localStorage?.removeItem('qbr.tips.v1');
  } catch {
    // Nothing to forget.
  }
}

/** Forget the saved record (careers, years, best title — and so unlocks). */
export function resetProgress(): void {
  try {
    globalThis.localStorage?.removeItem('qbr.record.v1');
  } catch {
    // Nothing to forget.
  }
}
