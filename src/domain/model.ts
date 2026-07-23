import { z } from 'zod';

const TimestampSchema = z.string().datetime({ offset: true });
const EntityIdSchema = z.string().min(1);
const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid event date.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Use a valid event date.');

function isValidScore(score: { a: number; b: number }, target: number, winBy: number) {
  if (score.a === score.b) return false;
  const winner = Math.max(score.a, score.b);
  const loser = Math.min(score.a, score.b);
  return (
    winner >= target && winner - loser >= winBy && (winner === target || winner - loser === winBy)
  );
}

export const ScoringRulesSchema = z.object({
  target: z.number().int().min(1).max(99),
  winBy: z.number().int().min(1).max(10),
});
export const PlayerSchema = z.object({
  id: EntityIdSchema,
  name: z.string().trim().min(1),
  rating: z.number().min(1).max(8),
  archived: z.boolean(),
  createdAt: TimestampSchema,
});
export const TeamSchema = z
  .tuple([EntityIdSchema, EntityIdSchema])
  .refine(([a, b]) => a !== b, 'Teammates must be different');
export const ScoreSchema = z.object({ a: z.number().int().min(0), b: z.number().int().min(0) });
export const ResultRevisionSchema = z.object({
  score: ScoreSchema,
  recordedAt: TimestampSchema,
  reason: z.string().optional(),
});
export const ResultSchema = z.object({
  score: ScoreSchema,
  recordedAt: TimestampSchema,
});
export const MatchSchema = z
  .object({
    id: EntityIdSchema,
    court: z.number().int().min(1),
    teamA: TeamSchema,
    teamB: TeamSchema,
    result: ResultSchema.nullable(),
    correctionHistory: z.array(ResultRevisionSchema).default([]),
  })
  .refine(
    (m) => new Set([...m.teamA, ...m.teamB]).size === 4,
    'A match requires four distinct players',
  );
export const WaveSchema = z
  .object({
    id: EntityIdSchema,
    matches: z.array(MatchSchema).min(1, 'A wave requires at least one match.'),
    byes: z.array(EntityIdSchema),
  })
  .refine(
    (wave) => new Set(wave.matches.map((match) => match.court)).size === wave.matches.length,
    'A court can host only one match per wave.',
  );
export const StageSchema = z.object({
  id: EntityIdSchema,
  name: z.string().trim().min(1),
  status: z.enum(['planned', 'active', 'completed']),
  waves: z.array(WaveSchema).min(1, 'A stage requires at least one wave.'),
});
export const EventSchema = z.object({
  id: EntityIdSchema,
  name: z.string().trim().min(1),
  date: LocalDateSchema,
  courtCount: z.number().int().min(1).max(50),
  status: z.enum(['active', 'completed']),
  scoring: ScoringRulesSchema,
  checkedIn: z.array(EntityIdSchema),
  stages: z.array(StageSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export const AppDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    players: z.array(PlayerSchema),
    events: z.array(EventSchema),
  })
  .superRefine((data, context) => {
    const playerIds = new Set(data.players.map((player) => player.id));
    if (playerIds.size !== data.players.length) {
      context.addIssue({ code: 'custom', message: 'Player IDs must be unique.' });
    }
    const eventIds = new Set(data.events.map((event) => event.id));
    if (eventIds.size !== data.events.length) {
      context.addIssue({ code: 'custom', message: 'Event IDs must be unique.' });
    }
    for (const event of data.events) {
      const checkedIn = new Set(event.checkedIn);
      if (checkedIn.size !== event.checkedIn.length) {
        context.addIssue({ code: 'custom', message: `${event.name} has duplicate check-ins.` });
      }
      for (const playerId of checkedIn) {
        if (!playerIds.has(playerId)) {
          context.addIssue({
            code: 'custom',
            message: `${event.name} references an unknown player.`,
          });
        }
      }
      const nestedIds = new Set<string>();
      if (event.stages.filter((stage) => stage.status === 'active').length > 1) {
        context.addIssue({ code: 'custom', message: `${event.name} has multiple active stages.` });
      }
      if (
        event.status === 'completed' &&
        event.stages.some((stage) => stage.status !== 'completed')
      ) {
        context.addIssue({
          code: 'custom',
          message: `${event.name} is completed but has an unfinished stage.`,
        });
      }
      for (const stage of event.stages) {
        const stageMatches = stage.waves.flatMap((wave) => wave.matches);
        if (stage.status === 'planned' && stageMatches.some((match) => match.result)) {
          context.addIssue({
            code: 'custom',
            message: `${stage.name} has results before it started.`,
          });
        }
        if (stage.status === 'completed' && stageMatches.some((match) => !match.result)) {
          context.addIssue({ code: 'custom', message: `${stage.name} has incomplete results.` });
        }
        for (const id of [stage.id, ...stage.waves.map((wave) => wave.id)]) {
          if (nestedIds.has(id)) {
            context.addIssue({
              code: 'custom',
              message: `${event.name} has duplicate entity IDs.`,
            });
          }
          nestedIds.add(id);
        }
        for (const wave of stage.waves) {
          const scheduled = [
            ...wave.matches.flatMap((match) => [...match.teamA, ...match.teamB]),
            ...wave.byes,
          ];
          if (new Set(scheduled).size !== scheduled.length) {
            context.addIssue({
              code: 'custom',
              message: `${stage.name} schedules a player twice.`,
            });
          }
          for (const playerId of scheduled) {
            if (!checkedIn.has(playerId)) {
              context.addIssue({
                code: 'custom',
                message: `${stage.name} references a player who is not checked in.`,
              });
            }
          }
          for (const match of wave.matches) {
            if (nestedIds.has(match.id)) {
              context.addIssue({
                code: 'custom',
                message: `${event.name} has duplicate entity IDs.`,
              });
            }
            nestedIds.add(match.id);
            if (match.court > event.courtCount) {
              context.addIssue({
                code: 'custom',
                message: `${stage.name} uses an unavailable court.`,
              });
            }
            if (
              match.result &&
              !isValidScore(match.result.score, event.scoring.target, event.scoring.winBy)
            ) {
              context.addIssue({
                code: 'custom',
                message: `${stage.name} contains an invalid score.`,
              });
            }
            if (
              match.correctionHistory.some(
                (revision) =>
                  !isValidScore(revision.score, event.scoring.target, event.scoring.winBy),
              )
            ) {
              context.addIssue({
                code: 'custom',
                message: `${stage.name} contains an invalid score history.`,
              });
            }
          }
        }
      }
    }
  });
export type AppData = z.infer<typeof AppDataSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type Score = z.infer<typeof ScoreSchema>;
