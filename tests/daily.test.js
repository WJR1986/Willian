import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyQuestions,londonDate,difficultyBank,draw,cleanBackup,DIFFICULTIES} from '../js/core.js';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
test('daily is deterministic general knowledge with seven distinct topics',()=>{
 const a=dailyQuestions(bank,'2026-11-15');assert.deepEqual(a,dailyQuestions(bank,'2026-11-15'));
 assert.equal(a.length,7);assert.equal(new Set(a.map(q=>q.id)).size,7);assert(a.every(q=>q.difficulty==='general'));
 assert.equal(new Set(a.map(q=>q.category)).size,7);assert.notDeepEqual(a,dailyQuestions(bank,'2026-11-16'));
});
test('UK daily date changes at midnight including British summer time',()=>{
 assert.equal(londonDate(new Date('2026-07-01T22:59:59Z')),'2026-07-01');
 assert.equal(londonDate(new Date('2026-07-01T23:00:00Z')),'2026-07-02');
 assert.equal(londonDate(new Date('2026-11-15T23:59:59Z')),'2026-11-15');
 assert.equal(londonDate(new Date('2026-11-16T00:00:00Z')),'2026-11-16');
});
test('each practice difficulty has enough questions and stays in its own pool',()=>{
 for(const level of Object.keys(DIFFICULTIES)){
  const pool=difficultyBank(bank,level);assert(pool.questions.length>=7);let deck=[];
  for(let i=0;i<12;i++){const r=draw(pool,deck);deck=r.deck;assert(r.questions.every(q=>q.difficulty===level));assert.equal(new Set(r.questions.map(q=>q.id)).size,7);}
 }
 assert.throws(()=>difficultyBank(bank,'unknown'));
});
test('daily and difficulty decks survive backup validation; bad scores rejected',()=>{
 const data={version:1,selected:'1',players:[{id:'1',name:'Will',games:1,total:100,best:100,correct:4,deck:[],decks:{easy:['weekdays']},daily:{'2026-11-15':{score:100,correct:4,version:'1.2.0'}}}]};
 assert.deepEqual(cleanBackup(data),data);
 data.players[0].daily['2026-11-15'].score=701;assert.throws(()=>cleanBackup(data));
});
