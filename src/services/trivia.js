import { ddbDoc } from './dynamodb.js';
import { openai } from './openAI.js';
import { zodTextFormat } from 'openai/helpers/zod';
import { TriviaEvent } from '../utils/validation.js';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

function weekStart(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export async function getQuestion(dateKey) {
  const res = await ddbDoc.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk: `question:${dateKey}` },
  }));
  return res.Item;
}

export async function storeQuestion(dateKey, trivia, theme) {
  await ddbDoc.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: `question:${dateKey}`,
      ...trivia,
      theme,
      answers: {},
    },
  }));
}

export async function recordAnswer(dateKey, userId, isCorrect) {
  await ddbDoc.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk: `question:${dateKey}` },
    UpdateExpression: 'SET #answers.#userId = :correct',
    ExpressionAttributeNames: {
      '#answers': 'answers',
      '#userId': userId,
    },
    ExpressionAttributeValues: {
      ':correct': isCorrect,
    },
  }));

  if (isCorrect) {
    const weekKey = weekStart(dateKey);
    await ddbDoc.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { pk: `score:${weekKey}` },
        UpdateExpression:
          'SET #scores.#userId = if_not_exists(#scores.#userId, :zero) + :one',
        ExpressionAttributeNames: {
          '#scores': 'scores',
          '#userId': userId,
        },
        ExpressionAttributeValues: {
          ':one': 1,
          ':zero': 0,
        },
      }),
    );
  }
}

export async function generateQuestion(theme) {
  const response = await openai.responses.parse({
    model: 'gpt-4.1',
    temperature: 1,
    input: [
      { role: 'system', content: 'You are a trivia master creating questions for the game: Two Truths and a Lie. Do not make the answers too obvious, and ensure the correct answer has a random placement among the options.' },
      {
        role: 'user',
        content: `Generate a trivia question about ${theme}. Return exactly two true statements and one false and explain why. While keeping the facts factual, avoid using the same facts that were used on previous prompts.`,
      },
    ],
    text: {
      format: zodTextFormat(TriviaEvent, 'event'),
    },
  });
  return TriviaEvent.parse(JSON.parse(response.output_text));
}

export async function getTheme(channel) {
  const res = await ddbDoc.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk: channel },
  }));
  return res.Item ? res.Item.theme : null;
}

export async function setTheme(channel, theme) {
  await ddbDoc.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: channel,
      theme,
      updatedAt: new Date().toISOString(),
    },
  }));
}

export async function getWeeklyScores(dateInput) {
  const weekKey = weekStart(dateInput);
  const res = await ddbDoc.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { pk: `score:${weekKey}` },
    }),
  );
  return res.Item ? res.Item.scores || {} : {};
}
