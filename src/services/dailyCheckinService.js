import { logger } from '../utils/logger.js';

export async function sendDailyCheckin(client) {
  try {
    const channel = await client.channels.fetch(process.env.PREMIUM_CHANNEL_ID);

    if (!channel) {
      logger.error('Daily check-in: could not find the premium channel.');
      return;
    }

    const message = await channel.send({
      content: `How did we do today? <@&${process.env.PREMIUM_ROLE_ID}>`,
    });

    await message.react('🟢');
    await message.react('🔴');

    logger.info('Daily check-in message sent successfully.');
  } catch (error) {
    logger.error('Error sending daily check-in message:', error);
  }
}
