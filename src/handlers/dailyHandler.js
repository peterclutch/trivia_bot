import { app } from '../services/slackApp.js';
import { ddbDoc } from '../services/dynamodb.js';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  generateQuestion,
  getQuestion,
  storeQuestion,
} from '../services/trivia.js';

const DEFAULT_THEME = 'cats';

export const daily = async () => {
  const channel = 'C08V66J0Q03'; // todo maybe not hardcode this
  const dateKey = new Date().toISOString().split('T')[0];
  const yesterdayKey = new Date(Date.now() - 86400000)
    .toISOString()
    .split('T')[0];

  const yesterdayRecord = await getQuestion(yesterdayKey);
  if (yesterdayRecord) {
    await postYesterdayResults(channel, yesterdayRecord);
  }

  const res = await ddbDoc.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { pk: channel },
    }),
  );
  const theme = res.Item ? res.Item.theme : DEFAULT_THEME;

  const trivia = await generateQuestion(theme);
  await storeQuestion(dateKey, trivia, theme);

  await postTriviaQuestion(channel, trivia, theme);
  return { statusCode: 200, body: 'OK' };
};

async function postYesterdayResults(channel, record) {
  await app.client.chat.postMessage({
    channel,
    text: `The answer for yesterday's question is: *${record.options[record.correctAnswerIndex]}*`,
  });
  await app.client.chat.postMessage({ channel, text: `_${record.explanation}_` });
  for (const userId in record.answers) {
    const correct = record.answers[userId];
    await app.client.chat.postMessage({
      channel,
      text: `<@${userId}> answered: ${correct ? '🟢' : '🔴'}`,
    });
  }
  await app.client.chat.postMessage({ channel, text: '----------------------------' });
}

async function postTriviaQuestion(channel, trivia, theme) {
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
    text: '_Type /false 1, 2 or 3 into the channel to submit (you can only submit your answer once)_',
  });
}
