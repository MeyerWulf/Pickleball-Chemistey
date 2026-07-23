import { describe, expect, it } from 'vitest';
import { execute } from './commands';
import type { AppData } from '../domain/model';
import { fixtureEvent, fixturePlayers } from '../test/fixtures';

const clock = () => '2026-01-02T00:00:00.000Z';
let sequence = 0;
const id = () => `new-${++sequence}`;
const data = (): AppData => ({
  schemaVersion: 1,
  players: fixturePlayers(),
  events: [fixtureEvent()],
});

describe('organizer commands', () => {
  it('rejects unknown entities instead of silently succeeding', () => {
    expect(() =>
      execute(data(), { type: 'editPlayer', id: 'missing', name: 'No', rating: 3 }, id, clock),
    ).toThrow('Player not found');
    expect(() =>
      execute(data(), { type: 'startStage', eventId: 'e1', stageId: 'missing' }, id, clock),
    ).toThrow('Stage not found');
    expect(() =>
      execute(data(), { type: 'deleteScore', eventId: 'e1', matchId: 'missing' }, id, clock),
    ).toThrow('Match not found');
  });

  it('enforces lifecycle boundaries for assignments and scores', () => {
    const initial = data();
    expect(() =>
      execute(
        initial,
        { type: 'saveScore', eventId: 'e1', matchId: 'm1', score: { a: 11, b: 7 } },
        id,
        clock,
      ),
    ).toThrow('Start the stage');
    const active = execute(
      initial,
      { type: 'startStage', eventId: 'e1', stageId: 's1' },
      id,
      clock,
    );
    expect(() =>
      execute(
        active,
        {
          type: 'assignMatch',
          eventId: 'e1',
          matchId: 'm1',
          court: 1,
          players: ['p1', 'p2', 'p3', 'p4'],
        },
        id,
        clock,
      ),
    ).toThrow('before a stage starts');
    const scored = execute(
      active,
      { type: 'saveScore', eventId: 'e1', matchId: 'm1', score: { a: 11, b: 7 } },
      id,
      clock,
    );
    expect(scored.events[0].stages[0].waves[0].matches[0].result?.score).toEqual({ a: 11, b: 7 });
  });

  it('moves substituted players between a match and explicit byes', () => {
    const changed = execute(
      data(),
      {
        type: 'assignMatch',
        eventId: 'e1',
        matchId: 'm1',
        court: 1,
        players: ['p5', 'p2', 'p3', 'p4'],
      },
      id,
      clock,
    );
    const wave = changed.events[0].stages[0].waves[0];
    expect(wave.byes).toEqual(['p1']);
    expect(wave.matches[0].teamA).toEqual(['p5', 'p2']);
  });

  it('protects completed events until they are reopened', () => {
    const completed = execute(data(), { type: 'completeEvent', id: 'e1' }, id, clock);
    expect(() =>
      execute(completed, { type: 'toggleCheckIn', eventId: 'e1', playerId: 'p1' }, id, clock),
    ).toThrow('Reopen');
    expect(execute(completed, { type: 'reopenEvent', id: 'e1' }, id, clock).events[0].status).toBe(
      'active',
    );
  });

  it('does not reinterpret recorded scores under different scoring rules', () => {
    const active = execute(data(), { type: 'startStage', eventId: 'e1', stageId: 's1' }, id, clock);
    const scored = execute(
      active,
      { type: 'saveScore', eventId: 'e1', matchId: 'm1', score: { a: 11, b: 7 } },
      id,
      clock,
    );
    expect(() =>
      execute(
        scored,
        {
          type: 'updateEvent',
          id: 'e1',
          name: 'Test Night',
          date: '2026-01-01',
          courts: 1,
          target: 15,
          winBy: 2,
        },
        id,
        clock,
      ),
    ).toThrow('cannot change after a score');
  });

  it('allows corrections after completion and reopens a stage when a score is deleted', () => {
    const active = execute(data(), { type: 'startStage', eventId: 'e1', stageId: 's1' }, id, clock);
    const scored = execute(
      active,
      { type: 'saveScore', eventId: 'e1', matchId: 'm1', score: { a: 11, b: 7 } },
      id,
      clock,
    );
    const completed = execute(
      scored,
      { type: 'completeStage', eventId: 'e1', stageId: 's1' },
      id,
      clock,
    );
    const corrected = execute(
      completed,
      { type: 'saveScore', eventId: 'e1', matchId: 'm1', score: { a: 11, b: 9 } },
      id,
      clock,
    );
    expect(corrected.events[0].stages[0].status).toBe('completed');
    expect(corrected.events[0].stages[0].waves[0].matches[0].correctionHistory).toHaveLength(1);
    const deleted = execute(
      corrected,
      { type: 'deleteScore', eventId: 'e1', matchId: 'm1' },
      id,
      clock,
    );
    expect(deleted.events[0].stages[0].status).toBe('active');
    expect(deleted.events[0].stages[0].waves[0].matches[0].result).toBeNull();
  });
});
