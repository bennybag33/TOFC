const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Handle modal submission
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'question_modal') {
        const userQuestion = interaction.fields.getTextInputValue('question_input');

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
          await interaction.reply('An error occurred while searching for your answer.');
        }
      }
      return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
  },
};
