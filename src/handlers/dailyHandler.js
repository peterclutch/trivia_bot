import { app } from '../services/slackApp.js';
import { openai } from '../services/openAI.js';
import { zodTextFormat } from 'openai/helpers/zod';
import { TriviaEvent } from '../utils/validation.js';

export const daily = async () => {
  const channel = 'C08V66J0Q03'; // todo maybe not hardcode this

  const response = await openai.responses.parse({
    model: 'gpt-4.1',
    input: [
      { role: 'system', content: 'You are a trivia master creating questions for the game: Two Truths and a Lie' },
      {
        role: 'user',
        content: 'Generate a trivia question about cats. Return exactly two true statements and one false and explain why.',
      },
    ],
    text: {
      format: zodTextFormat(TriviaEvent, 'event'),
    },
  });
  const text = response.output_text;
  try {
    await app.client.chat.postMessage({ channel, text });
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
