const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='pbi-v1-1',OLD_KEY='pbi-v1';
const uid=()=>crypto.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const pk=(a,b)=>[a,b].sort().join('|');
const today=()=>new Date().toISOString().slice(0,10);
const niceDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'';
const shortDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';

const demo=[['Aaron',55,4.31,'Right','Male','Right','Aggressive'],['Julie',48,4.12,'Left','Female','Left','Defensive / reset-oriented'],['Steve',42,4.44,'Right','Male','Left','Power-oriented'],['Maya',37,3.98,'Right','Female','Either','Balanced'],['Chris',61,4.05,'Right','Male','Right','Defensive / reset-oriented'],['Dana',52,3.88,'Left','Female','Left','Speed-up heavy'],['Luis',29,4.22,'Right','Male','Either','Balanced'],['Kim',45,3.81,'Right','Female','Right','Aggressive']].map((x,i)=>({id:uid(),name:x[0],age:x[1],rating:x[2],internal:x[2]+((i%3)-1)*.03,session:x[2],rd:.3,handedness:x[3],gender:x[4],side:x[5],style:x[6],club:'The Flying Pickle',email:'',phone:'',duprId:'',notes:'',consent:false,archived:false,wins:0,losses:0,games:0}));

function migrate(){
  try{
    const current=JSON.parse(localStorage.getItem(KEY));
    if(current?.players)return current;
    const old=JSON.parse(localStorage.getItem(OLD_KEY));
    if(old?.players){
      old.players.forEach(p=>{if(p.gender==='Man')p.gender='Male';if(p.gender==='Woman')p.gender='Female'});
      const sid=uid();
      return {players:old.players,chem:old.chem||{},sessions:[{id:sid,name:'Imported session',date:today(),playerIds:old.players.filter(p=>p.active&&!p.archived).map(p=>p.id),round:old.round||0,matches:(old.history||[]).map(h=>({...h,id:h.id||uid(),sessionId:sid}))}],currentSessionId:sid};
    }
  }catch(e){}
  const sid=uid();
  return {players:demo,chem:{},sessions:[{id:sid,name:'Tuesday Night Thunder',date:today(),playerIds:demo.map(p=>p.id),round:0,matches:[]}],currentSessionId:sid};
}
let state=migrate(),matches=[];
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const P=id=>state.players.find(p=>p.id===id);
const S=id=>state.sessions.find(s=>s.id===id);
const currentSession=()=>S(state.currentSessionId);
const activePlayers=()=>state.players.filter(p=>!p.archived);
const C=(a,b)=>state.chem[pk(a,b)]||{games:0,wins:0,communication:7,coverage:7,transition:7,finishing:7,consistency:7,enjoyment:7,effect:0};
const co=c=>avg([c.communication,c.coverage,c.transition,c.finishing,c.consistency,c.enjoyment]);
const conf=c=>Math.round(100*(1-Math.exp(-c.games/14)));
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)};

for(let i=1;i<=25;i++)$('#courts').insertAdjacentHTML('beforeend',`<option>${i}</option>`);
$('#courts').value=2;
for(let i=0;i<=21;i++)$('#scoreChoices').insertAdjacentHTML('beforeend',`<option value="${i}"></option>`);

$$('.tab').forEach(b=>b.onclick=()=>showView(b.dataset.view));
function showView(id){
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===id));
  $$('.view').forEach(x=>x.classList.toggle('active',x.id===id));
  render();
}
$$('[data-go-results]').forEach(b=>b.onclick=()=>showView('results'));

