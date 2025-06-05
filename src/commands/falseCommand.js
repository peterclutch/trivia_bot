import { app } from '../services/slackApp.js';

export function registerFalseCommand() {
  app.command('/false', async ({ command, ack, respond, say }) => {
    await ack();
    const input = command.text.trim();
    if (!['1', '2', '3'].includes(input)) {
      await respond(`incorrect format. Please answer 1, 2, or 3.`);
      return;
    }
    await respond(`Your answer: ${input}`);
    await say(`<@${command.user_id}> just locked in their answer!`);
  });
}
