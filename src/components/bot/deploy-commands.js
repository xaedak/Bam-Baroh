import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  // ---- Player -----------------------------------------------------------
  new SlashCommandBuilder().setName('bb-profile').setDescription('Show your Bam Baroh profile card'),
  new SlashCommandBuilder().setName('bb-level').setDescription('Show your current level and XP'),
  new SlashCommandBuilder().setName('bb-rank').setDescription('Show your current rank'),
  new SlashCommandBuilder().setName('bb-stats').setDescription('Show your detailed statistics'),
  new SlashCommandBuilder().setName('bb-achievements').setDescription('Show your unlocked achievements'),
  new SlashCommandBuilder().setName('bb-titles').setDescription('Show your unlocked titles'),
  new SlashCommandBuilder().setName('bb-coins').setDescription('Show your Market Token balance'),
  new SlashCommandBuilder().setName('bb-streak').setDescription('Show your daily login streak'),
  new SlashCommandBuilder().setName('bb-daily').setDescription('Check today\'s daily reward status'),

  // ---- Leaderboards -------------------------------------------------------
  new SlashCommandBuilder().setName('bb-leaderboard').setDescription('This server\'s Bam Baroh leaderboard'),
  new SlashCommandBuilder().setName('bb-global').setDescription('Global Bam Baroh leaderboard'),
  new SlashCommandBuilder().setName('bb-levelboard').setDescription('Highest player levels'),
  new SlashCommandBuilder().setName('bb-xpboard').setDescription('Highest XP totals'),
  new SlashCommandBuilder().setName('bb-winboard').setDescription('Most level wins'),
  new SlashCommandBuilder().setName('bb-streakboard').setDescription('Longest win streaks'),
  new SlashCommandBuilder().setName('bb-playtime').setDescription('Most playtime'),

  // ---- Fun ----------------------------------------------------------------
  new SlashCommandBuilder().setName('bb-foodfact').setDescription('A random food fact'),
  new SlashCommandBuilder().setName('bb-randomdish').setDescription('A random dish suggestion'),
  new SlashCommandBuilder().setName('bb-tip').setDescription('A random gameplay tip'),
  new SlashCommandBuilder().setName('bb-meme').setDescription('A random Bam Baroh meme'),
].map((c) => c.toJSON());

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const devGuildId = process.env.DISCORD_DEV_GUILD_ID;

if (!token || !applicationId) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_APPLICATION_ID in bot/.env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function main() {
  const route = devGuildId
    ? Routes.applicationGuildCommands(applicationId, devGuildId)
    : Routes.applicationCommands(applicationId);

  console.log(
    devGuildId
      ? `Registering ${commands.length} commands to guild ${devGuildId} (instant)…`
      : `Registering ${commands.length} commands globally (can take up to ~1hr to propagate)…`
  );
  await rest.put(route, { body: commands });
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
