import { z } from 'zod';

export const TriviaEvent = z.object({
  options: z.array(z.string()).length(3),
  correctAnswerIndex: z.number(),
  explanation: z.string(),
});

export const TriviaWeek = z.object({
  questions: z.array(TriviaEvent).length(5)
});