function error(v,lo,hi,min=1,max=8,d=2){
  const p=x=>100*(x-min)/(max-min);
  return `<div class="error"><span class="line" style="left:${p(lo)}%;width:${p(hi)-p(lo)}%"></span><span class="cap" style="left:${p(lo)}%"></span><span class="cap" style="left:${p(hi)}%"></span><span class="dot" style="left:${p(v)}%"></span></div><div class="labels"><span>${lo.toFixed(d)}</span><span>${v.toFixed(d)}</span><span>${hi.toFixed(d)}</span></div>`;
}
function sessionOptions(selected=''){
  return state.sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${s.name} — ${shortDate(s.date)}</option>`).join('');
}
function ensureSession(){
  let s=currentSession();
  if(!s){
    s={id:uid(),name:'New session',date:today(),playerIds:[],round:0,matches:[]};
    state.sessions.push(s);state.currentSessionId=s.id;save();
  }
  return s;
}
function render(){
  renderSession();
  renderPlayers();
  renderSelects();
  renderResults();
  renderChem();
}
function renderSession(){
  const s=ensureSession();
  $('#sessionName').value=s.name;
  $('#sessionDate').value=s.date;
  $('#sessionDay').textContent=niceDate(s.date).toUpperCase();
  $('#sessionHeading').textContent=s.name;
  $('#previousSession').innerHTML='<option value="">Choose a previous session…</option>'+state.sessions.filter(x=>x.id!==s.id).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<option value="${x.id}">${x.name} — ${shortDate(x.date)}</option>`).join('');
  const q=$('#sessionPlayerSearch').value.toLowerCase();
  const ps=activePlayers().filter(p=>p.name.toLowerCase().includes(q));
  $('#activeCount').textContent=s.playerIds.length+' selected';
  $('#sessionPlayers').innerHTML=ps.map(p=>`<label class="check"><input type="checkbox" data-sel="${p.id}" ${s.playerIds.includes(p.id)?'checked':''}><span><b>${p.name}</b><small>${p.internal.toFixed(2)} internal · ${p.style}</small></span></label>`).join('');
  $$('[data-sel]').forEach(x=>x.onchange=()=>{const id=x.dataset.sel;if(x.checked&&!s.playerIds.includes(id))s.playerIds.push(id);if(!x.checked)s.playerIds=s.playerIds.filter(y=>y!==id);save();renderSession()});
  renderSessionSummary();
}
$('#sessionName').onchange=e=>{const s=ensureSession();s.name=e.target.value.trim()||'Unnamed session';save();renderSession()};
$('#sessionDate').onchange=e=>{const s=ensureSession();s.date=e.target.value||today();save();renderSession()};
$('#sessionPlayerSearch').oninput=renderSession;
$('#selectAll').onclick=()=>{const s=ensureSession();s.playerIds=activePlayers().map(p=>p.id);save();renderSession()};
$('#clearAll').onclick=()=>{const s=ensureSession();s.playerIds=[];save();renderSession()};
$('#loadPrevious').onclick=()=>{const src=S($('#previousSession').value),s=ensureSession();if(!src)return toast('Choose a previous session.');s.playerIds=src.playerIds.filter(id=>P(id)&&!P(id).archived);save();renderSession();toast('Previous roster loaded')};

