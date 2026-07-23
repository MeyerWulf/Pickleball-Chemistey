import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Command } from '../application/commands';
import { standings } from '../domain/core';
import type { Event, Match, Player, Score } from '../domain/model';

type Run = (command: Command) => boolean;

export default function EventWorkspace({
  event,
  players,
  run,
  close,
}: {
  event: Event;
  players: Player[];
  run: Run;
  close: () => void;
}) {
  const rows = useMemo(() => standings(event, players), [event, players]);
  const readonly = event.status === 'completed';
  const scheduledPlayers = useMemo(
    () =>
      new Set(
        event.stages.flatMap((stage) =>
          stage.waves.flatMap((wave) =>
            wave.matches.flatMap((match) => [...match.teamA, ...match.teamB]),
          ),
        ),
      ),
    [event.stages],
  );
  return (
    <>
      <button className="back" onClick={close}>
        ← All events
      </button>
      <section className="hero">
        <div>
          <span className="eyebrow">{event.status}</span>
          <h2>{event.name}</h2>
          <p>
            {event.date} · First to {event.scoring.target}, win by {event.scoring.winBy}
          </p>
        </div>
        <div className="actions">
          {readonly ? (
            <button className="primary" onClick={() => run({ type: 'reopenEvent', id: event.id })}>
              Reopen event
            </button>
          ) : (
            <button onClick={() => run({ type: 'completeEvent', id: event.id })}>
              Complete event
            </button>
          )}
        </div>
      </section>
      <EventSettings event={event} run={run} readonly={readonly} />
      <section className="grid">
        <section className="card">
          <h2>Check-in</h2>
          {players
            .filter((p) => !p.archived || event.checkedIn.includes(p.id))
            .map((p) => (
              <label className="check" key={p.id}>
                <input
                  type="checkbox"
                  disabled={readonly || scheduledPlayers.has(p.id)}
                  checked={event.checkedIn.includes(p.id)}
                  onChange={() => run({ type: 'toggleCheckIn', eventId: event.id, playerId: p.id })}
                />
                <span>
                  {p.name}
                  <small>
                    Rating {p.rating.toFixed(2)}
                    {p.archived ? ' · archived' : ''}
                    {scheduledPlayers.has(p.id) ? ' · scheduled' : ''}
                  </small>
                </span>
              </label>
            ))}
          {!players.length && <p className="empty">Add players from the player directory.</p>}
        </section>
        <StageBuilder event={event} run={run} readonly={readonly} />
      </section>
      {event.stages.map((s) => (
        <section className="card" key={s.id}>
          <div className="section-head">
            <div>
              <span className="eyebrow">{s.status}</span>
              <h2>{s.name}</h2>
            </div>
            <div className="actions">
              {s.status === 'planned' && (
                <button
                  disabled={readonly}
                  onClick={() => run({ type: 'startStage', eventId: event.id, stageId: s.id })}
                >
                  Start
                </button>
              )}
              {s.status === 'active' && (
                <button
                  disabled={readonly}
                  onClick={() => run({ type: 'completeStage', eventId: event.id, stageId: s.id })}
                >
                  Complete stage
                </button>
              )}
            </div>
          </div>
          {s.waves.map((w, i) => (
            <div key={w.id}>
              <h3>Wave {i + 1}</h3>
              <div className="matches">
                {w.matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    event={event}
                    players={players}
                    run={run}
                    readonly={readonly}
                    stageStatus={s.status}
                  />
                ))}
              </div>
              {w.byes.length > 0 && (
                <p className="bye">
                  <strong>Byes:</strong>{' '}
                  {w.byes
                    .map((id) => players.find((p) => p.id === id)?.name || 'Archived player')
                    .join(', ')}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
      <section className="card">
        <h2>Standings</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>W</th>
                <th>L</th>
                <th>PF</th>
                <th>PA</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.wins}</td>
                    <td>{r.losses}</td>
                    <td>{r.pointsFor}</td>
                    <td>{r.pointsAgainst}</td>
                    <td>
                      {r.diff > 0 ? '+' : ''}
                      {r.diff}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>Check in players to calculate standings.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function EventSettings({ event, run, readonly }: { event: Event; run: Run; readonly: boolean }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run({
      type: 'updateEvent',
      id: event.id,
      name: String(f.get('name')),
      date: String(f.get('date')),
      courts: Number(f.get('courts')),
      target: Number(f.get('target')),
      winBy: Number(f.get('winBy')),
    });
  };
  return (
    <details className="card">
      <summary>
        <strong>Edit event settings</strong>
      </summary>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Event name
          <input name="name" defaultValue={event.name} disabled={readonly} required />
        </label>
        <label>
          Date
          <input name="date" type="date" defaultValue={event.date} disabled={readonly} required />
        </label>
        <label>
          Courts
          <input
            name="courts"
            type="number"
            min="1"
            defaultValue={event.courtCount}
            disabled={readonly}
          />
        </label>
        <label>
          Play to
          <input
            name="target"
            type="number"
            min="1"
            defaultValue={event.scoring.target}
            disabled={readonly}
          />
        </label>
        <label>
          Win by
          <input
            name="winBy"
            type="number"
            min="1"
            defaultValue={event.scoring.winBy}
            disabled={readonly}
          />
        </label>
        <button className="primary" disabled={readonly}>
          Save settings
        </button>
      </form>
    </details>
  );
}
function StageBuilder({ event, run, readonly }: { event: Event; run: Run; readonly: boolean }) {
  const [name, setName] = useState(`Stage ${event.stages.length + 1}`);
  return (
    <section className="card">
      <h2>New stage</h2>
      <p>
        Balanced generation places the highest and lowest rated checked-in players together.
        Unassigned players receive explicit byes.
      </p>
      <label>
        Stage name
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={readonly} />
      </label>
      <button
        className="primary"
        disabled={readonly || event.checkedIn.length < 4}
        onClick={() => {
          if (run({ type: 'addBalancedStage', eventId: event.id, name })) {
            setName(`Stage ${event.stages.length + 2}`);
          }
        }}
      >
        Generate balanced stage
      </button>
      {event.checkedIn.length < 4 && <small>Check in at least four players.</small>}
    </section>
  );
}
function MatchCard({
  match,
  event,
  players,
  run,
  readonly,
  stageStatus,
}: {
  match: Match;
  event: Event;
  players: Player[];
  run: Run;
  readonly: boolean;
  stageStatus: Event['stages'][number]['status'];
}) {
  const assignmentReadonly = readonly || stageStatus !== 'planned';
  const scoreReadonly = readonly || stageStatus === 'planned';
  const n = (id: string) => players.find((p) => p.id === id)?.name || 'Archived player';
  const [a, setA] = useState(match.result?.score.a ?? '');
  const [b, setB] = useState(match.result?.score.b ?? '');
  const [assignment, setAssignment] = useState<[string, string, string, string]>([
    ...match.teamA,
    ...match.teamB,
  ]);
  const [court, setCourt] = useState(match.court);
  useEffect(() => {
    setAssignment([...match.teamA, ...match.teamB] as [string, string, string, string]);
    setCourt(match.court);
  }, [match.teamA, match.teamB, match.court]);
  const save = () =>
    run({
      type: 'saveScore',
      eventId: event.id,
      matchId: match.id,
      score: { a: Number(a), b: Number(b) } as Score,
    });
  return (
    <article className="match">
      <span className="court">Court {match.court}</span>
      <strong>{match.teamA.map(n).join(' + ')}</strong>
      <span>vs</span>
      <strong>{match.teamB.map(n).join(' + ')}</strong>
      <details>
        <summary>Manual assignment</summary>
        <div className="form-grid">
          {[0, 1, 2, 3].map((i) => (
            <label key={i}>
              {i < 2 ? 'Team A' : 'Team B'} player
              <select
                aria-label={`Assignment player ${i + 1} court ${match.court}`}
                disabled={assignmentReadonly}
                value={assignment[i]}
                onChange={(e) => {
                  const next = [...assignment] as [string, string, string, string];
                  next[i] = e.target.value;
                  setAssignment(next);
                }}
              >
                {event.checkedIn.map((id) => (
                  <option key={id} value={id}>
                    {n(id)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label>
          Court
          <input
            type="number"
            min="1"
            max={event.courtCount}
            value={court}
            disabled={assignmentReadonly}
            onChange={(e) => setCourt(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          disabled={assignmentReadonly || Boolean(match.result)}
          onClick={() =>
            run({
              type: 'assignMatch',
              eventId: event.id,
              matchId: match.id,
              court,
              players: assignment,
            })
          }
        >
          Save assignment
        </button>
        {stageStatus !== 'planned' && <small>Assignments lock when the stage starts.</small>}
      </details>
      <div className="score-entry">
        <label>
          Team A
          <input
            aria-label={`Team A score court ${match.court}`}
            type="number"
            min="0"
            value={a}
            disabled={scoreReadonly}
            onChange={(e) => setA(e.target.value)}
          />
        </label>
        <label>
          Team B
          <input
            aria-label={`Team B score court ${match.court}`}
            type="number"
            min="0"
            value={b}
            disabled={scoreReadonly}
            onChange={(e) => setB(e.target.value)}
          />
        </label>
      </div>
      <div className="actions">
        <button className="primary" disabled={scoreReadonly || a === '' || b === ''} onClick={save}>
          {match.result ? 'Edit score' : 'Save score'}
        </button>
        {match.result && (
          <button
            className="danger"
            disabled={scoreReadonly}
            onClick={() => run({ type: 'deleteScore', eventId: event.id, matchId: match.id })}
          >
            Delete score
          </button>
        )}
      </div>
      {match.correctionHistory.length ? (
        <small>
          {match.correctionHistory.length} prior correction
          {match.correctionHistory.length === 1 ? '' : 's'} preserved
        </small>
      ) : null}
    </article>
  );
}
