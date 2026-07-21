const STORAGE_KEY = 'pickleball-chemistry-v1';

const demoPlayers = [
  ['Aaron', 4.3], ['Donna', 3.7], ['Bryan', 4.1], ['Mia', 3.5],
  ['Jared', 4.0], ['Nicolette', 3.6], ['Sam', 4.4], ['Taylor', 3.8],
  ['Chris', 3.9], ['Jordan', 4.2], ['Alex', 3.4], ['Riley', 3.7]
].map((p, i) => ({ id: crypto.randomUUID(), name: p[0], rating: p[1], active: i < 8, games: 0, wins: 0 }));

let state = loadState();
let currentCourts = [];
let selectedCourtIndex = null;

function defaultState() {
  return { players: demoPlayers, chemistry: {}, history: [] };
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); }
  catch { return defaultState(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pairKey(a, b) { return [a, b].sort().join('|'); }
function chemistry(a, b) { return state.chemistry[pairKey(a, b)]?.value ?? 5; }
function updateChemistry(a, b, score) {
  const key = pairKey(a, b);
  const old = state.chemistry[key] || { value: 5, samples: 0 };
  const alpha = Math.min(0.45, 1 / (old.samples + 1));
  state.chemistry[key] = {
    value: +(old.value * (1 - alpha) + score * alpha).toFixed(2),
    samples: old.samples + 1
  };
}

function effectiveTeamStrength(a, b) {
  const chemBoost = (chemistry(a.id, b.id) - 5) * 0.12;
  return a.rating + b.rating + chemBoost;
}

function expectedWin(sa, sb) { return 1 / (1 + Math.pow(10, (sb - sa) / 1.6)); }

function render() {
  renderPlayers();
  renderSnapshot();
  renderCourts();
  renderMatrix();
}

function renderPlayers() {
  const root = document.getElementById('playerList');
  root.innerHTML = '';
  [...state.players].sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div class="player-main">
        <input type="checkbox" ${p.active ? 'checked' : ''} aria-label="Select ${p.name}">
        <div><div class="player-name">${escapeHtml(p.name)}</div><div class="player-meta">${p.games} games · ${p.wins} wins</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px"><span class="rating-pill">${p.rating.toFixed(1)}</span><button class="remove" title="Remove">×</button></div>`;
    row.querySelector('input').addEventListener('change', e => { p.active = e.target.checked; saveState(); renderSnapshot(); });
    row.querySelector('.remove').addEventListener('click', () => {
      if (confirm(`Remove ${p.name}?`)) { state.players = state.players.filter(x => x.id !== p.id); saveState(); render(); }
    });
    root.appendChild(row);
  });
}

function renderSnapshot() {
  const active = state.players.filter(p => p.active);
  const avg = active.length ? active.reduce((s,p)=>s+p.rating,0)/active.length : 0;
  const games = state.history.length;
  const pairs = Object.values(state.chemistry).filter(x => x.samples > 0).length;
  document.getElementById('snapshot').innerHTML = `
    <div class="stat"><strong>${active.length}</strong><span>active players</span></div>
    <div class="stat"><strong>${avg.toFixed(2)}</strong><span>average skill</span></div>
    <div class="stat"><strong>${games}</strong><span>recorded games</span></div>
    <div class="stat"><strong>${pairs}</strong><span>learned partnerships</span></div>`;
}

function chooseSessionPlayers(active, spots) {
  return [...active]
    .sort((a,b) => a.games - b.games || Math.random() - .5)
    .slice(0, spots);
}

function pairingOptions(group) {
  const [a,b,c,d] = group;
  return [
    [[a,b],[c,d]], [[a,c],[b,d]], [[a,d],[b,c]]
  ].map(([ta,tb]) => {
    const sa = effectiveTeamStrength(...ta), sb = effectiveTeamStrength(...tb);
    const repeatPenalty = recentPairPenalty(ta) + recentPairPenalty(tb);
    const chemAverage = (chemistry(ta[0].id, ta[1].id) + chemistry(tb[0].id, tb[1].id))/2;
    const score = Math.abs(sa-sb) + repeatPenalty - (chemAverage-5)*0.03;
    return { teamA: ta, teamB: tb, strengthA: sa, strengthB: sb, gap: Math.abs(sa-sb), score };
  }).sort((x,y)=>x.score-y.score);
}

function recentPairPenalty(team) {
  const key = pairKey(team[0].id, team[1].id);
  return state.history.slice(-8).filter(g => g.pairs.includes(key)).length * .18;
}

function generateCourts() {
  const active = state.players.filter(p => p.active);
  const requested = Number(document.getElementById('courtCount').value);
  const courts = Math.min(requested, Math.floor(active.length / 4));
  if (!courts) { alert('Select at least four active players.'); return; }

  const selected = chooseSessionPlayers(active, courts * 4);
  selected.sort((a,b) => b.rating-a.rating);
  const groups = Array.from({length:courts}, ()=>[]);
  selected.forEach((p,i) => groups[i % courts].push(p));
  currentCourts = groups.map((g, i) => ({ court: i+1, ...pairingOptions(g)[0] }));
  renderCourts();
}

