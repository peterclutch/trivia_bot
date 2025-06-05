import { z } from 'zod';

export const TriviaEvent = z.object({
  theme: z.string(),
  options: z.array(z.string()).length(3),
  correctAnswer: z.string(),
  explanation: z.string(),
});
