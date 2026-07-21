import {loadState,saveState,clearState,uid} from './store.js';
import {demoState} from './data.js';
import {standings,stageProgress,teamName,predictedScore,projection,chemistryRows,allCompletedGames,playerName,fmt} from './engine.js';

let state=loadState()||demoState();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function persist(){saveState(state)}
function formatDate(d){if(!d)return'';return new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
function activeStage(){return state.stages.find(s=>s.status==='in-progress')||state.stages.find(s=>s.status==='planned')}
function render(){
 persist(); renderHeader(); renderEvent(); renderStages(); renderResults(); renderPlayers(); renderChemistry(); bindDynamic();
}
function renderHeader(){
 $('#headerEventName').textContent=state.event.name;$('#headerEventDate').textContent=formatDate(state.event.date);
 $('#eventStatusBadge').textContent=state.event.status==='ended'?'Ended':'Active';
}
function renderEvent(){
 $('#eventName').value=state.event.name;$('#eventDate').value=state.event.date;$('#plannedStages').value=state.event.plannedStages;
 $('#customStagesWrap').classList.toggle('hidden',state.event.plannedStages!=='custom');$('#customStageCount').value=state.event.customStageCount||4;
 $('#courtCount').value=state.event.courts;$('#matchmakingMode').value=state.event.mode;
 const completed=state.stages.filter(s=>s.status==='completed').length,played=allCompletedGames(state).length,planned=state.event.plannedStages==='open'?'Open':state.event.plannedStages==='custom'?state.event.customStageCount:state.event.plannedStages;
 $('#eventMetrics').innerHTML=`<div class="metric"><span>Planned</span><strong>${planned}</strong><small>stages</small></div><div class="metric"><span>Completed</span><strong>${completed}</strong><small>stages</small></div><div class="metric"><span>Games entered</span><strong>${played}</strong><small>counted</small></div>`;
 const s=activeStage();
 $('#liveBoard').innerHTML=s?stageHtml(s,true):`<div class="empty">No active or planned stage. Add another stage to continue playing.</div>`;
}
function stageHtml(s,compact=false){
 const p=stageProgress(s),proj=projection(state,s);
 const games=s.games.length?`<div class="game-grid">${s.games.map(gameHtml).join('')}</div>`:`<div class="empty">${s.status==='planned'?'This stage is projected but not generated yet. Start it to create assignments.':'No games yet.'}</div>`;
 return `<article class="${compact?'':'card'} stage-card">
 <div class="stage-head"><div><h3>${esc(s.name)}</h3><div class="stage-meta"><span class="status ${s.status}">${esc(s.status.replace('-',' '))}</span><span class="status">${esc(formatLabel(s.format))}</span><span class="status">${p.done}/${p.total} games</span></div></div><strong>${p.pct}%</strong></div>
 ${games}
 ${proj.length?`<h4>Forward look</h4><div class="game-grid">${proj.map(x=>`<div class="projection"><strong>${esc(x.label)}</strong><div>${x.players.map(esc).join(' + ')}</div><small>${esc(x.basis)}</small></div>`).join('')}</div>`:''}
 ${compact?'':`<div class="stage-controls"><button data-stage-action="start" data-id="${s.id}">Start / generate</button><button data-stage-action="complete" data-id="${s.id}">Mark complete</button><button data-stage-action="skip" data-id="${s.id}">Skip</button><button data-stage-action="cancel" data-id="${s.id}">Cancel</button></div>`}
 </article>`;
}
function gameHtml(g){
 const scored=g.status==='completed';
 return `<div class="game"><small>Court ${g.court}</small><div class="teams"><div class="team-a"><strong>Team A</strong><br>${esc(teamName(state,g.teamA))}</div><div class="score">${scored?`${g.scoreA}–${g.scoreB}`:'vs'}</div><div class="team-b"><strong>Team B</strong><br>${esc(teamName(state,g.teamB))}</div></div>
 <small>Projected Team A win: ${predictedScore(state,g.teamA,g.teamB)}%</small>
 <div class="action-row"><button data-score="${g.id}">${scored?'Edit score':'Enter score'}</button>${scored?`<button data-delete-score="${g.id}" class="danger-soft">Delete result</button>`:''}</div></div>`;
}
function renderStages(){$('#stageList').innerHTML=state.stages.map(s=>stageHtml(s)).join('')||'<div class="empty">No stages yet.</div>'}
function renderResults(){
 const sel=$('#resultsStageFilter'),old=sel.value||'all';
 sel.innerHTML=`<option value="all">All stages</option>${state.stages.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}`;sel.value=[...sel.options].some(o=>o.value===old)?old:'all';
 const rows=standings(state,sel.value);
 $('#standingsBody').innerHTML=rows.map(r=>`<tr><td>${r.rank}</td><td><strong>${esc(r.name)}</strong></td><td>${fmt(r.dupr)}</td><td>${fmt(r.session)}</td><td class="delta ${r.delta>=0?'pos':'neg'}">${r.delta>=0?'+':''}${fmt(r.delta)}</td><td>${r.w}</td><td>${r.l}</td><td>${Math.round(r.winPct*100)}%</td><td>${r.pf}</td><td>${r.pa}</td><td>${r.diff>0?'+':''}${r.diff}</td><td><div class="confidence"><div class="confidence-bar"><i style="width:${r.confidence}%"></i></div>${r.confidence}%</div></td></tr>`).join('');
 const games=allCompletedGames(state,sel.value);
 $('#gameLog').innerHTML=games.length?games.slice().reverse().map(g=>`<div class="log-row"><strong>${esc(g.stageName)}</strong><span>${esc(teamName(state,g.teamA))} <b>${g.scoreA}–${g.scoreB}</b> ${esc(teamName(state,g.teamB))}</span><div><button data-score="${g.id}">Edit</button> <button data-delete-score="${g.id}" class="danger-soft">Delete</button></div></div>`).join(''):'<div class="empty">No recorded games for this filter.</div>';
}
function renderPlayers(){
 $('#playerGrid').innerHTML=state.players.filter(p=>!p.archived).map(p=>`<article class="player-card"><h3>${esc(p.name)}</h3><p class="muted">DUPR ${fmt(p.dupr)} · Age ${p.age}</p><div class="chips"><span class="chip">${esc(p.gender||'Not specified')}</span><span class="chip">${esc(p.side)}</span><span class="chip">${esc(p.style)}</span></div><div class="action-row"><button data-edit-player="${p.id}">Edit</button><button data-archive-player="${p.id}">Archive</button></div></article>`).join('');
}
function renderChemistry(){
 const filter=$('#chemistryPlayerFilter'),old=filter.value||'all';
 filter.innerHTML=`<option value="all">All players</option>${state.players.filter(p=>!p.archived).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}`;filter.value=[...filter.options].some(o=>o.value===old)?old:'all';
 const rows=chemistryRows(state).filter(r=>filter.value==='all'||r.ids.includes(filter.value));
 $('#chemistryList').innerHTML=rows.length?rows.map(r=>`<div class="chem-row"><strong>${r.ids.map(id=>esc(playerName(state,id))).join(' + ')}</strong><span>${r.n} rated game${r.n===1?'':'s'}</span><span>${r.score.toFixed(1)}/10</span><span>${r.confidence}% conf.</span></div>`).join(''):'<div class="empty">Chemistry appears after scored games include partnership feedback.</div>';
}
function formatLabel(v){return ({'round-robin':'Round-robin calibration','ranked-pairing':'Ranked partner pairing','fixed-partner':'Fixed-partner competition','resort':'Re-sort by standings','custom':'Custom'})[v]||v}
function bindDynamic(){
 $$('[data-score]').forEach(b=>b.onclick=()=>openScore(b.dataset.score));
 $$('[data-delete-score]').forEach(b=>b.onclick=()=>deleteScore(b.dataset.deleteScore));
 $$('[data-edit-player]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.editPlayer));
 $$('[data-archive-player]').forEach(b=>b.onclick=()=>archivePlayer(b.dataset.archivePlayer));
 $$('[data-stage-action]').forEach(b=>b.onclick=()=>stageAction(b.dataset.id,b.dataset.stageAction));
}
function findGame(id){for(const s of state.stages){const g=s.games.find(x=>x.id===id);if(g)return {stage:s,game:g}}}
function openScore(id){
 const found=findGame(id);if(!found)return;const g=found.game;
 $('#scoreGameId').value=id;$('#scoreDialogTitle').textContent=g.status==='completed'?'Edit score':'Record score';
 $('#scoreTeamAName').textContent=`Team A — ${teamName(state,g.teamA)}`;$('#scoreTeamBName').textContent=`Team B — ${teamName(state,g.teamB)}`;
 $('#scoreA').value=g.scoreA??'';$('#scoreB').value=g.scoreB??'';$('#scoreCompetitive').value=g.competitiveness??7;$('#chemA').value=g.chemA??7;$('#chemB').value=g.chemB??7;syncOutputs();$('#scoreDialog').showModal();
}
function deleteScore(id){if(!confirm('Delete this result? Standings and ratings will recalculate.'))return;const f=findGame(id);Object.assign(f.game,{scoreA:null,scoreB:null,competitiveness:null,chemA:null,chemB:null,status:'scheduled'});render()}
function openPlayer(id=''){
 const p=state.players.find(x=>x.id===id);$('#playerDialogTitle').textContent=p?'Edit player':'Add player';$('#playerId').value=p?.id||'';$('#playerName').value=p?.name||'';$('#playerAge').value=p?.age||'';$('#playerGender').value=p?.gender||'';$('#playerDupr').value=p?.dupr||'';$('#playerSide').value=p?.side||'Either';$('#playerStyle').value=p?.style||'Balanced';$('#playerPhone').value=p?.phone||'';$('#playerEmail').value=p?.email||'';$('#playerDialog').showModal();
}
function archivePlayer(id){if(confirm('Archive this player? Their history will be preserved.')){state.players.find(p=>p.id===id).archived=true;render()}}
function stageAction(id,action){
 const s=state.stages.find(x=>x.id===id);if(!s)return;
 if(action==='start'){state.stages.forEach(x=>{if(x.status==='in-progress'&&x.id!==id)x.status='planned'});s.status='in-progress';if(!s.games.length)generateGames(s)}
 if(action==='complete')s.status='completed';
 if(action==='skip')s.status='skipped';
 if(action==='cancel')s.status='cancelled';
 render();
}
function generateGames(stage){
 const ids=standings(state).map(r=>r.id);
 if(ids.length<4)return;
 const teams=[];
 if(stage.format==='ranked-pairing'||stage.format==='resort'){for(let i=0,j=ids.length-1;i<j;i++,j--)teams.push([ids[i],ids[j]])}
 else {for(let i=0;i+1<ids.length;i+=2)teams.push([ids[i],ids[i+1]])}
 const games=[];for(let i=0;i+1<teams.length;i+=2)games.push({id:uid('game'),court:(i/2)%state.event.courts+1,teamA:teams[i],teamB:teams[i+1],scoreA:null,scoreB:null,competitiveness:null,chemA:null,chemB:null,status:'scheduled'});
 stage.games=games;
}
function addStage(){
 $('#stageName').value=`Stage ${state.stages.length+1}`;$('#stageFormat').value='round-robin';$('#stageDialog').showModal();
}
function syncOutputs(){['scoreCompetitive','chemA','chemB'].forEach(id=>$('#'+id+'Output').value=$('#'+id).value)}
$$('.tab').forEach(t=>t.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active'));$(`#view-${t.dataset.view}`).classList.add('active');render()});
$$('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
['scoreCompetitive','chemA','chemB'].forEach(id=>$('#'+id).oninput=syncOutputs);
$('#plannedStages').onchange=()=>$('#customStagesWrap').classList.toggle('hidden',$('#plannedStages').value!=='custom');
$('#saveEventBtn').onclick=()=>{Object.assign(state.event,{name:$('#eventName').value.trim()||'Untitled Event',date:$('#eventDate').value,plannedStages:$('#plannedStages').value,customStageCount:+$('#customStageCount').value||4,courts:+$('#courtCount').value||1,mode:$('#matchmakingMode').value});render()};
$('#startNextStageBtn').onclick=()=>{const s=state.stages.find(x=>x.status==='planned');if(s)stageAction(s.id,'start');else addStage()};
$('#addStageBtn').onclick=addStage;$('#addStageTopBtn').onclick=addStage;
$('#endEventBtn').onclick=()=>{if(confirm('End this event now? Unplayed stages will not count.')){state.event.status='ended';state.stages.filter(s=>s.status==='planned'||s.status==='in-progress').forEach(s=>{if(!s.games.some(g=>g.status==='completed'))s.status='cancelled'});render()}};
$('#stageForm').onsubmit=e=>{e.preventDefault();state.stages.push({id:uid('stage'),name:$('#stageName').value.trim(),format:$('#stageFormat').value,status:'planned',games:[]});$('#stageDialog').close();render()};
$('#scoreForm').onsubmit=e=>{e.preventDefault();const f=findGame($('#scoreGameId').value),a=+$('#scoreA').value,b=+$('#scoreB').value;if(a===b)return alert('Pickleball games cannot end in a tie.');Object.assign(f.game,{scoreA:a,scoreB:b,competitiveness:+$('#scoreCompetitive').value,chemA:+$('#chemA').value,chemB:+$('#chemB').value,status:'completed'});$('#scoreDialog').close();render()};
$('#playerForm').onsubmit=e=>{e.preventDefault();const id=$('#playerId').value,payload={name:$('#playerName').value.trim(),age:+$('#playerAge').value,gender:$('#playerGender').value,dupr:+$('#playerDupr').value,side:$('#playerSide').value,style:$('#playerStyle').value,phone:$('#playerPhone').value.trim(),email:$('#playerEmail').value.trim(),archived:false};if(id)Object.assign(state.players.find(p=>p.id===id),payload);else state.players.push({id:uid('player'),...payload});$('#playerDialog').close();render()};
$('#addPlayerBtn').onclick=()=>openPlayer();
$('#resultsStageFilter').onchange=renderResults;$('#chemistryPlayerFilter').onchange=renderChemistry;
$('#seedDemoBtn').onclick=()=>{if(confirm('Replace current local data with the demo event?')){state=demoState();render()}};
$('#clearDataBtn').onclick=()=>{if(confirm('Clear all local app data?')){clearState();state=demoState();render()}};
$('#exportJsonBtn').onclick=()=>download(`pickleball-event-${state.event.date}.json`,JSON.stringify(state,null,2),'application/json');
$('#exportCsvBtn').onclick=()=>{const rows=standings(state);const csv=['Rank,Player,DUPR,Session Rating,Delta,W,L,Win %,Points For,Points Against,Differential',...rows.map(r=>[r.rank,quote(r.name),r.dupr.toFixed(2),r.session.toFixed(2),r.delta.toFixed(2),r.w,r.l,Math.round(r.winPct*100),r.pf,r.pa,r.diff].join(','))].join('\n');download(`standings-${state.event.date}.csv`,csv,'text/csv')};
$('#importJsonInput').onchange=async e=>{try{const parsed=JSON.parse(await e.target.files[0].text());if(!parsed.event||!parsed.players||!parsed.stages)throw Error('Invalid file');state=parsed;render()}catch(err){alert(`Import failed: ${err.message}`)}e.target.value=''};
function quote(s){return `"${String(s).replaceAll('"','""')}"`}function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
render();
