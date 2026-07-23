import { describe, expect, it } from 'vitest';
import { exportBackup, parseBackup } from './repository';
import { defaultData } from '../domain/core';
import { fixtureEvent, fixturePlayers } from '../test/fixtures';
describe('backups', () => {
  it('round trips schema-versioned data', () =>
    expect(parseBackup(exportBackup(defaultData))).toEqual(defaultData));
  it('rejects malformed and incompatible backups', () => {
    expect(() => parseBackup('nope')).toThrow('valid JSON');
    expect(() => parseBackup('{"schemaVersion":2}')).toThrow('validation failed');
  });
  it('rejects backups with broken player references', () => {
    const event = fixtureEvent();
    event.checkedIn.push('missing-player');
    expect(() =>
      parseBackup(JSON.stringify({ schemaVersion: 1, players: fixturePlayers(), events: [event] })),
    ).toThrow('unknown player');
  });
});
