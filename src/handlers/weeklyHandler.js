import { app } from '../services/slackApp.js';
import { getWeeklyScores, getQuestion } from '../services/trivia.js';
import { postYesterdayResults } from './dailyHandler.js';

export const weekly = async () => {
  const channel = process.env.SLACK_CHANNEL_ID;
  const today = new Date();
  const yesterdayKey = new Date(today.getTime() - 86400000)
    .toISOString()
    .split('T')[0];
  const yesterdayRecord = await getQuestion(yesterdayKey);
  if (yesterdayRecord) {
    await postYesterdayResults(channel, yesterdayRecord);
  }
  const entries = await getWeeklyScores(today);
  if (entries.length === 0) {
    await app.client.chat.postMessage({
      channel,
      text: 'No trivia results recorded this week.',
    });
    return { statusCode: 200, body: 'OK' };
  }

  // Sort by score descending
  entries.sort((a, b) => b[1].score - a[1].score);

  const bestScore = entries[0][1].score;
  const winners = entries
      .filter(([, data]) => data.score === bestScore)
      .map(([userId]) => `<@${userId}>`);

  // Announce weekly results
  await app.client.chat.postMessage({ channel, text: '*Weekly results*' });

  for (const [userId, data] of entries) {
    await app.client.chat.postMessage({
      channel,
      text: `<@${userId}>: ${data.score}/${data.attempts} attempts`,
    });
  }

  await app.client.chat.postMessage({
    channel,
    text: `:trophy: Winner${winners.length > 1 ? 's' : ''}: ${winners.join(', ')}`,
  });
  await app.client.chat.postMessage({ channel, text: '----------------------' });
  return { statusCode: 200, body: 'OK' };
};