function strength(a,b){
  const c=C(a.id,b.id);
  let bonus=(a.side!=='Either'&&b.side!=='Either'&&a.side!==b.side)?.08:0;
  if((a.style.includes('Aggressive')&&b.style.includes('reset'))||(b.style.includes('Aggressive')&&a.style.includes('reset')))bonus+=.06;
  return a.session+b.session+c.effect*conf(c)/100+bonus;
}
function expected(a,b){return 1/(1+10**((b-a)/1.2))}
function score(arr,mode){
  const [a,b,c,d]=arr,pr=expected(strength(a,b),strength(c,d)),bal=1-Math.abs(.5-pr)*2;
  const nov=1-clamp(avg([C(a.id,b.id).games,C(c.id,d.id).games])/12,0,1);
  const ch=avg([co(C(a.id,b.id)),co(C(c.id,d.id))])/10;
  if(mode==='competitive')return bal*.8+ch*.15+nov*.05;
  if(mode==='discover')return bal*.45+nov*.45+ch*.1;
  if(mode==='social')return bal*.35+nov*.55+.1;
  return bal*.6+nov*.25+ch*.15;
}
function best(pool,mode){
  let out;
  for(let t=0;t<160;t++){
    const q=[...pool].sort(()=>Math.random()-.5).slice(0,4);
    const opts=[[q[0],q[1],q[2],q[3]],[q[0],q[2],q[1],q[3]],[q[0],q[3],q[1],q[2]]];
    for(const a of opts){const s=score(a,mode);if(!out||s>out.s)out={a,s}}
  }
  return out;
}
$('#generate').onclick=()=>{
  const s=ensureSession(),pool0=s.playerIds.map(P).filter(Boolean),n=Math.min(+$('#courts').value,Math.floor(pool0.length/4));
  if(!n)return toast('Select at least four players.');
  let pool=[...pool0];matches=[];
  for(let i=0;i<n;i++){
    const z=best(pool,$('#mode').value),[a,b,c,d]=z.a,pr=expected(strength(a,b),strength(c,d));
    matches.push({id:uid(),sessionId:s.id,court:i+1,round:s.round+1,A:[a.id,b.id],B:[c.id,d.id],pr,s:z.s,mode:$('#mode').value});
    const used=new Set(z.a.map(x=>x.id));pool=pool.filter(x=>!used.has(x.id));
  }
  s.round++;save();renderMatches();renderHealth();
};
function renderMatches(){
  $('#matches').innerHTML=matches.map(m=>{
    const A=m.A.map(P),B=m.B.map(P),u=clamp(.06+avg([...A,...B].map(p=>p.rd))/8,.06,.18),lo=clamp(m.pr-u,0,1),hi=clamp(m.pr+u,0,1);
    return `<div class="match"><div class="head"><h3>Court ${m.court}</h3><span class="pill">Round ${m.round}</span></div>
      <div class="teams">
        <div class="team team-a"><span class="team-label">TEAM A</span><b>${A.map(x=>x.name).join(' + ')}</b><small>${strength(...A).toFixed(2)} team rating</small></div>
        <b class="vs">VS</b>
        <div class="team team-b"><span class="team-label">TEAM B</span><b>${B.map(x=>x.name).join(' + ')}</b><small>${strength(...B).toFixed(2)} team rating</small></div>
      </div>
      <p>Team A predicted win chance: <b>${Math.round(m.pr*100)}%</b></p>${error(m.pr,lo,hi,0,1,2)}
      <div class="actions"><button data-result="${m.id}">Record result</button><button class="secondary" data-why="${m.id}">Why?</button></div></div>`;
  }).join('');
  $$('[data-result]').forEach(b=>b.onclick=()=>openResult(b.dataset.result));
  $$('[data-why]').forEach(b=>b.onclick=()=>{const m=matches.find(x=>x.id===b.dataset.why);alert(`Why this matchup?\n\nPredicted balance: ${Math.round(m.pr*100)}% vs ${100-Math.round(m.pr*100)}%.\nThe model combines internal skill, today's session estimate, partnership history, complementary sides, style fit and the selected variety setting.`)});
}
function renderHealth(){
  if(!matches.length){$('#grade').textContent='—';$('#health').innerHTML='Generate matches to score this session.';return}
  const bal=Math.round(avg(matches.map(m=>1-Math.abs(.5-m.pr)*2))*100);
  const nov=Math.round(avg(matches.flatMap(m=>[C(...m.A).games,C(...m.B).games]).map(n=>100*(1-clamp(n/15,0,1)))));
  const q=Math.round(avg(matches.map(m=>m.s))*100),g=q>=90?'A+':q>=84?'A':q>=76?'B':q>=66?'C':'D';
  $('#grade').textContent=g;
  $('#health').innerHTML=[['Competitive balance',bal],['Partner variety',nov],['Overall quality',q]].map(x=>`<div class="healthrow"><b>${x[0]}</b><span>${x[1]}%</span><div class="meter"><span style="width:${x[1]}%"></span></div></div>`).join('');
}

