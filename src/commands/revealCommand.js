import { app } from '../services/slackApp.js';
import { postTodaysResults } from '../handlers/dailyHandler.js';

export function registerRevealCommand() {
  app.command('/reveal', async ({ ack, respond }) => {
    await ack();
    try {
      await postTodaysResults();
    } catch (err) {
      console.error('Reveal command failed', err);
      await respond("Sorry, I couldn't reveal the answer.");
    }
  });
}
