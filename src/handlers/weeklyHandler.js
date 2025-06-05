import { app } from '../services/slackApp.js';
import { getWeeklyScores } from '../services/trivia.js';

export const weekly = async () => {
  const channel = 'C08V66J0Q03';
  const today = new Date();
  const scores = await getWeeklyScores(today);
  const entries = Object.entries(scores);
  if (entries.length === 0) {
    await app.client.chat.postMessage({
      channel,
      text: 'No trivia results recorded this week.',
    });
    return { statusCode: 200, body: 'OK' };
  }

  entries.sort((a, b) => b[1] - a[1]);
  const best = entries[0][1];
  const winners = entries.filter(([, s]) => s === best).map(([u]) => `<@${u}>`);

  await app.client.chat.postMessage({ channel, text: '*Weekly Trivia Results*' });
  for (const [userId, score] of entries) {
    await app.client.chat.postMessage({
      channel,
      text: `<@${userId}>: ${score}`,
    });
  }
  await app.client.chat.postMessage({
    channel,
    text: `:trophy: Winner${winners.length > 1 ? 's' : ''}: ${winners.join(', ')}`,
  });
  await app.client.chat.postMessage({ channel, text: '----------------------' });
  return { statusCode: 200, body: 'OK' };
};
