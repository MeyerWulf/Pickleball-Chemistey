export const fmt=n=>Number(n||0).toFixed(2);
export function playerName(state,id){return state.players.find(p=>p.id===id)?.name||'Unknown'}
export function teamName(state,ids){return ids.map(id=>playerName(state,id)).join(' + ')}
export function allCompletedGames(state,stageId='all'){
 return state.stages.flatMap(s=>(stageId==='all'||s.id===stageId)?s.games.map(g=>({...g,stageId:s.id,stageName:s.name})):[])
  .filter(g=>g.status==='completed'&&Number.isFinite(g.scoreA)&&Number.isFinite(g.scoreB));
}
export function standings(state,stageId='all'){
 const rows=new Map(state.players.filter(p=>!p.archived).map(p=>[p.id,{id:p.id,name:p.name,dupr:+p.dupr,w:0,l:0,pf:0,pa:0,games:0,performance:0}]));
 for(const g of allCompletedGames(state,stageId)){
  const aWin=g.scoreA>g.scoreB;
  for(const id of g.teamA){const r=rows.get(id);if(!r)continue;r.games++;r.pf+=g.scoreA;r.pa+=g.scoreB;r.w+=aWin?1:0;r.l+=aWin?0:1}
  for(const id of g.teamB){const r=rows.get(id);if(!r)continue;r.games++;r.pf+=g.scoreB;r.pa+=g.scoreA;r.w+=aWin?0:1;r.l+=aWin?1:0}
 }
 const result=[...rows.values()].map(r=>{
   const diff=r.pf-r.pa, winPct=r.games?r.w/r.games:0;
   const session=r.games?Math.max(1,Math.min(8,r.dupr+(winPct-.5)*.34+diff/Math.max(1,r.games)*.012)):r.dupr;
   const confidence=Math.min(95,25+r.games*15);
   return {...r,diff,winPct,session,delta:session-r.dupr,confidence};
 }).sort((a,b)=>b.w-a.w||b.diff-a.diff||b.pf-a.pf||b.session-a.session);
 return result.map((r,i)=>({...r,rank:i+1}));
}
export function stageProgress(stage){
 const total=stage.games.length,done=stage.games.filter(g=>g.status==='completed').length;
 return {total,done,pct:total?Math.round(done/total*100):0};
}
export function predictedScore(state,teamA,teamB){
 const avg=ids=>ids.reduce((s,id)=>s+(state.players.find(p=>p.id===id)?.dupr||3.5),0)/Math.max(1,ids.length);
 const d=avg(teamA)-avg(teamB),prob=1/(1+Math.exp(-d*2.4));
 return Math.round(prob*100);
}
export function projection(state,stage){
 const rows=standings(state,'all');
 if(stage.format==='ranked-pairing'||stage.format==='resort'){
   const teams=[];
   for(let i=0,j=rows.length-1;i<j;i++,j--)teams.push([rows[i],rows[j]]);
   return teams.map((t,i)=>({label:`Projected Team ${i+1}`,players:t.map(x=>x.name),basis:`Ranks ${t[0].rank} + ${t[1].rank}`}));
 }
 if(stage.format==='fixed-partner'){
   const prior=[...state.stages].reverse().find(s=>s.games.some(g=>g.status==='completed'));
   if(!prior)return[];
   const pairs=new Map();
   for(const g of prior.games.filter(g=>g.status==='completed'))for(const pair of [g.teamA,g.teamB]){
      const key=[...pair].sort().join('|');pairs.set(key,(pairs.get(key)||0)+1)
   }
   return [...pairs.entries()].sort((a,b)=>b[1]-a[1]).map(([k],i)=>({label:`Projected Team ${i+1}`,players:k.split('|').map(id=>playerName(state,id)),basis:'Recent partnership'}));
 }
 return [];
}
export function chemistryRows(state){
 const map=new Map();
 for(const g of allCompletedGames(state)){
  [[g.teamA,g.chemA],[g.teamB,g.chemB]].forEach(([ids,val])=>{
   if(!val)return;const key=[...ids].sort().join('|'),cur=map.get(key)||{sum:0,n:0};cur.sum+=+val;cur.n++;map.set(key,cur)
  })
 }
 return [...map.entries()].map(([key,v])=>({ids:key.split('|'),score:v.sum/v.n,n:v.n,confidence:Math.min(95,25+v.n*20)})).sort((a,b)=>b.score-a.score);
}
