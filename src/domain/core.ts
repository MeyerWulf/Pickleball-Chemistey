import type { AppData, Event, Match, Player, Score, Stage } from './model';
export type Clock = () => string;
export type Id = () => string;
export const defaultData: AppData = { schemaVersion: 1, players: [], events: [] };
export function validateScore(score: Score, rules: Event['scoring']) {
  if (score.a === score.b) throw Error('Scores cannot tie.');
  const winner = Math.max(score.a, score.b),
    loser = Math.min(score.a, score.b);
  if (winner < rules.target) throw Error(`Winner must reach ${rules.target}.`);
  if (winner - loser < rules.winBy) throw Error(`Winner must lead by ${rules.winBy}.`);
  if (winner > rules.target && winner - loser !== rules.winBy)
    throw Error(`Extended games must end by exactly ${rules.winBy}.`);
}
export function assertWritable(event: Event) {
  if (event.status === 'completed') throw Error('Reopen this event before making changes.');
}
export function transitionStage(stage: Stage, next: Stage['status']) {
  const allowed: { [K in Stage['status']]: Stage['status'][] } = {
    planned: ['active'],
    active: ['completed'],
    completed: [],
  };
  if (!allowed[stage.status].includes(next))
    throw Error(`Cannot move stage from ${stage.status} to ${next}.`);
  if (next === 'completed' && stage.waves.some((w) => w.matches.some((m) => !m.result)))
    throw Error('Enter every match result before completing this stage.');
  return { ...stage, status: next };
}
export function saveResult(
  match: Match,
  score: Score,
  rules: Event['scoring'],
  now: Clock,
  reason?: string,
): Match {
  validateScore(score, rules);
  const at = now();
  const history = match.result
    ? [
        {
          score: match.result.score,
          recordedAt: match.result.recordedAt,
          reason: reason || 'Score corrected',
        },
      ]
    : [];
  return {
    ...match,
    correctionHistory: [...(match.correctionHistory || []), ...history],
    result: { score, recordedAt: at },
  };
}
export function deleteResult(match: Match, now: Clock): Match {
  return match.result
    ? {
        ...match,
        correctionHistory: [
          ...(match.correctionHistory || []),
          { score: match.result.score, recordedAt: now(), reason: 'Score deleted' },
        ],
        result: null,
      }
    : match;
}
export type Standing = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
};
export function standings(event: Event, players: Player[]): Standing[] {
  const rows = new Map<string, Standing>(
    event.checkedIn.map((id) => {
      const p = players.find((x) => x.id === id);
      return [
        id,
        {
          id,
          name: p?.name || 'Archived player',
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          diff: 0,
        },
      ] as const;
    }),
  );
  for (const m of event.stages.flatMap((s) => s.waves.flatMap((w) => w.matches))) {
    if (!m.result || m.result.score.a === m.result.score.b) continue;
    const { a, b } = m.result.score;
    for (const id of m.teamA) {
      const r = rows.get(id);
      if (r) {
        r.pointsFor += a;
        r.pointsAgainst += b;
        a > b ? r.wins++ : r.losses++;
      }
    }
    for (const id of m.teamB) {
      const r = rows.get(id);
      if (r) {
        r.pointsFor += b;
        r.pointsAgainst += a;
        b > a ? r.wins++ : r.losses++;
      }
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }))
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff || a.name.localeCompare(b.name));
}
export function balancedStage(
  name: string,
  checkedIn: string[],
  players: Player[],
  courtCount: number,
  id: Id,
): Stage {
  if (!name.trim()) throw Error('Stage name is required.');
  if (checkedIn.length < 4) throw Error('Check in at least four players.');
  const ordered = checkedIn
    .slice()
    .sort(
      (a, b) =>
        (players.find((p) => p.id === b)?.rating || 0) -
        (players.find((p) => p.id === a)?.rating || 0),
    );
  const matches: Match[] = [];
  const playing = ordered.slice(0, Math.floor(ordered.length / 4) * 4);
  for (let i = 0; i < playing.length && matches.length < courtCount; i += 4) {
    const four = playing.slice(i, i + 4);
    matches.push({
      id: id(),
      court: matches.length + 1,
      teamA: [four[0], four[3]],
      teamB: [four[1], four[2]],
      result: null,
      correctionHistory: [],
    });
  }
  const used = new Set(matches.flatMap((m) => [...m.teamA, ...m.teamB]));
  return {
    id: id(),
    name,
    status: 'planned',
    waves: [{ id: id(), matches, byes: ordered.filter((x) => !used.has(x)) }],
  };
}
