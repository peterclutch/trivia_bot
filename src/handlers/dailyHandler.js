import { app } from '../services/slackApp.js';
import { openai } from '../services/openAI.js';
import { zodTextFormat } from 'openai/helpers/zod';
import { TriviaEvent } from '../utils/validation.js';
import { ddbDoc } from '../services/dynamodb.js';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export const daily = async () => {
  const channel = 'C08V66J0Q03'; // todo maybe not hardcode this

  const res = await ddbDoc.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { pk: channel },
      })
  );
  const theme = res.Item ? res.Item.theme : 'cats'; // Default to 'cats'

  const response = await openai.responses.parse({
    model: 'gpt-4.1',
    input: [
      { role: 'system', content: 'You are a trivia master creating questions for the game: Two Truths and a Lie. Do not make the answers too obvious, and ensure the correct answer has a random placement among the options.' },
      {
        role: 'user',
        content: `Generate a trivia question about ${theme}. Return exactly two true statements and one false and explain why.`,
      },
    ],
    text: {
      format: zodTextFormat(TriviaEvent, 'event'),
    },
  });
  const trivia = TriviaEvent.parse(JSON.parse(response.output_text));
  const dateKey = new Date().toISOString().split('T')[0];
  await ddbDoc.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        pk: `question:${dateKey}`,
        ...trivia,
      },
    })
  );
  try {
    await app.client.chat.postMessage({ channel, text: `Here is your daily trivia question for *${new Date().toISOString().split('T')[0]}*:` });
    await app.client.chat.postMessage({ channel, text: `*Which of the following statements about ${trivia.theme.toLowerCase()} is NOT true?*` });
    await app.client.chat.postMessage({ channel, text: `*1)* ${trivia.options[0]}` });
    await app.client.chat.postMessage({ channel, text: `*2)* ${trivia.options[1]}` });
    await app.client.chat.postMessage({ channel, text: `*3)* ${trivia.options[2]}` });
    await app.client.chat.postMessage({ channel, text: `_Type /false 1, 2 or 3 into the channel to submit (you can only submit your answer once)_` });
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
