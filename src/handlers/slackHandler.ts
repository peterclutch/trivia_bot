import { awsLambdaReceiver } from '../services/slackApp.js';
import { registerLieCommand } from '../commands/lieCommand.js';
import { registerThemeCommand } from '../commands/themeCommand.js';

registerLieCommand();
registerThemeCommand();

export const handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
