import {matchAnswer,challenge,draw,validateBank,cleanBackup,zone,DIFFICULTIES,londonDate,difficultyBank,dailyQuestions} from './core.js';
const $=id=>document.getElementById(id), KEY='starbound.profiles.v1';
let bank, state={version:1,players:[],selected:''}, flight=null, tick=null, storageOK=true;
const notify=text=>{$('notice').textContent=text;$('notice').hidden=!text;};
try {const raw=localStorage.getItem(KEY);if(raw)state=cleanBackup(JSON.parse(raw));}catch{storageOK=false;notify('Saved profiles could not be read. This session can still be played, but existing data will not be overwritten. Export a backup of this session before leaving.');}
function save(){if(!storageOK)return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;notify('This browser could not save progress. Keep this tab open and export a backup before leaving.');}}
const player=()=>state.players.find(p=>p.id===state.selected);
function show(id){for(const name of ['lobby','game','results'])$(name).hidden=name!==id;window.scrollTo(0,0);}
function refresh(){
 $('player').replaceChildren();if(!state.players.length)$('player').add(new Option('Create a pilot to begin',''));
 for(const p of state.players)$('player').add(new Option(p.name,p.id));$('player').value=state.selected;
 const p=player();$('stats').replaceChildren();for(const [label,value] of [['Flights',p?.games||0],['Best score',p?.best||0],['Average',p?.games?Math.round(p.total/p.games):'—']]){const box=document.createElement('div');box.className='stat';const strong=document.createElement('strong');strong.textContent=value;box.append(strong,document.createTextNode(label));$('stats').append(box);}
 $('launch').disabled=!p||!bank;$('leaderboard').replaceChildren();for(const p of [...state.players].sort((a,b)=>b.best-a.best||b.total/Math.max(b.games,1)-a.total/Math.max(a.games,1))){const tr=document.createElement('tr');for(const v of [p.name,p.games,p.best,p.games?Math.round(p.total/p.games):'—']){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('leaderboard').append(tr);}if(!state.players.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='Your crew’s flights will appear here.';tr.append(td);$('leaderboard').append(tr);}
 refreshDaily();

}
$('add-player').onsubmit=e=>{e.preventDefault();const name=$('player-name').value.trim();if(!name)return;if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase())){notify('That pilot already exists. Select their profile above.');return;}if(state.players.length>=100){notify('This browser already has 100 profiles.');return;}const p={id:crypto.randomUUID(),name,games:0,total:0,best:0,correct:0,deck:[]};state.players.push(p);state.selected=p.id;save();$('player-name').value='';refresh();};
$('player').onchange=()=>{state.selected=$('player').value;save();refresh();};
function refreshDaily(){
 const today=londonDate(), completed=player()?.daily?.[today], daily=$('mode').value==='daily';
 $('daily-date').textContent=today+' · UK date';
 $('difficulty-field').hidden=daily;
 $('code-field').hidden=$('mode').value!=='challenge';
 $('daily-info').textContent=daily
   ? (completed?`Daily completed: ${completed.score}/700. Choose Practice for more games.`:`${today} · Same seven general-knowledge prompts for everyone. One completed daily per pilot; resets at midnight UK time.`)
   : 'Unlimited play. Choose Easy, General knowledge or Hard. Match codes also require the same difficulty.';
 $('launch').disabled=!player()||!bank||(daily&&!!completed);
 $('launch').textContent=daily?(completed?'Daily completed':'Launch daily ↗'):'Launch mission ↗';
 $('daily-board').replaceChildren();
 const rows=state.players.filter(p=>p.daily?.[today]).sort((a,b)=>b.daily[today].score-a.daily[today].score);
 for(const p of rows){const r=p.daily[today],tr=document.createElement('tr');for(const v of [p.name,r.score,r.version]){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('daily-board').append(tr);}
 if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent='No completed daily flights yet.';tr.append(td);$('daily-board').append(tr);}
}
$('mode').onchange=refreshDaily;
$('difficulty').onchange=refreshDaily;
function flightLabel(){return flight.mode==='daily'?`Daily ${flight.date} · General knowledge`:flight.mode==='challenge'?`Crew ${flight.code} · ${DIFFICULTIES[flight.difficulty]}`:`Practice · ${DIFFICULTIES[flight.difficulty]}`;}
function hud(){$('score').textContent=`${flight.score} / 700`;$('altitude').textContent=(flight.score*10).toLocaleString('en-GB');$('rocket').style.bottom=(15+75*flight.score/700)+'%';$('trail').style.height=(75*flight.score/700)+'%';}
let questions=[];
// Keep the selected bank snapshot for this flight, even if the lobby is changed later.
function start(){
 if(!bank||!player())return;
 const mode=$('mode').value, code=$('match-code').value.trim().toUpperCase();
 const date=londonDate(), difficulty=mode==='daily'?'general':$('difficulty').value;
 if(mode==='daily'&&player().daily?.[date]){notify('This pilot has already completed today’s daily. Choose Practice to keep playing.');refreshDaily();return;}
 const pool=difficultyBank(bank,difficulty);
 if(mode==='daily') questions=dailyQuestions(bank,date);
 else if(mode==='challenge'){
   if(!/^[A-Z0-9-]{1,30}$/.test(code)){notify('Use a match code of 1–30 letters, numbers or hyphens.');$('match-code').focus();return;}
   questions=challenge(pool,code);
 }else{
   player().decks ||= {};
   const result=draw(pool,player().decks[difficulty]);questions=result.questions;player().decks[difficulty]=result.deck;save();
 }
 flight={playerId:player().id,pilot:player().name,mode,code,date,difficulty,index:0,score:0,log:[],phase:'between'};
 $('mission-label').textContent=`${flight.pilot} / ${flightLabel()}`;show('game');loadRound();
}
$('launch').onclick=start;
function loadRound(){clearInterval(tick);flight.phase='answering';const q=questions[flight.index];$('round').textContent=`PROMPT ${flight.index+1} / 7`;$('category').textContent=q.category;$('question').textContent=q.text;$('answer').value='';$('answer').disabled=false;$('submit').disabled=false;$('skip').hidden=false;$('next').hidden=true;$('feedback').className='feedback';$('feedback').textContent='Your first accepted answer is final. Make it count.';hud();flight.deadline=Date.now()+25000;updateTimer();$('answer').focus();tick=setInterval(updateTimer,100);}
function updateTimer(){if(flight?.phase!=='answering')return;const left=Math.max(0,(flight.deadline-Date.now())/1000);$('seconds').textContent=Math.ceil(left)+'s';$('timer').value=left;if(left<=0)finishAnswer(null,'Time ran out');}
function finishAnswer(answer,reason,matchKind='exact'){if(flight?.phase!=='answering')return;flight.phase='feedback';clearInterval(tick);const points=answer?.points||0;flight.score+=points;flight.log.push({question:questions[flight.index],answer:answer?.text||reason,points});$('answer').disabled=true;$('submit').disabled=true;$('skip').hidden=true;$('next').hidden=false;$('next').textContent=flight.index===6?'See flight report →':'Next prompt →';$('feedback').className='feedback '+(points?'good':'bad');$('feedback').textContent=points?`${matchKind==='exact'?(points===100?'Stellar answer!':'Boost confirmed!'):'Accepted as'} ${answer.text} · +${points} points · +${points*10} km.`:`${reason}. No points this round.`;hud();$('next').focus();}
$('answer-form').onsubmit=e=>{e.preventDefault();if(flight?.phase!=='answering')return;if(Date.now()>=flight.deadline){updateTimer();return;}const raw=$('answer').value.trim();if(!raw)return;const match=matchAnswer(questions[flight.index],raw);if(match.status==='accepted')finishAnswer(match.answer,undefined,match.kind);else{$('feedback').className='feedback bad';$('feedback').textContent=match.status==='ambiguous'?'That could mean more than one answer. Add more detail — the timer is still running.':'Not in this question’s answer bank — it may still be valid. Try another answer before time runs out.';$('answer').select();}};
$('skip').onclick=()=>{if(flight?.phase==='answering'){if(Date.now()>=flight.deadline)updateTimer();else finishAnswer(null,'Skipped');}};
$('next').onclick=()=>{if(flight?.phase!=='feedback')return;flight.index++;if(flight.index===7)end();else loadRound();};
function end(){flight.phase='complete';clearInterval(tick);const p=state.players.find(p=>p.id===flight.playerId);if(p){if(flight.mode==='daily'){p.daily ||= {};p.daily[flight.date]={score:flight.score,correct:flight.log.filter(r=>r.points>0).length,version:bank.version};}p.games++;p.total+=flight.score;p.best=Math.max(p.best,flight.score);p.correct+=flight.log.filter(r=>r.points>0).length;save();}show('results');$('result-title').textContent=`${(flight.score*10).toLocaleString('en-GB')} km`;$('result-summary').textContent=`${flight.pilot} reached ${zone(flight.score).toLowerCase()} with ${flight.score}/700 points.`;$('result-code').textContent=`${flightLabel()} · Bank ${bank.version}`;$('again').textContent=flight.mode==='daily'?'Play unlimited practice ↗':'Fly again ↗';$('copy-status').textContent='';$('review').replaceChildren();for(const [i,r] of flight.log.entries()){const item=document.createElement('div');item.className='review-item';const title=document.createElement('strong');title.textContent=`${i+1}. ${r.question.text}`;const line=document.createElement('p');line.textContent=`${r.answer} · ${r.points} points`;const top=r.question.answers.reduce((a,b)=>a.points>=b.points?a:b),example=document.createElement('p');example.textContent=`Top answer: ${top.text} (${top.points} points).${r.question.note?' '+r.question.note:''}`;item.append(title,line,example);$('review').append(item);}refresh();}
$('again').onclick=()=>{if(flight?.mode==='daily'){$('mode').value='random';$('difficulty').value='general';refreshDaily();}start();};$('home').onclick=()=>{show('lobby');refresh();};
$('abort').onclick=()=>{if(!confirm('End this flight? Unfinished flights do not count towards your stats.'))return;clearInterval(tick);flight=null;show('lobby');refresh();};
$('share').onclick=async()=>{const text=`🚀 Starbound · ${flight.pilot}\n${flight.score}/700 · ${flight.score*10} km · ${zone(flight.score)}\n${flightLabel()} · Bank ${bank.version}`;try{await navigator.clipboard.writeText(text);$('copy-status').textContent='Result copied.';}catch{$('copy-status').textContent='Copy this result manually: '+text;}};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='starbound-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Backup is too large (maximum 2 MB).');const incoming=cleanBackup(JSON.parse(await file.text()));if(!confirm('Replace all profiles and stats in this browser with this backup? Export first if you want to keep the current records.'))return;state=incoming;storageOK=true;save();refresh();if(storageOK)notify('Backup restored.');}catch(error){notify('Backup not imported. '+error.message);}finally{e.target.value='';}};
window.addEventListener('beforeunload',e=>{if(flight&&flight.phase!=='complete'){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key===KEY){storageOK=false;notify('Profiles changed in another tab. This tab will not overwrite those changes. Export any new results here, then reload.');}});
// Refresh the daily button at midnight even if the lobby stays open.
setInterval(()=>{if(!$('lobby').hidden)refreshDaily();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateTimer();refreshDaily();}});
refresh();fetch('./data/questions.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{bank=validateBank(data);for(const level of Object.keys(DIFFICULTIES))difficultyBank(bank,level);$('bank-info').textContent=`${bank.questions.length} prompts · Bank ${bank.version} · Unlimited practice`;refresh();}).catch(()=>{notify('Question bank could not load. Open through GitHub Pages or a local web server, and check data/questions.json.');$('bank-info').textContent='Unable to load questions.';});
