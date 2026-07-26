// AudioManager: a small, dependency-free, file-based audio engine.
//
// Handles two categories of sound:
//  - Music: long looping background tracks (menu / gameplay), crossfaded
//    smoothly when switching tracks or stopping.
//  - SFX: short one-shot sounds, played via cloned <audio> elements so
//    overlapping triggers (e.g. rapid tile matches) don't cut each other off.
//
// Volume model: every sound's audible volume = masterVolume * categoryVolume
// (musicVolume for music, sfxVolume for sfx) * (0 if muted). Settings are
// supplied by the caller (SaveContext/localStorage) and pushed in via
// `configure()`, so this module has no persistence of its own - the app's
// existing save system remains the single source of truth.
//
// Kept as a module-level singleton (like the project's existing useAudio
// pattern) so every component sharing the AudioManager controls the same
// underlying <audio> elements instead of creating duplicates per mount.

export type MusicTrack = 'menu' | 'gameplay';
export type SfxName =
  | 'buttonClick'
  | 'tileSelect'
  | 'tileMatch'
  | 'combo'
  | 'powerup'
  | 'achievementUnlock'
  | 'levelComplete'
  | 'gameOver'
  | 'playerJoined';

const MUSIC_SRC: Record<MusicTrack, string> = {
  menu: '/audio/music/menu.mp3',
  gameplay: '/audio/music/gameplay.mp3',
};

const SFX_SRC: Record<SfxName, string> = {
  buttonClick: '/audio/sfx/button-click.mp3',
  tileSelect: '/audio/sfx/tile-select.mp3',
  tileMatch: '/audio/sfx/tile-match.mp3',
  combo: '/audio/sfx/combo.mp3',
  powerup: '/audio/sfx/powerup.mp3',
  achievementUnlock: '/audio/sfx/achievement-unlock.mp3',
  levelComplete: '/audio/sfx/level-complete.mp3',
  gameOver: '/audio/sfx/game-over.mp3',
  playerJoined: '/audio/sfx/player-joined.mp3',
};

export interface AudioSettings {
  masterVolume: number; // 0-1
  musicVolume: number; // 0-1
  sfxVolume: number; // 0-1
  muted: boolean;
}

const FADE_MS = 650;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

class AudioManagerImpl {
  private settings: AudioSettings = {
    masterVolume: 1,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,
  };

  private sfxPool: Partial<Record<SfxName, HTMLAudioElement>> = {};

  private musicEl: HTMLAudioElement | null = null;
  private musicTrack: MusicTrack | null = null;
  private fadeRaf: number | null = null;
  private wantsMusic = false;

  /** Push the latest volume/mute settings (call whenever save.settings changes). */
  configure(settings: AudioSettings) {
    this.settings = settings;
    if (this.musicEl) {
      this.musicEl.volume = this.effectiveMusicVolume();
    }
  }

  private effectiveMusicVolume(): number {
    if (this.settings.muted) return 0;
    return clamp01(this.settings.masterVolume * this.settings.musicVolume);
  }

  private effectiveSfxVolume(): number {
    if (this.settings.muted) return 0;
    return clamp01(this.settings.masterVolume * this.settings.sfxVolume);
  }

  /** Play a one-shot sound effect. Safe to call rapidly/overlapping. */
  playSfx(name: SfxName) {
    const vol = this.effectiveSfxVolume();
    if (vol <= 0) return;
    try {
      let base = this.sfxPool[name];
      if (!base) {
        base = new Audio(SFX_SRC[name]);
        base.preload = 'auto';
        this.sfxPool[name] = base;
      }
      const node = base.cloneNode(true) as HTMLAudioElement;
      node.volume = vol;
      node.play().catch(() => {
        // Autoplay may be blocked before the first user gesture - ignore.
      });
    } catch {
      // ignore playback errors (unsupported browser, missing file, etc.)
    }
  }

  /** Crossfade to a music track, looping it. No-op if already playing. */
  playMusic(track: MusicTrack) {
    this.wantsMusic = true;
    if (this.musicTrack === track && this.musicEl && !this.musicEl.paused) return;
    this.crossfadeTo(track);
  }

  stopMusic() {
    this.wantsMusic = false;
    if (!this.musicEl) return;
    this.fadeOutAndStop(this.musicEl);
    this.musicEl = null;
    this.musicTrack = null;
  }

  private crossfadeTo(track: MusicTrack) {
    const prevEl = this.musicEl;
    const nextEl = new Audio(MUSIC_SRC[track]);
    nextEl.loop = true;
    nextEl.volume = 0;
    nextEl.play().catch(() => {
      // Blocked until user gesture; startMusic() is re-invoked on the next
      // click-driven call site so this resolves itself in practice.
    });

    this.musicEl = nextEl;
    this.musicTrack = track;

    if (prevEl) this.fadeOutAndStop(prevEl);
    this.fadeVolume(nextEl, this.effectiveMusicVolume());
  }

  private fadeVolume(el: HTMLAudioElement, target: number) {
    const start = el.volume;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / FADE_MS);
      el.volume = start + (target - start) * t;
      if (t < 1) {
        this.fadeRaf = requestAnimationFrame(step);
      }
    };
    if (this.fadeRaf) cancelAnimationFrame(this.fadeRaf);
    this.fadeRaf = requestAnimationFrame(step);
  }

  private fadeOutAndStop(el: HTMLAudioElement) {
    const start = el.volume;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / FADE_MS);
      el.volume = start * (1 - t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.pause();
        el.src = '';
      }
    };
    requestAnimationFrame(step);
  }

  /** Re-apply volume to whatever music is currently playing, or (re)start it
   * if a music request is pending (e.g. settings just toggled music back on). */
  refreshMusic(track: MusicTrack) {
    if (this.settings.muted || this.settings.musicVolume <= 0) {
      if (this.musicEl) this.fadeVolume(this.musicEl, 0);
      return;
    }
    if (this.wantsMusic) {
      this.playMusic(track);
      if (this.musicEl) this.fadeVolume(this.musicEl, this.effectiveMusicVolume());
    }
  }
}

export const AudioManager = new AudioManagerImpl();
