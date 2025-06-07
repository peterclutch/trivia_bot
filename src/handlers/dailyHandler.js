import { app } from '../services/slackApp.js';
import { ddbDoc } from '../services/dynamodb.js';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  generateQuestion,
  generateWeekQuestions,
  getQuestion,
  storeQuestion,
  weekStart,
} from '../services/trivia.js';

const DEFAULT_THEME = 'cats';

export const daily = async () => {
  const channel = process.env.SLACK_CHANNEL_ID;
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  const yesterdayKey = new Date(today.getTime() - 86400000)
    .toISOString()
    .split('T')[0];

  const yesterdayRecord = await getQuestion(yesterdayKey);
  if (yesterdayRecord) {
    await postYesterdayResults(channel, yesterdayRecord);
  }

  const res = await ddbDoc.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { pk: 'theme' },
    }),
  );
  const theme = res.Item ? res.Item.theme : DEFAULT_THEME;

  if (today.getDay() === 1) { // Monday
    await prepareWeeklyQuestions(today, theme);
  }

  let trivia = await getQuestion(dateKey);
  if (!trivia) {
    trivia = await generateQuestion(theme);
    await storeQuestion(dateKey, trivia, theme);
  }

  await postTriviaQuestion(channel, trivia, trivia.theme);
  return { statusCode: 200, body: 'OK' };
};

export async function postYesterdayResults(channel, record) {
  await app.client.chat.postMessage({
    channel,
    text: 'Yesterdays answer:',
  });
  await app.client.chat.postMessage({
    channel,
    text: `*${record.correctAnswerIndex + 1}) ${record.options[record.correctAnswerIndex]}*`,
  });
  await app.client.chat.postMessage({ channel, text: `_${record.explanation}_` });
  for (const userId in record.answers) {
    const correct = record.answers[userId];
    await app.client.chat.postMessage({
      channel,
      text: `<@${userId}> ${correct ? '🟢' : '🔴'}`,
    });
  }
  await app.client.chat.postMessage({ channel, text: '----------------------------' });
}

export async function postTriviaQuestion(channel, trivia, theme) {
  await app.client.chat.postMessage({
    channel,
    text: `Here is your daily trivia question for *${new Date()
      .toISOString()
      .split('T')[0]}*:`,
  });
  await app.client.chat.postMessage({
    channel,
    text: `*Which of the following statements about ${theme.toLowerCase()} is NOT true?*`,
  });
  await app.client.chat.postMessage({ channel, text: `*1)* ${trivia.options[0]}` });
  await app.client.chat.postMessage({ channel, text: `*2)* ${trivia.options[1]}` });
  await app.client.chat.postMessage({ channel, text: `*3)* ${trivia.options[2]}` });
  await app.client.chat.postMessage({
    channel,
    text: '_Type /lie 1, 2 or 3 into the channel to submit (you can only submit your answer once)_',
  });
}

async function prepareWeeklyQuestions(today, theme) {
  const mondayKey = weekStart(today);
  const exists = await getQuestion(mondayKey);
  if (exists) return;
  const questions = await generateWeekQuestions(theme);
  const monday = new Date(mondayKey);
  for (let i = 0; i < questions.length; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().split('T')[0];
    await storeQuestion(key, questions[i], theme);
  }
}