function renderCourts() {
  const root = document.getElementById('courts');
  if (!currentCourts.length) { root.className = 'courts empty-state'; root.textContent='No matchups generated yet.'; return; }
  root.className = 'courts'; root.innerHTML='';
  currentCourts.forEach((m, i) => {
    const winA = expectedWin(m.strengthA, m.strengthB);
    const el = document.createElement('article'); el.className='court-card';
    el.innerHTML = `
      <div class="court-head"><strong>Court ${m.court}</strong><span class="balance">Balance gap ${m.gap.toFixed(2)}</span></div>
      <div class="court-body">
        <div class="team"><div><div class="team-names">${m.teamA.map(p=>escapeHtml(p.name)).join(' + ')}</div><div class="team-score">Chemistry ${chemistry(m.teamA[0].id,m.teamA[1].id).toFixed(1)}</div></div><strong>${Math.round(winA*100)}%</strong></div>
        <div class="vs">VS</div>
        <div class="team"><div><div class="team-names">${m.teamB.map(p=>escapeHtml(p.name)).join(' + ')}</div><div class="team-score">Chemistry ${chemistry(m.teamB[0].id,m.teamB[1].id).toFixed(1)}</div></div><strong>${Math.round((1-winA)*100)}%</strong></div>
        <button class="primary record-btn">Record result</button>
      </div>`;
    el.querySelector('.record-btn').addEventListener('click', ()=>openResult(i));
    root.appendChild(el);
  });
}

function renderMatrix() {
  const players = state.players.filter(p=>p.active).slice(0,12);
  const root = document.getElementById('chemistryMatrix');
  if (!players.length) { root.innerHTML='<p class="muted">No active players.</p>'; return; }
  let html='<table><thead><tr><th>Player</th>'+players.map(p=>`<th>${escapeHtml(p.name)}</th>`).join('')+'</tr></thead><tbody>';
  for (const a of players) {
    html += `<tr><td>${escapeHtml(a.name)}</td>`;
    for (const b of players) {
      if (a.id===b.id) html += '<td>—</td>';
      else {
        const v=chemistry(a.id,b.id); const cls=v>=6?'chem-high':v<=4?'chem-low':'chem-mid';
        html += `<td class="${cls}">${v.toFixed(1)}</td>`;
      }
    }
    html += '</tr>';
  }
  root.innerHTML=html+'</tbody></table>';
}

function openResult(index) {
  selectedCourtIndex=index;
  const m=currentCourts[index];
  document.getElementById('resultSummary').innerHTML=`<p><strong>Team A:</strong> ${m.teamA.map(p=>escapeHtml(p.name)).join(' + ')}</p><p><strong>Team B:</strong> ${m.teamB.map(p=>escapeHtml(p.name)).join(' + ')}</p>`;
  document.getElementById('resultDialog').showModal();
}

function saveResult() {
  const m=currentCourts[selectedCourtIndex];
  const scoreA=+document.getElementById('scoreA').value, scoreB=+document.getElementById('scoreB').value;
  const chemA=+document.getElementById('chemA').value, chemB=+document.getElementById('chemB').value;
  const winner = scoreA===scoreB ? null : (scoreA>scoreB ? 'A':'B');
  [...m.teamA,...m.teamB].forEach(p=>p.games++);
  if (winner==='A') m.teamA.forEach(p=>p.wins++);
  if (winner==='B') m.teamB.forEach(p=>p.wins++);
  updateChemistry(m.teamA[0].id,m.teamA[1].id,chemA);
  updateChemistry(m.teamB[0].id,m.teamB[1].id,chemB);
  state.history.push({ date:new Date().toISOString(), scoreA, scoreB, players:[...m.teamA,...m.teamB].map(p=>p.id), pairs:[pairKey(m.teamA[0].id,m.teamA[1].id),pairKey(m.teamB[0].id,m.teamB[1].id)] });
  saveState();
  currentCourts.splice(selectedCourtIndex,1);
  render();
}

function escapeHtml(s) { return s.replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

document.getElementById('generateBtn').addEventListener('click', generateCourts);
document.getElementById('openAddPlayer').addEventListener('click', ()=>document.getElementById('playerDialog').showModal());
document.getElementById('savePlayer').addEventListener('click', e=>{
  e.preventDefault();
  const name=document.getElementById('playerName').value.trim();
  const rating=+document.getElementById('playerRating').value;
  if (!name || rating<1 || rating>5) return;
  state.players.push({id:crypto.randomUUID(),name,rating,active:true,games:0,wins:0});
  saveState(); document.getElementById('playerDialog').close(); document.getElementById('playerForm').reset(); render();
});
document.getElementById('saveResult').addEventListener('click', e=>{ e.preventDefault(); saveResult(); document.getElementById('resultDialog').close(); });
['chemA','chemB'].forEach(id=>document.getElementById(id).addEventListener('input', e=>document.getElementById(id+'Out').value=e.target.value));
document.getElementById('resetDemo').addEventListener('click', ()=>{ if(confirm('Reset all local data?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } });

render();
