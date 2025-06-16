import { app } from '../services/slackApp.js';
import { postTodaysResults } from '../handlers/dailyHandler.js';

export function registerRevealCommand() {
  app.command('/reveal', async ({ ack, respond }) => {
    await ack();
    try {
      await postTodaysResults();
      await respond("Revealing today's answer to the channel...");
    } catch (err) {
      console.error('Reveal command failed', err);
      await respond("Sorry, I couldn't reveal the answer.");
    }
  });
}
