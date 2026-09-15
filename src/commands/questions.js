import { SlashCommandBuilder } from 'discord.js';
import { Pool } from 'pg';
const pool = new Pool({
 connectionString: process.env.POSTGRES_URL,
});

const ROOKIE_DAILY_LIMIT = 10;

function levenshteinDistance(str1, str2) {
 const track = Array(str2.length + 1).fill(null).map(() =>
 Array(str1.length + 1).fill(null));
 
 for (let i = 0; i <= str1.length; i += 1) {
 track[0][i] = i;
 }
 for (let j = 0; j <= str2.length; j += 1) {
 track[j][0] = j;
 }
 
 for (let j = 1; j <= str2.length; j += 1) {
 for (let i = 1; i <= str1.length; i += 1) {
 const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
 track[j][i] = Math.min(
 track[j][i - 1] + 1,
 track[j - 1][i] + 1,
 track[j - 1][i - 1] + indicator
 );
 }
 }
 
 return track[str2.length][str1.length];
}

function calculateSimilarity(str1, str2) {
 const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
 const maxLength = Math.max(str1.length, str2.length);
 return 1 - distance / maxLength;
}

function getKeywords(text) {
 return text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
}

function calculateKeywordOverlap(userWords, dbWords) {
 const matches = userWords.filter(word => dbWords.some(dbWord => calculateSimilarity(word, dbWord) > 0.7));
 return matches.length / Math.max(userWords.length, dbWords.length);
}

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
 const userKeywords = getKeywords(userQuestion);
 const userId = interaction.user.id;

 const hasPremiumRole = interaction.member.roles.cache.has(process.env.PREMIUM_ROLE_ID);
 const isInPremiumChannel = interaction.channelId === process.env.PREMIUM_CHANNEL_ID;
 const canSeePremium = hasPremiumRole && isInPremiumChannel;

 try {
 // Enforce daily limit for non-premium users only
 if (!hasPremiumRole) {
 const usageResult = await pool.query(
 'SELECT count, last_reset FROM question_usage WHERE user_id = $1',
 [userId]
 );

 const today = new Date().toISOString().slice(0, 10);

 if (usageResult.rows.length === 0) {
 // First time this user has ever asked - create their row
 await pool.query(
 'INSERT INTO question_usage (user_id, count, last_reset) VALUES ($1, 1, $2)',
 [userId, today]
 );
 } else {
 const { count, last_reset } = usageResult.rows[0];
 const lastResetDate = new Date(last_reset).toISOString().slice(0, 10);

 if (lastResetDate !== today) {
 // New day - reset their count to 1 (this question counts as the first)
 await pool.query(
 'UPDATE question_usage SET count = 1, last_reset = $1 WHERE user_id = $2',
 [today, userId]
 );
 } else if (count >= ROOKIE_DAILY_LIMIT) {
 await interaction.reply({
 content: `🚫 You've reached your daily limit of ${ROOKIE_DAILY_LIMIT} questions. Your limit resets tomorrow, or upgrade to Premium for unlimited questions!`,
 flags: ["Ephemeral"],
 });
 return;
 } else {
 await pool.query(
 'UPDATE question_usage SET count = count + 1 WHERE user_id = $1',
 [userId]
 );
 }
 }
 }

 const result = canSeePremium
 ? await pool.query('SELECT questions, answers FROM qa_pairs')
 : await pool.query("SELECT questions, answers FROM qa_pairs WHERE tier = 'Rookie'");
 
 if (result.rows.length === 0) {
 await interaction.reply('No Q&A pairs found in database.');
 return;
 }
 
 let bestMatch = null;
 let bestScore = 0;
 
 for (const row of result.rows) {
 const dbKeywords = getKeywords(row.questions);
 const keywordScore = calculateKeywordOverlap(userKeywords, dbKeywords);
 const levenScore = calculateSimilarity(userQuestion, row.questions);
 const combinedScore = (keywordScore * 0.6) + (levenScore * 0.4);
 
 if (combinedScore > bestScore) {
 bestScore = combinedScore;
 bestMatch = row;
 }
 }
 
 if (bestScore >= 0.5) {
 await interaction.reply(`**Q:** ${bestMatch.questions}\n**A:** ${bestMatch.answers}`);
 } else {
 await interaction.reply(`No similar question found. Try rewording your question or request assistance from a staff member!`);

 try {
 const logChannel = await interaction.client.channels.fetch(process.env.LOG_CHANNEL_ID);

 if (logChannel) {
 await logChannel.send(
 `📋 **Unanswered Question**\n**User:** <@${interaction.user.id}>\n**Question:** ${userQuestion}\n**Best score:** ${bestScore.toFixed(2)}${bestMatch ? `\n**Closest match:** ${bestMatch.questions}` : ''}`
 );
 } else {
 console.error('Could not find #auto-mod channel to log failed question.');
 }
 } catch (logError) {
 console.error('Error logging failed question:', logError);
 }
 }
 } catch (error) {
 console.error('Database error:', error);
 await interaction.reply('An error occurred.');
 }
 },
};
