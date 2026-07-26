import { useCallback, useEffect, useRef } from 'react';
import { useSave } from '../state/SaveContext';
import { AudioManager, MusicTrack } from '../audio/AudioManager';

// Thin React wrapper around the file-based AudioManager singleton (see
// src/audio/AudioManager.ts). Kept as a hook - rather than calling
// AudioManager directly from components - so existing call sites
// (audio.playClick(), audio.playMatch(), etc.) don't need to change, and so
// volume/mute settings from the save file are kept in sync automatically.
//
// `driveMusic` should be true for exactly the "current screen" component
// (MainMenu for menu music, PlayScreen for gameplay music) so multiple
// always-mounted consumers (AchievementToast, DailyRewards, etc.) don't
// fight over which track should be playing - they only need one-shot SFX.
export function useAudio(track: MusicTrack = 'menu', driveMusic = false) {
  const { save } = useSave();
  const settings = save.settings;

  useEffect(() => {
    AudioManager.configure({
      masterVolume: settings.masterVolume,
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      muted: settings.muted || (!settings.musicOn && !settings.sfxOn),
    });
  }, [settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.muted, settings.musicOn, settings.sfxOn]);

  useEffect(() => {
    if (!driveMusic) return;
    if (settings.musicOn && !settings.muted) {
      AudioManager.playMusic(track);
    } else {
      AudioManager.stopMusic();
    }
  }, [driveMusic, track, settings.musicOn, settings.muted]);

  const sfxEnabledRef = useRef(settings.sfxOn);
  sfxEnabledRef.current = settings.sfxOn && !settings.muted;

  const play = useCallback((name: Parameters<typeof AudioManager.playSfx>[0]) => {
    if (!sfxEnabledRef.current) return;
    AudioManager.playSfx(name);
  }, []);

  const playClick = useCallback(() => play('buttonClick'), [play]);
  const playPlace = useCallback(() => play('tileSelect'), [play]);
  const playTileSelect = useCallback(() => play('tileSelect'), [play]);
  const playMatch = useCallback(() => play('tileMatch'), [play]);
  const playCombo = useCallback(() => play('combo'), [play]);
  const playPowerup = useCallback(() => play('powerup'), [play]);
  const playWin = useCallback(() => play('levelComplete'), [play]);
  const playLevelComplete = useCallback(() => play('levelComplete'), [play]);
  const playLose = useCallback(() => play('gameOver'), [play]);
  const playGameOver = useCallback(() => play('gameOver'), [play]);
  const playTap = useCallback(() => play('tileSelect'), [play]);
  const playAchievement = useCallback(() => play('achievementUnlock'), [play]);
  const playAchievementUnlock = useCallback(() => play('achievementUnlock'), [play]);
  const playReward = useCallback(() => play('powerup'), [play]);
  const playPlayerJoined = useCallback(() => play('playerJoined'), [play]);

  const startMusic = useCallback(() => AudioManager.playMusic(track), [track]);
  const stopMusic = useCallback(() => AudioManager.stopMusic(), []);

  return {
    playClick,
    playPlace,
    playTileSelect,
    playMatch,
    playCombo,
    playPowerup,
    playWin,
    playLevelComplete,
    playLose,
    playGameOver,
    playTap,
    playAchievement,
    playAchievementUnlock,
    playReward,
    playPlayerJoined,
    startMusic,
    stopMusic,
  };
}
