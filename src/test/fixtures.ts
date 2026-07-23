import type { Event, Player } from '../domain/model';
export const fixturePlayers = (): Player[] =>
  [1, 2, 3, 4, 5].map((n) => ({
    id: `p${n}`,
    name: `Player ${n}`,
    rating: 5 - n / 10,
    archived: false,
    createdAt: '2026-01-01T00:00:00Z',
  }));
export const fixtureEvent = (): Event => ({
  id: 'e1',
  name: 'Test Night',
  date: '2026-01-01',
  courtCount: 1,
  status: 'active',
  scoring: { target: 11, winBy: 2 },
  checkedIn: ['p1', 'p2', 'p3', 'p4', 'p5'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stages: [
    {
      id: 's1',
      name: 'Stage 1',
      status: 'planned',
      waves: [
        {
          id: 'w1',
          byes: ['p5'],
          matches: [
            {
              id: 'm1',
              court: 1,
              teamA: ['p1', 'p4'],
              teamB: ['p2', 'p3'],
              result: null,
              correctionHistory: [],
            },
          ],
        },
      ],
    },
  ],
});
