const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('question')
    .setDescription('Ask a question and get an answer'),
  async execute(interaction) {
    // Create a modal (dialog box)
    const modal = new ModalBuilder()
      .setCustomId('question_modal')
      .setTitle('Ask a Question');

    const questionInput = new TextInputBuilder()
      .setCustomId('question_input')
      .setLabel('What is your question?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., What is price action?')
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(questionInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },
};
