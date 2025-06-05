import { app } from '../services/slackApp.js';
import { getQuestion, recordAnswer } from '../services/trivia.js';

export function registerLieCommand() {
  app.command('/lie', async ({ command, ack, respond, say }) => {
    await ack();
    const input = command.text.trim();
    if (!['1', '2', '3'].includes(input)) {
      await respond(`incorrect format. Please answer 1, 2, or 3.`);
      return;
    }

    const dateKey = new Date().toISOString().split('T')[0];
    const question = await getQuestion(dateKey);

    const hasSubmitted = question?.answers?.[command.user_id] !== undefined;
    if (hasSubmitted) {
      await respond("You've already submitted for today!");
      return;
    }

    const isCorrect = question?.correctAnswerIndex === parseInt(input) - 1;
    await recordAnswer(dateKey, command.user_id, isCorrect);

    await respond(`You answered: ${input}`);
    await say(`<@${command.user_id}> just locked in their answer!`);
  });
}
