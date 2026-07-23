import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { execute, type Command } from './application/commands';
import type { AppData, Player } from './domain/model';
import { exportBackup, LocalRepository, parseBackup } from './infrastructure/repository';
import EventWorkspace from './features/EventWorkspace';
import './styles.css';
const repo = new LocalRepository();
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
type Run = (command: Command) => boolean;
function messageFor(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray(error.issues) &&
    typeof error.issues[0]?.message === 'string'
  ) {
    return error.issues[0].message;
  }
  return error instanceof Error ? error.message : fallback;
}
function loadInitialData(): { data: AppData; error: string } {
  try {
    return { data: repo.load(), error: '' };
  } catch (error) {
    return {
      data: { schemaVersion: 1, players: [], events: [] },
      error: `Saved data could not be opened. Restore a valid backup before making changes. ${messageFor(
        error,
        'Unknown storage error.',
      )}`,
    };
  }
}
function FormError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? (
    <p className="error" role="alert">
      <span>{message}</span>
      <button type="button" aria-label="Dismiss error" onClick={onDismiss}>
        ×
      </button>
    </p>
  ) : null;
}
export default function App() {
  const [initial] = useState(loadInitialData);
  const [data, setData] = useState<AppData>(initial.data);
  const [loadBlocked, setLoadBlocked] = useState(Boolean(initial.error));
  const [selected, setSelected] = useState('');
  const [error, setError] = useState(initial.error);
  const [saved, setSaved] = useState('');
  const event = data.events.find((e) => e.id === selected);
  const run = (command: Command) => {
    if (loadBlocked) {
      setError(
        'Restore a valid backup before making changes. Existing saved data was not changed.',
      );
      return false;
    }
    try {
      const next = execute(data, command, uid, now);
      repo.save(next);
      setData(next);
      setError('');
      setSaved('Saved locally.');
      return true;
    } catch (e) {
      setError(messageFor(e, 'Unable to save.'));
      setSaved('');
      return false;
    }
  };
  const restore = async (f: File) => {
    try {
      const next = parseBackup(await f.text());
      repo.save(next);
      setData(next);
      setSelected('');
      setLoadBlocked(false);
      setSaved('Backup restored.');
      setError('');
    } catch (e) {
      setError(messageFor(e, 'Restore failed.'));
      setSaved('');
    }
  };
  const download = () => {
    try {
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([exportBackup(data)], { type: 'application/json' }));
      a.href = url;
      a.download = 'pickleball-iq-backup.json';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      setError(messageFor(error, 'Backup export failed.'));
    }
  };
  return (
    <>
      <header>
        <div>
          <span className="eyebrow">ORGANIZER CORE</span>
          <h1>
            Pickleball IQ <small>Alpha</small>
          </h1>
        </div>
        <nav aria-label="Primary">
          <button
            onClick={() => setSelected('')}
            className={selected === '' ? 'active' : ''}
            aria-current={selected === '' ? 'page' : undefined}
          >
            Events
          </button>
          <button
            onClick={() => setSelected('players')}
            className={selected === 'players' ? 'active' : ''}
            aria-current={selected === 'players' ? 'page' : undefined}
          >
            Players
          </button>
        </nav>
      </header>
      <main>
        <FormError message={error} onDismiss={() => setError('')} />
        {saved && (
          <p className="success" role="status">
            {saved}
          </p>
        )}
        {selected === 'players' ? (
          <Players players={data.players} run={run} />
        ) : event ? (
          <EventWorkspace
            event={event}
            players={data.players}
            run={run}
            close={() => setSelected('')}
          />
        ) : (
          <Events data={data} run={run} open={setSelected} download={download} restore={restore} />
        )}
      </main>
    </>
  );
}
function Events({
  data,
  run,
  open,
  download,
  restore,
}: {
  data: AppData;
  run: Run;
  open: (id: string) => void;
  download: () => void;
  restore: (f: File) => void;
}) {
  const [show, setShow] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const restoreInput = useRef<HTMLInputElement>(null);
  const closeCreateForm = () => {
    setShow(false);
    requestAnimationFrame(() => createButton.current?.focus());
  };
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">EVENTS</span>
          <h2>Run a great night of pickleball.</h2>
          <p>Create an event, check in players, make fair games, and capture results.</p>
        </div>
        <button ref={createButton} className="primary" onClick={() => setShow(true)}>
          Create event
        </button>
      </section>
      {show && <EventForm close={closeCreateForm} run={run} />}
      <section className="card">
        <div className="section-head">
          <h2>Your events</h2>
          <div className="actions">
            <button onClick={download}>Export backup</button>
            <button type="button" onClick={() => restoreInput.current?.click()}>
              Restore backup
            </button>
            <input
              ref={restoreInput}
              aria-label="Choose backup file"
              hidden
              type="file"
              accept="application/json"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (file) await restore(file);
                input.value = '';
              }}
            />
          </div>
        </div>
        {data.events.length ? (
          data.events.map((e) => (
            <article className="event-row" key={e.id}>
              <div>
                <strong>{e.name}</strong>
                <span>
                  {e.date} · {e.checkedIn.length} checked in · {e.status}
                </span>
              </div>
              <div className="actions">
                <button aria-label={`Open ${e.name}`} onClick={() => open(e.id)}>
                  Open
                </button>
                <button
                  className="danger"
                  aria-label={`Delete ${e.name}`}
                  onClick={() =>
                    confirm(`Delete ${e.name}?`) && run({ type: 'deleteEvent', id: e.id })
                  }
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">No events yet. Create your first event.</div>
        )}
      </section>
    </>
  );
}
function EventForm({ close, run }: { close: () => void; run: Run }) {
  const modal = useRef<HTMLElement>(null);
  useEffect(() => modal.current?.querySelector<HTMLElement>('input, button')?.focus(), []);
  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab' || !modal.current) return;
    const controls = [...modal.current.querySelectorAll<HTMLElement>('input, button')].filter(
      (control) => !control.hasAttribute('disabled'),
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const saved = run({
      type: 'createEvent',
      name: String(f.get('name')),
      date: String(f.get('date')),
      courts: Number(f.get('courts')),
      target: Number(f.get('target')),
      winBy: Number(f.get('winBy')),
    });
    if (saved) close();
  };
  return (
    <div className="modal-backdrop">
      <section
        ref={modal}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-event"
        onKeyDown={handleKeyboard}
      >
        <h2 id="new-event">Create event</h2>
        <form onSubmit={submit} className="form-grid">
          <label>
            Event name
            <input name="name" required autoFocus />
          </label>
          <label>
            Date
            <input name="date" type="date" required defaultValue={today()} />
          </label>
          <label>
            Courts
            <input name="courts" type="number" min="1" defaultValue="2" required />
          </label>
          <label>
            Play to
            <input name="target" type="number" min="1" defaultValue="11" required />
          </label>
          <label>
            Win by
            <input name="winBy" type="number" min="1" max="10" defaultValue="2" required />
          </label>
          <div className="actions full">
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button className="primary">Create & save</button>
          </div>
        </form>
      </section>
    </div>
  );
}
function Players({ players, run }: { players: Player[]; run: Run }) {
  const [query, setQuery] = useState('');
  const [edit, setEdit] = useState<Player | null>(null);
  const visible = players.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      name = String(f.get('name')),
      rating = Number(f.get('rating'));
    const saved = run(
      edit
        ? { type: 'editPlayer', id: edit.id, name, rating }
        : { type: 'addPlayer', name, rating },
    );
    if (saved) {
      setEdit(null);
      e.currentTarget.reset();
    }
  };
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">PLAYER DIRECTORY</span>
          <h2>People, ready when you are.</h2>
        </div>
      </section>
      <section className="grid">
        <form className="card" onSubmit={submit} key={edit?.id || 'new-player'}>
          <h2>{edit ? 'Edit player' : 'Add player'}</h2>
          <label>
            Name
            <input name="name" required defaultValue={edit?.name} />
          </label>
          <label>
            Rating
            <input
              name="rating"
              type="number"
              min="1"
              max="8"
              step=".01"
              required
              defaultValue={edit?.rating}
            />
          </label>
          <div className="actions">
            <button className="primary">Save player</button>
            {edit && (
              <button type="button" onClick={() => setEdit(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
        <section className="card">
          <label>
            Search players
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {visible.map((p) => (
            <article className="player-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <span>
                  Rating {p.rating.toFixed(2)} · {p.archived ? 'Archived' : 'Active'}
                </span>
              </div>
              <div className="actions">
                <button aria-label={`Edit ${p.name}`} onClick={() => setEdit(p)}>
                  Edit
                </button>
                <button
                  aria-label={`${p.archived ? 'Restore' : 'Archive'} ${p.name}`}
                  onClick={() => run({ type: 'toggleArchive', id: p.id })}
                >
                  {p.archived ? 'Restore' : 'Archive'}
                </button>
              </div>
            </article>
          ))}
          {!visible.length && <p className="empty">No players match this search.</p>}
        </section>
      </section>
    </>
  );
}
