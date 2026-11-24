import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchAnswer,typoDistance} from '../js/core.js';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
const match=(id,text)=>matchAnswer(bank.questions.find(q=>q.id===id),text);
test('transposed letters, missing letters and misspelled short names',()=>{
 assert.equal(typoDistance('austraila','australia'),1);
 for(const [id,input,answer] of [['countries-a','Austraila','Australia'],['turtles','Michelango','Michelangelo'],['henry','Bolein','Anne Boleyn']]){
  const m=match(id,input);assert.equal(m.status,'accepted',input);assert.equal(m.answer.text,answer);assert.equal(m.kind,'typo');
 }
});
test('distinctive whole words and explicit shortened phrases',()=>{
 assert.equal(match('henry','Boleyn').answer.text,'Anne Boleyn');
 assert.equal(match('wonders','Hanging Gardens').answer.text,'Hanging Gardens of Babylon');
 assert.equal(match('wonders','Zeus').answer.text,'Statue of Zeus at Olympia');
});
test('ambiguous partials and typos never award a guessed score',()=>{
 for(const [id,input] of [['henry','Catherine'],['henry','Anne'],['henry','Catherin'],['countries-a','Austr'],['countries-s','South']])assert.equal(match(id,input).status,'ambiguous',input);
 const synthetic={answers:[{text:'Cart',points:10},{text:'Cast',points:100}]};
 assert.equal(matchAnswer(synthetic,'Cat').status,'none');
 assert.equal(matchAnswer(synthetic,'Cant').status,'ambiguous');
 assert.equal(matchAnswer(synthetic,'Cart').answer.points,10);
});
test('exact answers retain their score, including short science names',()=>{
 for(const q of bank.questions)for(const a of q.answers)for(const name of [a.text,...(a.aliases||[])]){
  const m=matchAnswer(q,name);assert.equal(m.status,'accepted');assert.equal(m.answer,a);assert.equal(m.kind,'exact');
 }
 assert.equal(match('galilean','Io').answer.text,'Io');
 assert.equal(match('galilean','Lo').status,'none');
});
test('reject generic words, nonsense, tiny fragments and wrong-question answers',()=>{
 for(const [id,input] of [['wonders','of'],['wonders','great'],['henry','Mrs'],['countries-a','Az'],['countries-a','constructor'],['countries-a','Michelangelo'],['planets','Pluto'],['chess','banana'],['turtles','']])assert.equal(match(id,input).status,'none',input);
 assert.equal(match('countries-a','a'.repeat(101)).status,'none');
});
