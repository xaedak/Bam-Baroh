import React, { useState } from 'react';
import { useSave } from '../state/SaveContext';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { save, updateSettings, resetProgress } = useSave();
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-dusk-800 dark:bg-dusk-950 text-cream-100 px-4 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6 max-w-md mx-auto">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="font-display text-2xl text-marigold-400">Settings</h1>
      </header>

      <div className="max-w-md mx-auto flex flex-col gap-3">
        <ToggleRow
          label="Dark Mode"
          description="Warm dusk theme across the whole market"
          icon="🌙"
          checked={save.settings.darkMode}
          onChange={(v) => updateSettings({ darkMode: v })}
        />
        <ToggleRow
          label="Music"
          description="Looping night-market melody"
          icon="🎵"
          checked={save.settings.musicOn}
          onChange={(v) => updateSettings({ musicOn: v })}
        />
        <ToggleRow
          label="Sound Effects"
          description="Clicks, matches, and results"
          icon="🔔"
          checked={save.settings.sfxOn}
          onChange={(v) => updateSettings({ sfxOn: v })}
        />
        <ToggleRow
          label="Mute All Audio"
          description="Silences music and sound effects entirely"
          icon="🔇"
          checked={save.settings.muted}
          onChange={(v) => updateSettings({ muted: v })}
        />

        <div className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4 flex flex-col gap-4">
          <SliderRow
            label="Master Volume"
            icon="🎚️"
            value={save.settings.masterVolume}
            onChange={(v) => updateSettings({ masterVolume: v })}
          />
          <SliderRow
            label="Music Volume"
            icon="🎵"
            value={save.settings.musicVolume}
            onChange={(v) => updateSettings({ musicVolume: v })}
          />
          <SliderRow
            label="SFX Volume"
            icon="🔔"
            value={save.settings.sfxVolume}
            onChange={(v) => updateSettings({ sfxVolume: v })}
          />
        </div>

        <div className="mt-4 rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <p className="font-display text-lg text-clay-500 mb-1">Reset Progress</p>
          <p className="font-body text-xs text-cream-200/60 mb-3">
            Erases unlocked levels and stars. This cannot be undone.
          </p>
          {confirmingReset ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetProgress();
                  setConfirmingReset(false);
                }}
                className="flex-1 rounded-full bg-clay-500 hover:bg-clay-600 text-white font-body text-sm py-2 transition-colors"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="flex-1 rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm py-2 transition-colors hover:bg-cream-100/5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingReset(true)}
              className="w-full rounded-full border-2 border-clay-500/60 text-clay-500 font-body text-sm py-2 transition-colors hover:bg-clay-500/10"
            >
              Reset Progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ToggleRowProps {
  label: string;
  description: string;
  icon: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

interface SliderRowProps {
  label: string;
  icon: string;
  value: number;
  onChange: (v: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, icon, value, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="flex items-center gap-2 font-body text-sm text-cream-100">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span className="font-mono text-xs text-cream-200/60">{Math.round(value * 100)}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className="w-full h-2 rounded-full appearance-none bg-dusk-600 accent-marigold-500 cursor-pointer"
    />
  </div>
);

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, icon, checked, onChange }) => (
  <div className="flex items-center justify-between rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4">
    <div className="flex items-center gap-3">
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="font-display text-base text-cream-100">{label}</p>
        <p className="font-body text-xs text-cream-200/60">{description}</p>
      </div>
    </div>
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'w-14 h-8 rounded-full relative transition-colors flex-shrink-0 border',
        checked ? 'bg-betel-500 border-betel-600' : 'bg-dusk-900 border-cream-100/15',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-1 left-1 w-6 h-6 rounded-full bg-cream-100 shadow-tile transition-transform',
          checked ? 'translate-x-6' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  </div>
);
