import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { fetchProfile, fetchLeaderboard } from './lib/api.js';
import { baseEmbed, notLinkedEmbed, errorEmbed, progressBar, formatSeconds } from './lib/embeds.js';
import { ACHIEVEMENT_META } from '../server/achievements-meta.js';
import { TITLE_LADDER } from '../server/titles.js';
import { FOOD_FACTS, RANDOM_DISHES, TIPS, MEMES, pickRandom } from './data/fun.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Privileged intent - must also be toggled on under Bot -> Privileged
    // Gateway Intents in the Discord Developer Portal. Only used to scope
    // /bb-leaderboard down to this server's members; every other command
    // works fine without it.
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Bam Baroh bot logged in as ${c.user.tag}`);
});

// ---- helpers --------------------------------------------------------------

function rankLine(profile) {
  const { rank, levelInfo } = profile;
  return (
    `**${rank.name}** · Lv ${levelInfo.level}\n` +
    `${progressBar(levelInfo.progress)}  ${levelInfo.xpIntoLevel}/${levelInfo.xpForNextLevel} XP` +
    (rank.nextRank ? `\n${rank.progress < 1 ? `${Math.round(rank.progress * 100)}% to **${rank.nextRank}**` : ''}` : '')
  );
}

async function requireProfile(interaction) {
  const bundle = await fetchProfile(interaction.user.id);
  if (!bundle) {
    await interaction.reply({ embeds: [notLinkedEmbed(interaction.user)], ephemeral: true });
    return null;
  }
  return bundle;
}

function leaderboardEmbed(title, entries, { valueFn, unit }) {
  const embed = baseEmbed(title);
  if (entries.length === 0) {
    embed.setDescription('No players on this board yet.');
    return embed;
  }
  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.slice(0, 10).map((e, i) => {
    const marker = medals[i] || `${i + 1}.`;
    return `${marker} **${e.username}** — ${valueFn(e)}${unit ? ` ${unit}` : ''}`;
  });
  embed.setDescription(lines.join('\n'));
  return embed;
}

// ---- interaction handling ---------------------------------------------------

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  try {
    switch (commandName) {
      // ---- Player -------------------------------------------------------
      case 'bb-profile': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        const { profile } = bundle;
        const embed = baseEmbed(`${interaction.user.username}'s Profile`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: 'Title', value: profile.titles.current.name, inline: true },
            { name: 'Rank', value: profile.rank.name, inline: true },
            { name: 'Level', value: `${profile.levelInfo.level}`, inline: true },
            { name: 'XP', value: `${profile.xp}`, inline: true },
            { name: 'Wins', value: `${profile.wins}`, inline: true },
            { name: 'Matches', value: `${profile.matches}`, inline: true },
            { name: 'Accuracy', value: `${profile.accuracy}%`, inline: true },
            { name: 'Market Tokens', value: `🪙 ${bundle.tokens}`, inline: true },
            { name: 'Login Streak', value: `🔥 ${bundle.daily.streak} day${bundle.daily.streak === 1 ? '' : 's'}`, inline: true }
          );
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'bb-level': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        const { levelInfo } = bundle.profile;
        const embed = baseEmbed(`${interaction.user.username}'s Level`).setDescription(
          `**Level ${levelInfo.level}**\n${progressBar(levelInfo.progress)}\n${levelInfo.xpIntoLevel}/${levelInfo.xpForNextLevel} XP to next level\n\nTotal XP: **${bundle.profile.xp}**`
        );
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'bb-rank': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        const { rank } = bundle.profile;
        const embed = baseEmbed(`${interaction.user.username}'s Rank`).setDescription(
          `**${rank.name}**\n` +
            (rank.nextRank
              ? `${progressBar(rank.progress)}\n${Math.round(rank.progress * 100)}% to **${rank.nextRank}** (${rank.nextXp} XP)`
              : '_Highest rank reached!_')
        );
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'bb-stats': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        const { profile, stats } = bundle;
        const embed = baseEmbed(`${interaction.user.username}'s Stats`).addFields(
          { name: 'Rank', value: rankLine(profile) },
          { name: 'Wins', value: `${profile.wins}`, inline: true },
          { name: 'Matches', value: `${profile.matches}`, inline: true },
          { name: 'Accuracy', value: `${profile.accuracy}%`, inline: true },
          { name: 'Speed', value: `${profile.speed} clicks/min`, inline: true },
          { name: 'Best Combo', value: `${stats?.bestCombo ?? 0}`, inline: true },
          { name: 'Powerups Used', value: `${stats?.powerupsUsed ?? 0}`, inline: true },
          { name: 'Multiplayer Wins', value: `${stats?.multiplayerWins ?? 0}`, inline: true },
          { name: 'Games Played', value: `${stats?.multiplayerGamesPlayed ?? 0}`, inline: true },
          { name: 'Playtime', value: formatSeconds(stats?.totalPlayTimeSeconds), inline: true }
        );
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'bb-achievements': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        const unlocked = bundle.achievements;
        const embed = baseEmbed(`${interaction.user.username}'s Achievements (${unlocked.length}/${Object.keys(ACHIEVEMENT_META).length})`);
        if (unlocked.length === 0) {
          embed.setDescription('No achievements unlocked yet — get out there and clear a level!');
        } else {
          embed.setDescription(
            unlocked
              .map((id) => ACHIEVEMENT_META[id])
              .filter(Boolean)
              .map((a) => `${a.icon} **${a.title}** _(${a.rarity})_`)
              .join('\n')
          );
        }
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'bb-titles': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        const { unlocked, current } = bundle.profile.titles;
        const embed = baseEmbed(`${interaction.user.username}'s Titles`).setDescription(
          `**Current: ${current.name}**\n\n` +
            TITLE_LADDER.map((t) => (unlocked.some((u) => u.id === t.id) ? `✅ ${t.name}` : `🔒 ${t.name}`)).join('\n')
        );
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'bb-coins': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        await interaction.reply({
          embeds: [baseEmbed(`${interaction.user.username}'s Tokens`).setDescription(`🪙 **${bundle.tokens}** Market Tokens`)],
        });
        break;
      }

      case 'bb-streak': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        await interaction.reply({
          embeds: [
            baseEmbed(`${interaction.user.username}'s Login Streak`).setDescription(
              `🔥 **${bundle.daily.streak}** day${bundle.daily.streak === 1 ? '' : 's'}\nTotal claims: ${bundle.daily.totalClaims}`
            ),
          ],
        });
        break;
      }

      case 'bb-daily': {
        const bundle = await requireProfile(interaction);
        if (!bundle) return;
        const today = new Date().toISOString().slice(0, 10);
        const available = bundle.daily.lastClaimDate !== today;
        await interaction.reply({
          embeds: [
            baseEmbed('Daily Reward').setDescription(
              available
                ? `✅ Ready to claim! Open Bam Baroh in Discord and hit the 🎁 Daily button on the main menu.`
                : `Already claimed today — current streak is 🔥 ${bundle.daily.streak} day${bundle.daily.streak === 1 ? '' : 's'}.`
            ),
          ],
          ephemeral: true,
        });
        break;
      }

      // ---- Leaderboards ---------------------------------------------------
      case 'bb-global':
      case 'bb-xpboard': {
        await interaction.deferReply();
        const entries = await fetchLeaderboard('xp', 10);
        await interaction.editReply({
          embeds: [leaderboardEmbed('🌐 Global XP Leaderboard', entries, { valueFn: (e) => `${e.xp} XP` })],
        });
        break;
      }

      case 'bb-levelboard': {
        await interaction.deferReply();
        const entries = await fetchLeaderboard('xp', 10);
        await interaction.editReply({
          embeds: [
            leaderboardEmbed('📈 Highest Levels', entries, { valueFn: (e) => `Lv ${e.levelInfo.level}` }),
          ],
        });
        break;
      }

      case 'bb-winboard': {
        await interaction.deferReply();
        const entries = await fetchLeaderboard('wins', 10);
        await interaction.editReply({
          embeds: [leaderboardEmbed('🏆 Most Wins', entries, { valueFn: (e) => `${e.wins} wins` })],
        });
        break;
      }

      case 'bb-streakboard': {
        await interaction.deferReply();
        const entries = await fetchLeaderboard('streak', 10);
        await interaction.editReply({
          embeds: [leaderboardEmbed('🔥 Longest Win Streaks', entries, { valueFn: (e) => `${e.bestWinStreak} streak` })],
        });
        break;
      }

      case 'bb-playtime': {
        await interaction.deferReply();
        const entries = await fetchLeaderboard('playtime', 10);
        await interaction.editReply({
          embeds: [
            leaderboardEmbed('⏱️ Most Playtime', entries, { valueFn: (e) => formatSeconds(e.totalPlayTimeSeconds) }),
          ],
        });
        break;
      }

      case 'bb-leaderboard': {
        await interaction.deferReply();
        if (!interaction.guild) {
          const entries = await fetchLeaderboard('xp', 10);
          await interaction.editReply({
            embeds: [leaderboardEmbed('🏆 Leaderboard', entries, { valueFn: (e) => `${e.xp} XP` })],
          });
          break;
        }
        try {
          const [members, allEntries] = await Promise.all([
            interaction.guild.members.fetch(),
            fetchLeaderboard('xp', 200),
          ]);
          const memberIds = new Set(members.keys());
          const scoped = allEntries.filter((e) => e.discordId && memberIds.has(e.discordId));
          await interaction.editReply({
            embeds: [
              leaderboardEmbed(`🏆 ${interaction.guild.name} Leaderboard`, scoped, { valueFn: (e) => `${e.xp} XP` }),
            ],
          });
        } catch {
          // Most likely the privileged GuildMembers intent isn't enabled for
          // this bot yet - fall back to the global board rather than error out.
          const entries = await fetchLeaderboard('xp', 10);
          await interaction.editReply({
            embeds: [
              leaderboardEmbed('🌐 Global Leaderboard', entries, { valueFn: (e) => `${e.xp} XP` }).setFooter({
                text: "Couldn't read this server's member list, showing the global board instead.",
              }),
            ],
          });
        }
        break;
      }

      // ---- Fun --------------------------------------------------------------
      case 'bb-foodfact':
        await interaction.reply({ embeds: [baseEmbed('🍽️ Food Fact').setDescription(pickRandom(FOOD_FACTS))] });
        break;
      case 'bb-randomdish':
        await interaction.reply({ embeds: [baseEmbed('🎲 Random Dish').setDescription(pickRandom(RANDOM_DISHES))] });
        break;
      case 'bb-tip':
        await interaction.reply({ embeds: [baseEmbed('💡 Tip').setDescription(pickRandom(TIPS))] });
        break;
      case 'bb-meme':
        await interaction.reply({ embeds: [baseEmbed('😂 Meme').setDescription(pickRandom(MEMES))] });
        break;

      default:
        await interaction.reply({ content: "That command isn't wired up yet.", ephemeral: true });
    }
  } catch (err) {
    console.error(`Error handling ${commandName}:`, err);
    const embed = errorEmbed(err.message || 'Unexpected error.');
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
