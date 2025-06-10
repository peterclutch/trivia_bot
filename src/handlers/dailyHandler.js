import { app } from '../services/slackApp.js';
import {
  generateWeekQuestions,
  getQuestion, getWeeklyScores,
  storeQuestion,
  weekStart,
} from '../services/trivia.js';
import {getTheme} from "../services/theme.js";

const DEFAULT_THEME = 'cats';

export const daily = async () => {
  const day = new Date().getDay();
  if (day === 1) { // Monday
    await prepareWeeklyQuestions();
  }
  if (day >= 2 && day <= 6) { // Tuesday-saturday
    await postYesterdayResults();
  }
  if (day >= 1 && day <= 5) { // Monday-friday
    await postTriviaQuestion();
  }
  if (day === 6) { // Saturday
    await postWeeklyResults();
  }
  return { statusCode: 200, body: 'OK' };
};

export async function postYesterdayResults() {
  const today = new Date();
  const yesterdayKey = new Date(today.getTime() - 86400000)
      .toISOString()
      .split('T')[0];
  const yesterdayQuestion = await getQuestion(yesterdayKey);
  if (!yesterdayQuestion) {
    return;
  }
  const lines = [
    'Yesterdays answer:',
    `*${yesterdayQuestion.correctAnswerIndex + 1}) ${yesterdayQuestion.options[yesterdayQuestion.correctAnswerIndex]}*`,
    `_${yesterdayQuestion.explanation}_`,
  ];
  for (const userId in yesterdayQuestion.answers) {
    const correct = yesterdayQuestion.answers[userId];
    lines.push(`<@${userId}> ${correct ? '🟢' : '🔴'}`);
  }
  lines.push('----------------------------');
  await app.client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID,
    text: lines.join('\n'),
  });
}

export async function postTriviaQuestion() {
  const dateKey = new Date().toISOString().split('T')[0];
  let trivia = await getQuestion(dateKey);

  const lines = [
    `Here is your daily trivia question for *${new Date()
        .toISOString()
        .split('T')[0]}*:`,
    `*Which of the following statements about ${trivia.theme.toLowerCase()} is NOT true?*`,
    `*1)* ${trivia.options[0]}`,
    `*2)* ${trivia.options[1]}`,
    `*3)* ${trivia.options[2]}`,
    '_Type /lie 1, 2 or 3 into the channel to submit (you can only submit your answer once)_',
  ];

  await app.client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID,
    text: lines.join('\n'),
  });
}

export async function prepareWeeklyQuestions() {
  const theme = await getTheme();
  const mondayKey = weekStart();
  const questions = await generateWeekQuestions(theme);
  const monday = new Date(mondayKey);
  for (let i = 0; i < questions.length; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().split('T')[0];
    await storeQuestion(key, questions[i], theme);
  }

  const channel = process.env.SLACK_CHANNEL_ID;
  await app.client.chat.postMessage({
    channel,
    text: `A new week of trivia starts now. The theme is *${theme}*!`,
  });
}

export async function postWeeklyResults() {
  const channel = process.env.SLACK_CHANNEL_ID;
  const entries = await getWeeklyScores();
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

  const lines = ['*Weekly results*'];

  for (const [userId, data] of entries) {
    lines.push(`<@${userId}>: ${data.score}/${data.attempts} attempts`);
  }

  lines.push(`:trophy: Winner${winners.length > 1 ? 's' : ''}: ${winners.join(', ')}`);
  lines.push('----------------------');

  await app.client.chat.postMessage({
    channel,
    text: lines.join('\n'),
  });
}
