import { awsLambdaReceiver } from '../services/slackApp.js';
import { registerLieCommand } from '../commands/lieCommand.js';
import { registerThemeCommand } from '../commands/themeCommand.js';
import { registerRevealCommand } from '../commands/revealCommand.js';
import { registerWinnersCommand } from '../commands/winnersCommand.js';

registerLieCommand();
registerThemeCommand();
registerRevealCommand();
registerWinnersCommand();

export const handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
