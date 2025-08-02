import { app } from '../services/slackApp.js';
import { getWinnersHistory } from '../services/trivia.js';

export function registerWinnersCommand() {
  app.command('/winners', async ({ ack, respond }) => {
    await ack();
    const history = await getWinnersHistory();
    const weekKeys = Object.keys(history).sort();
    if (weekKeys.length === 0) {
      await respond('No winners have been recorded yet.');
      return;
    }

    const lines = ['*Past Winners*'];
    for (const wk of weekKeys) {
      const entry = history[wk];
      const winners = (entry.winners || []).map(id => `<@${id}>`).join(', ');
      lines.push(`${wk} – ${entry.theme || 'unknown'} – ${winners}`);
    }

    await respond(lines.join('\n'));
  });
}