function playerSessionStats(session){
  const rows={};
  session.playerIds.forEach(id=>{const p=P(id);if(p)rows[id]={id,name:p.name,wins:0,losses:0,games:0,pointsFor:0,pointsAgainst:0,diff:0}});
  for(const m of session.matches){
    const aw=m.scoreA>m.scoreB;
    for(const id of m.A){if(!rows[id])continue;rows[id].games++;rows[id].pointsFor+=m.scoreA;rows[id].pointsAgainst+=m.scoreB;aw?rows[id].wins++:rows[id].losses++}
    for(const id of m.B){if(!rows[id])continue;rows[id].games++;rows[id].pointsFor+=m.scoreB;rows[id].pointsAgainst+=m.scoreA;aw?rows[id].losses++:rows[id].wins++}
  }
  Object.values(rows).forEach(r=>r.diff=r.pointsFor-r.pointsAgainst);
  return Object.values(rows).sort((a,b)=>b.wins-a.wins||b.diff-a.diff||b.pointsFor-a.pointsFor||a.name.localeCompare(b.name));
}
function renderSessionSummary(){
  const s=ensureSession(),stats=playerSessionStats(s),games=s.matches.length;
  if(!games){$('#sessionSummary').innerHTML='<p class="muted">No scores recorded in this session yet.</p>';return}
  const leaders=stats.slice(0,4);
  $('#sessionSummary').innerHTML=`<div class="result-cards"><div class="result-card"><small>GAMES RECORDED</small><b>${games}</b></div><div class="result-card"><small>SESSION LEADER</small><b>${leaders[0]?.name||'—'} — ${leaders[0]?.wins||0} wins</b></div><div class="result-card"><small>LATEST SCORE</small><b>${latestScore(s)}</b></div></div>${standingsTable(leaders,true)}`;
}
function latestScore(s){
  const m=s.matches.at(-1);if(!m)return '—';
  return `${m.A.map(P).map(x=>x.name).join(' + ')} ${m.scoreA}–${m.scoreB} ${m.B.map(P).map(x=>x.name).join(' + ')}`;
}

