import { AppDataSchema, type AppData, type Event, type Player, type Score } from '../domain/model';
import {
  assertWritable,
  balancedStage,
  deleteResult,
  saveResult,
  transitionStage,
  type Clock,
  type Id,
} from '../domain/core';
export type Command =
  | { type: 'addPlayer'; name: string; rating: number }
  | { type: 'editPlayer'; id: string; name: string; rating: number }
  | { type: 'toggleArchive'; id: string }
  | {
      type: 'createEvent';
      name: string;
      date: string;
      courts: number;
      target: number;
      winBy: number;
    }
  | {
      type: 'updateEvent';
      id: string;
      name: string;
      date: string;
      courts: number;
      target: number;
      winBy: number;
    }
  | { type: 'deleteEvent'; id: string }
  | { type: 'reopenEvent'; id: string }
  | { type: 'completeEvent'; id: string }
  | { type: 'toggleCheckIn'; eventId: string; playerId: string }
  | { type: 'addBalancedStage'; eventId: string; name: string }
  | { type: 'startStage'; eventId: string; stageId: string }
  | { type: 'completeStage'; eventId: string; stageId: string }
  | { type: 'saveScore'; eventId: string; matchId: string; score: Score }
  | { type: 'deleteScore'; eventId: string; matchId: string }
  | {
      type: 'assignMatch';
      eventId: string;
      matchId: string;
      court: number;
      players: [string, string, string, string];
    };
export function execute(data: AppData, c: Command, id: Id, clock: Clock): AppData {
  return AppDataSchema.parse(executeCommand(data, c, id, clock));
}

