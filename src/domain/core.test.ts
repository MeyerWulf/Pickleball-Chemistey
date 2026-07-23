import { describe, expect, it } from 'vitest';
import { balancedStage, saveResult, standings, transitionStage, validateScore } from './core';
import { fixtureEvent, fixturePlayers } from '../test/fixtures';
describe('scoring', () => {
  it('accepts 11-9 and extended 13-11', () => {
    expect(() => validateScore({ a: 11, b: 9 }, { target: 11, winBy: 2 })).not.toThrow();
    expect(() => validateScore({ a: 13, b: 11 }, { target: 11, winBy: 2 })).not.toThrow();
  });
  it.each([
    [11, 11],
    [10, 8],
    [12, 11],
    [14, 11],
  ])('rejects invalid %s-%s', (a, b) =>
    expect(() => validateScore({ a, b }, { target: 11, winBy: 2 })).toThrow(),
  );
  it('preserves correction history', () => {
    const m = fixtureEvent().stages[0].waves[0].matches[0];
    const first = saveResult(m, { a: 11, b: 7 }, { target: 11, winBy: 2 }, () => 't1');
    const edit = saveResult(first, { a: 11, b: 9 }, { target: 11, winBy: 2 }, () => 't2');
    expect(edit.correctionHistory).toHaveLength(1);
    expect(edit.correctionHistory[0].score).toEqual({ a: 11, b: 7 });
  });
});
describe('stages', () => {
  it('represents byes and balances teams', () => {
    let n = 0;
    const s = balancedStage(
      'One',
      fixturePlayers().map((p) => p.id),
      fixturePlayers(),
      1,
      () => String(++n),
    );
    expect(s.waves[0].matches).toHaveLength(1);
    expect(s.waves[0].byes).toHaveLength(1);
  });
  it('validates transitions', () => {
    const s = fixtureEvent().stages[0];
    expect(() => transitionStage(s, 'completed')).toThrow();
    expect(transitionStage(s, 'active').status).toBe('active');
  });
});
it('recalculates standings from results', () => {
  const e = fixtureEvent();
  e.stages[0].waves[0].matches[0].result = {
    score: { a: 11, b: 5 },
    recordedAt: '2026-01-02T00:00:00.000Z',
  };
  expect(standings(e, fixturePlayers())[0].wins).toBe(1);
});
