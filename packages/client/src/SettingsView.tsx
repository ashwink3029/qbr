import { useState } from 'react';
import type { Settings } from './settings.js';

export interface SettingsViewProps {
  readonly settings: Settings;
  readonly onChange: (s: Settings) => void;
  readonly onResetTips: () => void;
  /** Wipes the saved record (careers, years, unlocks). Only called after the
   *  player confirms with a second, explicit tap. */
  readonly onResetProgress: () => void;
  readonly onClose: () => void;
}

/** Settings, as a 90s preferences dialog: sound, haptics, tips, progress. */
export function SettingsView({ settings, onChange, onResetTips, onResetProgress, onClose }: SettingsViewProps) {
  const [confirming, setConfirming] = useState(false);
  const [tipsReset, setTipsReset] = useState(false);
  const [progressReset, setProgressReset] = useState(false);

  return (
    <div className="app home" data-settings-view>
      <div className="window start-window">
        <div className="titlebar">
          <span>Settings</span>
          <span className="tb-buttons">
            <button className="tb-close" data-exit aria-label="Back to home" onClick={onClose}>
              ×
            </button>
          </span>
        </div>
        <div className="start-body settings-body">
          <fieldset className="group">
            <legend>Feedback</legend>
            <label className="check">
              <input
                type="checkbox"
                data-toggle="sound"
                checked={settings.sound}
                onChange={(e) => onChange({ ...settings, sound: e.target.checked })}
              />
              Sound effects
            </label>
            <label className="check">
              <input
                type="checkbox"
                data-toggle="haptics"
                checked={settings.haptics}
                onChange={(e) => onChange({ ...settings, haptics: e.target.checked })}
              />
              Haptics (vibration)
            </label>
          </fieldset>

          <fieldset className="group">
            <legend>Help</legend>
            <button
              className="btn"
              data-reset-tips
              onClick={() => {
                onResetTips();
                setTipsReset(true);
              }}
            >
              {tipsReset ? 'Bindy will explain again ✓' : 'Show tips again'}
            </button>
          </fieldset>

          <fieldset className="group danger">
            <legend>Progress</legend>
            {progressReset ? (
              <p className="pitch">Progress reset. Fresh start.</p>
            ) : confirming ? (
              <>
                <p className="pitch">Erase every career, year and unlocked card? This can't be undone.</p>
                <div className="row-buttons">
                  <button className="btn" onClick={() => setConfirming(false)}>
                    Keep my progress
                  </button>
                  <button
                    className="btn danger"
                    data-reset-confirm
                    onClick={() => {
                      onResetProgress();
                      setConfirming(false);
                      setProgressReset(true);
                    }}
                  >
                    Erase
                  </button>
                </div>
              </>
            ) : (
              <button className="btn" data-reset-progress onClick={() => setConfirming(true)}>
                Reset progress…
              </button>
            )}
          </fieldset>

          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
