import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { sendDailyCheckin } from '../services/dailyCheckinService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('testcheckin')
    .setDescription('Manually trigger the daily check-in message (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.reply({
      content: 'Sending test check-in message...',
      flags: ["Ephemeral"],
    });

    await sendDailyCheckin(interaction.client);
  },
};
