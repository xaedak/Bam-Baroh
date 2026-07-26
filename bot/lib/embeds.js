import { EmbedBuilder } from 'discord.js';

export const BRAND_COLOR = 0xf5a524; // marigold-500, matches the game's palette

export function progressBar(progress, width = 12) {
  const filled = Math.round(Math.max(0, Math.min(1, progress)) * width);
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

export function baseEmbed(title) {
  return new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setTimestamp();
}

export function notLinkedEmbed(user) {
  return baseEmbed('Not linked yet')
    .setDescription(
      `${user} hasn't opened Bam Baroh through this Discord account yet. Launch the Activity once and this'll populate automatically.`
    )
    .setColor(0x8a5a2b);
}

export function errorEmbed(message) {
  return baseEmbed('Something went wrong').setDescription(message).setColor(0xc0392b);
}

export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
