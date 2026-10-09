import { z } from 'zod';
export const playerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('command'), command: z.enum(['next', 'previous', 'black', 'white', 'resume', 'restart']), slideId: z.string().optional() }),
  z.object({ type: z.literal('state'), slideId: z.string(), step: z.number(), startedAt: z.number(), blackout: z.enum(['black', 'white']).nullable() }),
  z.object({ type: z.literal('hello') }),
]);
export type PlayerMessage = z.infer<typeof playerMessageSchema>;
export const channelName = (id: string): string => `chapter-presenter-${id}`;
