import { app } from '../services/slackApp.js';
import { getTheme, setTheme } from '../services/trivia.js';

export function registerThemeCommand() {
  app.command('/theme', async ({ command, ack, respond, say }) => {
    await ack();
    const theme = command.text.trim();
    if (!theme) {
      try {
        const current = await getTheme();
        if (current) {
          await respond(`Current theme is: *${current}*`);
        } else {
          await respond('No theme has been set yet.');
        }
      } catch (err) {
        console.error('DynamoDB read failed', err);
        await say("Sorry, I couldn't retrieve the theme. Please try again later.");
      }
      return;
    }

    try {
      await setTheme(theme);
      await say(`New theme: *${theme}*, set by <@${command.user_id}>`);
    } catch (err) {
      console.error('DynamoDB write failed', err);
      await respond("Oops, something went wrong.");
    }
  });
}
