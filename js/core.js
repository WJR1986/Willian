export const normalise = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
export function lookup(question, raw) { const key=normalise(raw); return question.answers.find(a=>[a.text,...(a.aliases||[])].some(s=>normalise(s)===key)); }

// Only compare with the current prompt's answer bank. Exact answers always win.
const fillerWords = new Set(['a','an','the','and','of','in','on','at','to','de','la','le','saint','st','great','lake','ocean','statue','temple','mrs','miss','mr','professor','colonel','reverend']);
function words(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ').match(/[a-z0-9]+/g) || [];
}
function forms(answer) {
  const full = [answer.text, ...(answer.aliases || [])];
  const short = [];
  for (const name of full) {
    const tokens = words(name);
    for (let start = 0; start < tokens.length; start++) {
      for (let end = start + 1; end <= tokens.length; end++) {
        const span = tokens.slice(start, end);
        // Whole distinctive words/phrases only, never arbitrary substrings.
        if (span.some(t => t.length >= 4 && !fillerWords.has(t))) short.push(span.join(''));
      }
    }
  }
  return {full: full.map(normalise), short: [...new Set(short)]};
}
// Optimal-string-alignment distance: insertion, deletion, substitution or
// adjacent transposition (e.g. Austraila -> Australia).
export function typoDistance(a, b) {
  const d = Array.from({length: a.length + 1}, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1] === b[j-1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) {
        d[i][j] = Math.min(d[i][j], d[i-2][j-2]+1);
      }
    }
  }
  return d[a.length][b.length];
}
export function matchAnswer(question, raw) {
  const key = normalise(raw);
  if (!key || key.length > 100) return {status: 'none'};
  const exact = lookup(question, raw);
  if (exact) return {status: 'accepted', answer: exact, kind: 'exact'};
  if (key.length < 4 || fillerWords.has(key)) return {status: 'none'};
  const entries = question.answers.map(answer => ({answer, ...forms(answer)}));
  const decide = (matches, kind) => matches.length === 1
    ? {status: 'accepted', answer: matches[0].answer, kind}
    : {status: 'ambiguous'};
  const partial = entries.filter(e => e.short.includes(key));
  if (partial.length) return decide(partial, 'short');
  // A fragment such as "Austr" could refer to multiple answers. Do not guess.
  if (entries.filter(e => e.full.some(s => s.startsWith(key))).length > 1) return {status: 'ambiguous'};
  const near = entries.filter(e => [...e.full, ...e.short].some(s => {
    const length = Math.min(key.length, s.length);
    const allowance = length >= 8 ? 2 : length >= 4 ? 1 : 0;
    if (!allowance || Math.abs(key.length - s.length) > allowance) return false;
    return typoDistance(key, s) <= allowance;
  }));
  // Even if one match is closer, do not select between plausible answers.
  return near.length ? decide(near, 'typo') : {status: 'none'};
}
export function rng(seed){let h=2166136261;for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function challenge(bank,code){return shuffle(bank.questions,rng(`${bank.version}:${code.trim().toUpperCase()}`)).slice(0,7);}
export function draw(bank,deck){const ids=bank.questions.map(q=>q.id), valid=new Set(ids);let pool=[...new Set(deck||[])].filter(id=>valid.has(id));const chosen=[];while(chosen.length<7){if(!pool.length)pool=shuffle(ids.filter(id=>!chosen.includes(id)));chosen.push(pool.shift());}return {questions:chosen.map(id=>bank.questions.find(q=>q.id===id)),deck:pool};}
export function validateBank(bank){if(!bank||typeof bank.version!=='string'||!Array.isArray(bank.questions)||bank.questions.length<7)throw Error('Question bank needs a version and at least seven prompts.');const ids=new Set();for(const q of bank.questions){if(!q.id||ids.has(q.id)||typeof q.text!=='string'||!Array.isArray(q.answers)||!q.answers.length)throw Error('Invalid or duplicate question.');ids.add(q.id);const keys=new Set();for(const a of q.answers){if(typeof a.text!=='string'||!a.text.trim()||!Number.isInteger(a.points)||a.points<10||a.points>100||a.aliases!==undefined&&!Array.isArray(a.aliases))throw Error('Invalid answer.');for(const s of [a.text,...(a.aliases||[])]){if(typeof s!=='string'||!normalise(s)||keys.has(normalise(s)))throw Error(`Duplicate or invalid answer spelling: ${q.id}`);keys.add(normalise(s));}}}return bank;}
export function cleanBackup(data){if(!data||data.version!==1||!Array.isArray(data.players)||data.players.length>100)throw Error('Not a valid Starbound backup.');const ids=new Set(),names=new Set();const players=data.players.map(p=>{if(typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>24||names.has(p.name.trim().toLowerCase()))throw Error('Invalid player in backup.');ids.add(p.id);names.add(p.name.trim().toLowerCase());for(const key of ['games','total','best','correct'])if(!Number.isSafeInteger(p[key])||p[key]<0)throw Error('Invalid stats.');if(p.best>700||p.total>p.games*700||p.correct>p.games*7||p.best>p.total)throw Error('Invalid scores.');return {id:p.id,name:p.name.trim(),games:p.games,total:p.total,best:p.best,correct:p.correct,...cleanExtras(p),deck:Array.isArray(p.deck)?p.deck.filter(x=>typeof x==='string').slice(0,10000):[]};});return {version:1,players,selected:players.some(p=>p.id===data.selected)?data.selected:(players[0]?.id||'')};}
export function zone(score){return score>=600?'Deep space':score>=400?'High orbit':score>=100?'Orbit':score>=10?'Upper atmosphere':'Launchpad';}

export const DIFFICULTIES = {easy:'Easy',general:'General knowledge',hard:'Hard / specialist'};
export function londonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const value = type => parts.find(p => p.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function difficultyBank(bank, difficulty) {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) throw Error('Unknown difficulty.');
  const questions = bank.questions.filter(q => q.difficulty === difficulty);
  if (questions.length < 7) throw Error('Each difficulty needs at least seven prompts.');
  return {...bank, version: `${bank.version}:${difficulty}`, questions};
}
export function dailyQuestions(bank, date) {
  // Use the same general-knowledge pool and seed for every pilot/device.
  // Prefer different topics to keep the daily from becoming all TV or science.
  const shuffled = shuffle(difficultyBank(bank,'general').questions, rng(`${bank.version}:daily:${date}`));
  const chosen = [], categories = new Set();
  for (const q of shuffled) if (!categories.has(q.category)) {
    chosen.push(q); categories.add(q.category); if (chosen.length === 7) return chosen;
  }
  return chosen.concat(shuffled.filter(q => !chosen.includes(q))).slice(0,7);
}
function cleanExtras(player) {
  const extras = {};
  if (player.decks !== undefined) {
    if (!player.decks || typeof player.decks !== 'object' || Array.isArray(player.decks)) throw Error('Invalid practice decks.');
    extras.decks = {};
    for (const level of Object.keys(DIFFICULTIES)) if (player.decks[level] !== undefined) {
      if (!Array.isArray(player.decks[level])) throw Error('Invalid practice deck.');
      extras.decks[level] = [...new Set(player.decks[level].filter(id => typeof id === 'string'))].slice(0,10000);
    }
  }
  if (player.daily !== undefined) {
    if (!player.daily || typeof player.daily !== 'object' || Array.isArray(player.daily) || Object.keys(player.daily).length > 10000) throw Error('Invalid daily records.');
    extras.daily = {};
    for (const [date, record] of Object.entries(player.daily)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !record || !Number.isInteger(record.score) || record.score < 0 || record.score > 700 || !Number.isInteger(record.correct) || record.correct < 0 || record.correct > 7 || typeof record.version !== 'string' || record.version.length > 40) throw Error('Invalid daily result.');
      extras.daily[date] = {score:record.score,correct:record.correct,version:record.version};
    }
  }
  return extras;
}
