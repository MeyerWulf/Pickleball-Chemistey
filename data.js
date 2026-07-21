import {uid} from './store.js';
const today=new Date().toISOString().slice(0,10);
export function demoState(){
 const players=[
 ['Aaron',55,'Male',4.31,'Either','Control'],['Julie',42,'Female',4.18,'Right','Setup / Facilitator'],
 ['Brad',38,'Male',4.44,'Left','Power'],['Don',51,'Male',4.22,'Either','Balanced'],
 ['Dani',35,'Female',4.08,'Right','Counterpuncher'],['Kim',47,'Female',4.35,'Left','Balanced'],
 ['Chris',44,'Male',4.12,'Either','Control'],['Maya',39,'Female',4.27,'Right','Power']
 ].map((p,i)=>({id:`p${i+1}`,name:p[0],age:p[1],gender:p[2],dupr:p[3],side:p[4],style:p[5],phone:'',email:'',archived:false}));
 const games=[
  {id:'g1',court:1,teamA:['p1','p2'],teamB:['p3','p4'],scoreA:11,scoreB:8,competitiveness:8,chemA:8,chemB:6,status:'completed'},
  {id:'g2',court:2,teamA:['p5','p6'],teamB:['p7','p8'],scoreA:7,scoreB:11,competitiveness:7,chemA:7,chemB:8,status:'completed'},
  {id:'g3',court:1,teamA:['p1','p3'],teamB:['p2','p4'],scoreA:null,scoreB:null,competitiveness:null,chemA:null,chemB:null,status:'scheduled'},
  {id:'g4',court:2,teamA:['p5','p7'],teamB:['p6','p8'],scoreA:null,scoreB:null,competitiveness:null,chemA:null,chemB:null,status:'scheduled'}
 ];
 return {
  event:{id:uid('event'),name:'Tuesday Night Thunder',date:today,plannedStages:'3',customStageCount:4,courts:4,mode:'balanced',status:'active'},
  players,
  stages:[
   {id:'s1',name:'Stage 1 — Calibration',format:'round-robin',status:'in-progress',games},
   {id:'s2',name:'Stage 2 — Ranked Partnerships',format:'ranked-pairing',status:'planned',games:[]},
   {id:'s3',name:'Stage 3 — Fixed Partners',format:'fixed-partner',status:'planned',games:[]}
  ],
  chemistry:{}
 };
}