function renderResults(){
  const selected=$('#resultsSession').value||state.currentSessionId;
  $('#resultsSession').innerHTML=sessionOptions(selected);
  if(!S(selected))$('#resultsSession').value=state.currentSessionId;
  const s=S($('#resultsSession').value)||ensureSession(),stats=playerSessionStats(s);
  $('#resultsOverview').innerHTML=`<div class="result-cards"><div class="result-card"><small>SESSION</small><b>${s.name}</b><span>${niceDate(s.date)}</span></div><div class="result-card"><small>GAMES</small><b>${s.matches.length}</b></div><div class="result-card"><small>PLAYERS</small><b>${s.playerIds.length}</b></div><div class="result-card"><small>ROUNDS GENERATED</small><b>${s.round}</b></div></div>`;
  $('#standings').innerHTML=stats.some(x=>x.games)?standingsTable(stats):'<p class="muted">No standings yet. Record a score to populate rankings.</p>';
  $('#gameLog').innerHTML=s.matches.length?`<div class="table-wrap"><table><thead><tr><th>Game</th><th>Round / Court</th><th>Team A</th><th>Score</th><th>Team B</th><th>Winner</th></tr></thead><tbody>${s.matches.map((m,i)=>{const an=m.A.map(P).map(x=>x.name).join(' + '),bn=m.B.map(P).map(x=>x.name).join(' + '),win=m.scoreA>m.scoreB?'Team A':'Team B';return `<tr><td>Game ${i+1}</td><td>R${m.round} / C${m.court}</td><td>${an}</td><td><b>${m.scoreA}–${m.scoreB}</b></td><td>${bn}</td><td>${win}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="muted">No games recorded.</p>';
}
$('#resultsSession').onchange=renderResults;
function standingsTable(rows,compact=false){
  const list=compact?rows.slice(0,4):rows;
  return `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Player</th><th>W</th><th>L</th><th>Win %</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>${list.map((r,i)=>`<tr class="${i===0?'winner-row':''}"><td class="rank">${i+1}</td><td><b>${r.name}</b></td><td>${r.wins}</td><td>${r.losses}</td><td>${r.games?Math.round(100*r.wins/r.games):0}%</td><td>${r.pointsFor}</td><td>${r.pointsAgainst}</td><td>${r.diff>0?'+':''}${r.diff}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderPlayers(){
  const q=$('#search').value.toLowerCase(),show=$('#showArchived').checked,ps=state.players.filter(p=>(show||!p.archived)&&p.name.toLowerCase().includes(q));
  $('#playerCards').innerHTML=ps.map(p=>{const lo=clamp(p.internal-p.rd,1,8),hi=clamp(p.internal+p.rd,1,8),wp=p.games?Math.round(100*p.wins/p.games):0;return `<div class="match ${p.archived?'archived':''}"><div class="head"><div><h3>${p.name}</h3><span class="muted">Age ${p.age} · ${p.gender||'Gender not listed'} · ${p.handedness} · ${p.club||'No club'}</span></div><span class="pill">${p.archived?'Archived':'Active'}</span></div><div class="stats"><div class="stat"><b>${p.internal.toFixed(2)}</b><small>Internal</small></div><div class="stat"><b>${p.session.toFixed(2)}</b><small>Session</small></div><div class="stat"><b>${wp}%</b><small>Win rate</small></div></div><small>Internal rating error bars</small>${error(p.internal,lo,hi)}<p><span class="tag">${p.side} side</span><span class="tag">${p.style}</span><span class="tag">${p.games} games</span></p><div class="actions"><button class="secondary" data-edit="${p.id}">Edit</button><button class="${p.archived?'':'danger'}" data-archive="${p.id}">${p.archived?'Restore':'Archive'}</button></div></div>`}).join('');
  $$('[data-edit]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.edit));
  $$('[data-archive]').forEach(b=>b.onclick=()=>{const p=P(b.dataset.archive);p.archived=!p.archived;state.sessions.forEach(s=>{if(p.archived)s.playerIds=s.playerIds.filter(id=>id!==p.id)});save();render();toast(p.archived?'Player archived':'Player restored')});
}
$('#search').oninput=renderPlayers;$('#showArchived').onchange=renderPlayers;

function renderSelects(){
  const pOpts=activePlayers().map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  ['chemA','chemB','chemPlayer'].forEach(id=>{const e=$('#'+id),v=e.value;e.innerHTML='<option value="">All / choose…</option>'+pOpts;if([...e.options].some(x=>x.value===v))e.value=v});
  const cs=$('#chemSession'),cv=cs.value||state.currentSessionId;cs.innerHTML='<option value="all">All sessions</option>'+sessionOptions(cv);if(cv==='all')cs.value='all';
}
function chemistryRows(){
  const sessionId=$('#chemSession').value||state.currentSessionId,filterId=$('#chemPlayer').value;
  const allowedKeys=new Set();
  if(sessionId!=='all'){
    const s=S(sessionId);
    (s?.matches||[]).forEach(m=>{allowedKeys.add(pk(...m.A));allowedKeys.add(pk(...m.B))});
  }
  return Object.entries(state.chem).map(([key,c])=>{const [a,b]=key.split('|'),A=P(a),B=P(b);return {key,a,b,A,B,c,overall:co(c),confidence:conf(c)}})
    .filter(r=>r.A&&r.B&&(!filterId||r.a===filterId||r.b===filterId)&&(sessionId==='all'||allowedKeys.has(r.key)))
    .sort((x,y)=>y.overall-x.overall||y.c.games-x.c.games);
}
function renderChem(){
  const a=$('#chemA').value,b=$('#chemB').value;
  if(!a||!b||a===b)$('#chemPanel').innerHTML='<p class="muted">Choose two different players for a detailed profile.</p>';
  else{
    const A=P(a),B=P(b),c=C(a,b),o=co(c),cf=conf(c),half=clamp(2.2*(1-cf/100)+.25,.25,2.4),lo=clamp(o-half,1,10),hi=clamp(o+half,1,10);
    const rows=[['Communication','communication'],['Court coverage','coverage'],['Transition game','transition'],['Finishing','finishing'],['Consistency','consistency'],['Enjoyment','enjoyment']],why=[];
    if(A.side!=='Either'&&B.side!=='Either'&&A.side!==B.side)why.push('Their preferred court sides complement each other.');
    if((A.style.includes('Aggressive')&&B.style.includes('reset'))||(B.style.includes('Aggressive')&&A.style.includes('reset')))why.push('An attacking player is paired with a reset-oriented stabilizer.');
    why.push(c.games<5?'Low sample: the error bars remain wide.':`Based on ${c.games} recorded games together.`);
    $('#chemPanel').innerHTML=`<div class="head"><div><h2>${A.name} + ${B.name}</h2><p class="muted">${c.games} games · ${c.wins} wins · ${cf}% confidence</p></div><div class="big">${o.toFixed(1)}</div></div><small>Overall chemistry error bars</small>${error(o,lo,hi,1,10,1)}${rows.map(r=>`<div class="chemrow"><b>${r[0]}</b><div class="bar"><span style="width:${c[r[1]]*10}%"></span></div><strong>${c[r[1]].toFixed(1)}</strong></div>`).join('')}<div class="why"><b>Why?</b><ul>${why.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  }
  const rows=chemistryRows();
  $('#chemTable').innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Partnership</th><th>Games</th><th>Wins</th><th>Win %</th><th>Chemistry</th><th>Confidence</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td class="rank">${i+1}</td><td><b>${r.A.name} + ${r.B.name}</b></td><td>${r.c.games}</td><td>${r.c.wins}</td><td>${r.c.games?Math.round(100*r.c.wins/r.c.games):0}%</td><td>${r.overall.toFixed(1)}</td><td>${r.confidence}%</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No partnership results match this filter yet.</p>';
}
['chemA','chemB','chemPlayer','chemSession'].forEach(id=>$('#'+id).onchange=renderChem);

$('#addBtn').onclick=()=>openPlayer();
function openPlayer(id){
  const p=id?P(id):{id:'',name:'',age:'',rating:3.5,handedness:'Right',gender:'',side:'Either',style:'Balanced',club:'',email:'',phone:'',duprId:'',notes:'',consent:false};
  $('#formTitle').textContent=id?'Edit player':'Add player';
  for(const k of ['id','name','age','rating','handedness','gender','side','style','club','email','phone','duprId','notes','consent']){
    const e=$('#'+(k==='id'?'pid':k));e.type==='checkbox'?e.checked=!!p[k]:e.value=p[k]??'';
  }
  $('#playerDialog').showModal();
}
function closePlayer(){$('#playerDialog').close()}
$$('[data-close]').forEach(b=>b.onclick=closePlayer);
$('#playerDialog').onclick=e=>{if(e.target===$('#playerDialog'))closePlayer()};
$('#playerForm').onsubmit=e=>{
  e.preventDefault();const id=$('#pid').value,old=id?P(id):null,r=+$('#rating').value||3.5;
  const p={...(old||{}),id:id||uid(),name:$('#name').value.trim(),age:+$('#age').value,rating:r,internal:old?.internal??r,session:old?.session??r,rd:old?.rd??.5,handedness:$('#handedness').value,gender:$('#gender').value,side:$('#side').value,style:$('#style').value,club:$('#club').value,email:$('#email').value,phone:$('#phone').value,duprId:$('#duprId').value,notes:$('#notes').value,consent:$('#consent').checked,archived:old?.archived??false,wins:old?.wins??0,losses:old?.losses??0,games:old?.games??0};
  if(old)Object.assign(old,p);else{state.players.push(p);ensureSession().playerIds.push(p.id)}
  save();closePlayer();render();toast(old?'Player updated':'Player added');
};

const metrics=[['Communication','communication'],['Court coverage','coverage'],['Transition game','transition'],['Finishing','finishing'],['Consistency','consistency'],['Enjoyment','enjoyment']];
$('#ratingInputs').innerHTML=metrics.map((x,i)=>`<label class="slider">${x[0]}<input id="f-${x[1]}" type="range" min="1" max="10" value="${i===5?8:7}"><output>${i===5?8:7}</output></label>`).join('');
$$('#ratingInputs input').forEach(x=>x.oninput=()=>x.nextElementSibling.value=x.value);
function openResult(id){
  const m=matches.find(x=>x.id===id);
  $('#matchId').value=id;
  $('#resultTeamA').textContent=m.A.map(P).map(x=>x.name).join(' + ');
  $('#resultTeamB').textContent=m.B.map(P).map(x=>x.name).join(' + ');
  $('#scoreA').value='';$('#scoreB').value='';
  $('#resultDialog').showModal();
}
$$('[data-result-close]').forEach(b=>b.onclick=()=>$('#resultDialog').close());
$('#resultDialog').onclick=e=>{if(e.target===$('#resultDialog'))$('#resultDialog').close()};
$('#resultForm').onsubmit=e=>{
  e.preventDefault();
  const m=matches.find(x=>x.id===$('#matchId').value),sa=+$('#scoreA').value,sb=+$('#scoreB').value;
  if(!m)return toast('Match not found.');
  if(sa===sb)return toast('A match cannot end tied.');
  if(sa<0||sb<0||sa>21||sb>21)return toast('Enter scores from 0 to 21.');
  const aw=sa>sb,k=.1;
  [...m.A.map(P),...m.B.map(P)].forEach((p,i)=>{const won=i<2?aw:!aw,ex=i<2?m.pr:1-m.pr;p.games++;won?p.wins++:p.losses++;p.internal=clamp(p.internal+k*((won?1:0)-ex),1,8);p.session=clamp(p.session+.16*((won?1:0)-ex),1,8);p.rd=clamp(p.rd*.94,.06,.6)});
  for(const [ids,won] of [[m.A,aw],[m.B,!aw]]){
    const old=C(...ids),n=old.games,u={...old,games:n+1,wins:old.wins+(won?1:0)};
    for(const [_,key] of metrics){const v=+$('#f-'+key).value;u[key]=old[key]+(v-old[key])/(n+1)}
    u.effect=clamp(old.effect*.9+((won?1:0)-.5)*.08,-.5,.5);state.chem[pk(...ids)]=u;
  }
  const s=ensureSession();s.matches.push({...m,scoreA:sa,scoreB:sb,date:new Date().toISOString()});
  matches=matches.filter(x=>x.id!==m.id);
  save();$('#resultDialog').close();render();renderMatches();renderHealth();toast('Result recorded — standings updated');
};

function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$('#exportJson').onclick=()=>dl('pickleball-intelligence-backup.json',JSON.stringify(state,null,2),'application/json');
$('#exportCsv').onclick=()=>{const h=['name','age','rating','internal','handedness','gender','side','style','club','email','phone','duprId','wins','losses','games','archived'],r=state.players.map(p=>h.map(k=>`"${String(p[k]??'').replaceAll('"','""')}"`).join(','));dl('pickleball-roster.csv',[h.join(','),...r].join('\n'),'text/csv')};
$('#csv').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;const t=await f.text(),lines=t.trim().split(/\r?\n/),h=parse(lines.shift()).map(x=>x.toLowerCase().trim()),rows=lines.map(l=>{const v=parse(l),o={};h.forEach((x,i)=>o[x]=v[i]||'');return o}).filter(x=>x.name||x.player);
  $('#preview').innerHTML=`<p><b>${rows.length}</b> players detected.</p><button id="confirm">Import valid rows</button>`;
  $('#confirm').onclick=()=>{let n=0;for(const r of rows){const name=r.name||r.player,age=+r.age;if(!name||!age)continue;const rt=+(r.rating||r.dupr||3.5),id=uid();state.players.push({id,name,age,rating:rt,internal:rt,session:rt,rd:.5,handedness:r.handedness||r.hand||'Right',gender:r.gender||'',side:r.side||'Either',style:r.style||'Balanced',club:r.club||'',email:r.email||'',phone:r.phone||'',duprId:r.duprid||r['dupr id']||'',notes:r.notes||'',consent:false,archived:false,wins:0,losses:0,games:0});ensureSession().playerIds.push(id);n++}save();render();$('#preview').innerHTML='';toast(n+' players imported')};
};
function parse(s){const o=[];let c='',q=false;for(let i=0;i<s.length;i++){const x=s[i];if(x==='"'&&s[i+1]==='"'){c+='"';i++}else if(x==='"')q=!q;else if(x===','&&!q){o.push(c);c=''}else c+=x}o.push(c);return o}
$('#reset').onclick=()=>{if(confirm('Reset all local data?')){localStorage.removeItem(KEY);localStorage.removeItem(OLD_KEY);location.reload()}};

render();
