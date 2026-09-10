import { SlashCommandBuilder } from 'discord.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export default {
  data: new SlashCommandBuilder()
    .setName('question')
    .setDescription('Ask a question and get an answer')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Your question')
        .setRequired(true)
    ),
  async execute(interaction) {
    const userQuestion = interaction.options.getString('query');
    
    try {
      const result = await pool.query(
        'SELECT answers FROM qa_pairs WHERE LOWER(questions) = LOWER($1)',
        [userQuestion]
      );
      
      if (result.rows.length > 0) {
        await interaction.reply(`**Q:** ${userQuestion}\n**A:** ${result.rows[0].answers}`);
      } else {
        await interaction.reply(`No answer found for: "${userQuestion}"`);
      }
    } catch (error) {
      console.error('Database error:', error);
      await interaction.reply('An error occurred.');
    }
  },
};