function executeCommand(data: AppData, c: Command, id: Id, clock: Clock): AppData {
  const now = clock();
  if (c.type === 'addPlayer')
    return {
      ...data,
      players: [
        ...data.players,
        { id: id(), name: c.name, rating: c.rating, archived: false, createdAt: now },
      ],
    };
  if (c.type === 'editPlayer') {
    requirePlayer(data.players, c.id);
    return {
      ...data,
      players: data.players.map((p) =>
        p.id === c.id ? { ...p, name: c.name, rating: c.rating } : p,
      ),
    };
  }
  if (c.type === 'toggleArchive') {
    requirePlayer(data.players, c.id);
    return {
      ...data,
      players: data.players.map((p) => (p.id === c.id ? { ...p, archived: !p.archived } : p)),
    };
  }
  if (c.type === 'createEvent') {
    const event: Event = {
      id: id(),
      name: c.name,
      date: c.date,
      courtCount: c.courts,
      status: 'active',
      scoring: { target: c.target, winBy: c.winBy },
      checkedIn: [],
      stages: [],
      createdAt: now,
      updatedAt: now,
    };
    return { ...data, events: [...data.events, event] };
  }
  if (c.type === 'updateEvent') {
    const event = requireEvent(data, c.id);
    assertWritable(event);
    const hasResults = event.stages.some((stage) =>
      stage.waves.some((wave) => wave.matches.some((match) => match.result)),
    );
    if (hasResults && (c.target !== event.scoring.target || c.winBy !== event.scoring.winBy)) {
      throw Error('Scoring rules cannot change after a score has been recorded.');
    }
    return {
      ...data,
      events: data.events.map((e) =>
        e.id === c.id
          ? {
              ...e,
              name: c.name,
              date: c.date,
              courtCount: c.courts,
              scoring: { target: c.target, winBy: c.winBy },
              updatedAt: now,
            }
          : e,
      ),
    };
  }
  if (c.type === 'deleteEvent') {
    requireEvent(data, c.id);
    return { ...data, events: data.events.filter((e) => e.id !== c.id) };
  }
  const event = requireEvent(data, 'eventId' in c ? c.eventId : c.id);
  if (c.type === 'reopenEvent') {
    if (event.status !== 'completed') throw Error('Only a completed event can be reopened.');
    return replace(data, { ...event, status: 'active', updatedAt: now });
  }
  assertWritable(event);
  if (c.type === 'completeEvent') {
    if (event.stages.some((stage) => stage.status !== 'completed')) {
      throw Error('Complete every stage before completing this event.');
    }
    return replace(data, { ...event, status: 'completed', updatedAt: now });
  }
  if (c.type === 'toggleCheckIn') {
    const player = requirePlayer(data.players, c.playerId);
    if (
      event.checkedIn.includes(c.playerId) &&
      event.stages.some((stage) =>
        stage.waves.some((wave) =>
          wave.matches.some((match) => [...match.teamA, ...match.teamB].includes(c.playerId)),
        ),
      )
    ) {
      throw Error('A scheduled player cannot be checked out.');
    }
    if (!event.checkedIn.includes(c.playerId) && player.archived) {
      throw Error('Restore this player before checking them in.');
    }
    return replace(data, {
      ...event,
      checkedIn: event.checkedIn.includes(c.playerId)
        ? event.checkedIn.filter((x) => x !== c.playerId)
        : [...event.checkedIn, c.playerId],
      updatedAt: now,
    });
  }
  if (c.type === 'addBalancedStage')
    return replace(data, {
      ...event,
      stages: [
        ...event.stages,
        balancedStage(c.name, event.checkedIn, data.players, event.courtCount, id),
      ],
      updatedAt: now,
    });
  if (c.type === 'startStage' || c.type === 'completeStage') {
    requireStage(event, c.stageId);
    if (
      c.type === 'startStage' &&
      event.stages.some((stage) => stage.status === 'active' && stage.id !== c.stageId)
    ) {
      throw Error('Complete the active stage before starting another.');
    }
    return replace(data, {
      ...event,
      stages: event.stages.map((s) =>
        s.id === c.stageId
          ? transitionStage(s, c.type === 'startStage' ? 'active' : 'completed')
          : s,
      ),
      updatedAt: now,
    });
  }
  if (c.type === 'assignMatch') {
    const { match, stage } = requireMatch(event, c.matchId);
    if (stage.status !== 'planned')
      throw Error('Assignments can only change before a stage starts.');
    if (match.result) throw Error('Delete the score before changing this match.');
    if (new Set(c.players).size !== 4) throw Error('Choose four different players.');
    if (c.players.some((playerId) => !event.checkedIn.includes(playerId))) {
      throw Error('Every assigned player must be checked in.');
    }
    if (!Number.isInteger(c.court) || c.court < 1 || c.court > event.courtCount) {
      throw Error(`Court must be between 1 and ${event.courtCount}.`);
    }
    return replace(data, {
      ...event,
      stages: event.stages.map((s) => ({
        ...s,
        waves: s.waves.map((w) => {
          const edited = w.matches.find((candidate) => candidate.id === c.matchId);
          if (!edited) return w;
          const nextPlayers = new Set(c.players);
          const playersLeavingMatch = [...edited.teamA, ...edited.teamB].filter(
            (playerId) => !nextPlayers.has(playerId),
          );
          return {
            ...w,
            byes: [
              ...w.byes.filter((playerId) => !nextPlayers.has(playerId)),
              ...playersLeavingMatch,
            ],
            matches: w.matches.map((m) =>
              m.id === c.matchId
                ? {
                    ...m,
                    court: c.court,
                    teamA: [c.players[0], c.players[1]],
                    teamB: [c.players[2], c.players[3]],
                  }
                : m,
            ),
          };
        }),
      })),
      updatedAt: now,
    });
  }
  const { stage } = requireMatch(event, c.matchId);
  if (stage.status === 'planned') throw Error('Start the stage before changing scores.');
  return replace(data, {
    ...event,
    stages: event.stages.map((s) => ({
      ...s,
      status: c.type === 'deleteScore' && s.id === stage.id ? 'active' : s.status,
      waves: s.waves.map((w) => ({
        ...w,
        matches: w.matches.map((m) =>
          m.id !== c.matchId
            ? m
            : c.type === 'saveScore'
              ? saveResult(m, c.score, event.scoring, () => now)
              : deleteResult(m),
        ),
      })),
    })),
    updatedAt: now,
  });
}
function replace(data: AppData, event: Event) {
  return { ...data, events: data.events.map((e) => (e.id === event.id ? event : e)) };
}

function requireEvent(data: AppData, eventId: string) {
  const event = data.events.find((candidate) => candidate.id === eventId);
  if (!event) throw Error('Event not found.');
  return event;
}

function requirePlayer(players: Player[], playerId: string) {
  const player = players.find((candidate) => candidate.id === playerId);
  if (!player) throw Error('Player not found.');
  return player;
}

function requireStage(event: Event, stageId: string) {
  const stage = event.stages.find((candidate) => candidate.id === stageId);
  if (!stage) throw Error('Stage not found.');
  return stage;
}

function requireMatch(event: Event, matchId: string) {
  for (const stage of event.stages) {
    const match = stage.waves
      .flatMap((wave) => wave.matches)
      .find((candidate) => candidate.id === matchId);
    if (match) return { match, stage };
  }
  throw Error('Match not found.');
}
