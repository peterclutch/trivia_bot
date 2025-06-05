import { awsLambdaReceiver } from '../services/slackApp.js';
import { registerFalseCommand } from '../commands/falseCommand.js';
import { registerThemeCommand } from '../commands/themeCommand.js';

registerFalseCommand();
registerThemeCommand();

export const handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
