import { z } from 'zod';
import { strings } from "@/strings";

export const playerMessageSchema = z.discriminatedUnion(strings.common.type, [
  z.object({ type: z.literal(strings.common.command), command: z.enum([strings.presenter.next, strings.presenter.previous, strings.presenter.black, strings.presenter.white, strings.presenter.resume, strings.presenter.restart]), slideId: z.string().optional() }),
  z.object({ type: z.literal(strings.presenter.state), slideId: z.string(), step: z.number(), startedAt: z.number(), blackout: z.enum([strings.presenter.black, strings.presenter.white]).nullable() }),
  z.object({ type: z.literal(strings.presenter.hello) }),
]);
export type PlayerMessage = z.infer<typeof playerMessageSchema>;
export const channelName = (id: string): string => `${strings.presenter.chapterPresenter}${id}`;
