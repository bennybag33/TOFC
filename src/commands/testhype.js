import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { sendMorningHype } from '../services/morningHypeService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('testhype')
    .setDescription('Manually trigger the morning hype message (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.reply({
      content: 'Sending test hype message...',
      flags: ["Ephemeral"],
    });

    await sendMorningHype(interaction.client);
  },
};
