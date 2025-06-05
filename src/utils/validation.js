import { z } from 'zod';

export const TriviaEvent = z.object({
  question: z.string(),
  theme: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string(),
});
