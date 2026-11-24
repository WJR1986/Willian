// A lightweight DOM fixture checks game flow without third-party packages.
// This is not a substitute for a real-browser layout/accessibility check.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as core from '../js/core.js';
class Element {
 constructor(){this.value='';this.children=[];this.hidden=false;this.textContent='';this.style={};this.files=[];}
 append(...items){this.children.push(...items);}
 add(item){this.children.push(item);}
 replaceChildren(){this.children=[];}
 focus(){} select(){} click(){}
}
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url),'utf8'));
function setup(initial){const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));nodes.mode.value='random';nodes.difficulty.value='general';let stored=initial,timer;const storage={getItem:()=>stored,setItem:(k,v)=>{stored=v;}};const listeners={};const document={getElementById:id=>nodes[id],createElement:()=>new Element(),createTextNode:t=>t,addEventListener:(k,f)=>{listeners[k]=f;}};const window={scrollTo(){},addEventListener:(k,f)=>{listeners[k]=f;}};let uid=0;const fn=new Function(...Object.keys(core),'document','window','localStorage','fetch','Option','crypto','setInterval','clearInterval','confirm','navigator',source);fn(...Object.values(core),document,window,storage,async()=>({ok:true,json:async()=>bank}),function(text,value){this.text=text;this.value=value;},{randomUUID:()=>String(++uid)},f=>{timer=f;return 1;},()=>{timer=null;},()=>true,{clipboard:{writeText:async()=>{}}});return {nodes,listeners,read:()=>JSON.parse(stored),timer:()=>timer?.()};}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const event={preventDefault(){}};
test('full game records once; replay, abort, profile isolation and reload',async()=>{const s=setup();await settle();const n=s.nodes;n['player-name'].value='Will';n['add-player'].onsubmit(event);n['player-name'].value='Alex';n['add-player'].onsubmit(event);n.player.value='1';n.player.onchange();n.mode.value='challenge';n['match-code'].value='FRIDAY-01';n.launch.onclick();const first=n.question.textContent;n.answer.value='constructor';n['answer-form'].onsubmit(event);assert.match(n.feedback.textContent,/Not in/);for(let i=0;i<7;i++){const q=bank.questions.find(q=>q.text===n.question.textContent);n.answer.value=q.answers.reduce((a,b)=>a.points>=b.points?a:b).text;n['answer-form'].onsubmit(event);n['answer-form'].onsubmit(event);n.next.onclick();}assert.match(n['result-summary'].textContent,/700\/700/);n.next.onclick();assert.equal(s.read().players[0].games,1);assert.equal(s.read().players[0].best,700);assert.equal(s.read().players[1].games,0);n.again.onclick();assert.equal(n.question.textContent,first);n.abort.onclick();assert.equal(s.read().players[0].games,1);const reload=setup(JSON.stringify(s.read()));await settle();assert.equal(reload.read().selected,'1');assert.equal(reload.nodes.launch.disabled,false);});
test('timeout uses deadline; skip scores zero; malformed restore preserves profiles',async()=>{const s=setup();await settle();const n=s.nodes;n['player-name'].value='Will';n['add-player'].onsubmit(event);n.launch.onclick();const originalNow=Date.now;try{Date.now=()=>originalNow()+26000;s.timer();assert.match(n.feedback.textContent,/Time ran out/);}finally{Date.now=originalNow;}n.next.onclick();assert.equal(n.seconds.textContent,'25s');n.skip.onclick();assert.match(n.feedback.textContent,/Skipped/);n.abort.onclick();const before=s.read();n.import.files=[{size:50,text:async()=>'{}'}];await n.import.onchange({target:n.import});assert.match(n.notice.textContent,/Backup not imported/);assert.deepEqual(s.read(),before);const incoming={version:1,players:[{id:'restore',name:'Restored',games:2,best:200,total:300,correct:3,deck:[]}],selected:'restore'};n.import.files=[{size:200,text:async()=>JSON.stringify(incoming)}];await n.import.onchange({target:n.import});assert.deepEqual(s.read(),incoming);});
test('ambiguous answer keeps round open; typo/short match feedback shows canonical answer and scores once',async()=>{
 const s=setup();await settle();const n=s.nodes;
 n['player-name'].value='Will';n['add-player'].onsubmit(event);n.mode.value='challenge';
 n.difficulty.value='hard';let code=0;while(core.challenge(core.difficultyBank(bank,'hard'),String(code))[0].id!=='henry')code++;
 n['match-code'].value=String(code);n.launch.onclick();
 n.answer.value='Catherine';n['answer-form'].onsubmit(event);
 assert.match(n.feedback.textContent,/more than one/);assert.equal(n.answer.disabled,false);assert.equal(n.next.hidden,true);assert.equal(n.score.textContent,'0 / 700');
 n.answer.value='Bolein';n['answer-form'].onsubmit(event);
 assert.match(n.feedback.textContent,/Accepted as Anne Boleyn/);assert.equal(n.score.textContent,'10 / 700');assert.equal(n.next.hidden,false);
 n['answer-form'].onsubmit(event);assert.equal(n.score.textContent,'10 / 700');
});
test('each pilot gets same daily; one completed daily each; practice remains available',async()=>{
 const s=setup();await settle();const n=s.nodes;
 n['player-name'].value='Will';n['add-player'].onsubmit(event);n.mode.value='daily';n.mode.onchange();
 n.launch.onclick();const prompts=[];
 for(let i=0;i<7;i++){prompts.push(n.question.textContent);n.skip.onclick();n.next.onclick();}
 const date=core.londonDate();assert.equal(s.read().players[0].daily[date].score,0);assert.equal(n.launch.disabled,true);
 n.home.onclick();n.launch.onclick();assert.match(n.notice.textContent,/already completed/);assert.equal(s.read().players[0].games,1);
 n.again.onclick();assert.equal(n.mode.value,'random');assert.equal(n.answer.disabled,false);n.abort.onclick();
 n['player-name'].value='Alex';n['add-player'].onsubmit(event);n.mode.value='daily';n.mode.onchange();assert.equal(n.launch.disabled,false);n.launch.onclick();
 for(let i=0;i<7;i++){assert.equal(n.question.textContent,prompts[i]);n.skip.onclick();n.next.onclick();}
 assert.equal(s.read().players[1].daily[date].score,0);assert.equal(n['daily-board'].children.length,2);
 const reload=setup(JSON.stringify(s.read()));await settle();reload.nodes.mode.value='daily';reload.nodes.mode.onchange();assert.equal(reload.nodes.launch.disabled,true);
});
test('daily captures launch date across midnight and next date becomes available',async()=>{
 const RealDate=Date;let now='2026-11-15T23:59:50Z';
 globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return new RealDate(now).getTime();}};
 try{
  const s=setup();await settle();const n=s.nodes;n['player-name'].value='Will';n['add-player'].onsubmit(event);n.mode.value='daily';n.launch.onclick();
  now='2026-11-16T00:00:01Z';for(let i=0;i<7;i++){n.skip.onclick();n.next.onclick();}
  assert.equal(s.read().players[0].daily['2026-11-15'].score,0);assert.equal(s.read().players[0].daily['2026-11-16'],undefined);
  n.home.onclick();assert.equal(n.launch.disabled,false);n.launch.onclick();assert.match(n['mission-label'].textContent,/2026-11-16/);
 }finally{globalThis.Date=RealDate;}
});
