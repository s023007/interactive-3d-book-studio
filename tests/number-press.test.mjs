import assert from "node:assert/strict";
import test from "node:test";
import {challenge,digitsOf,digitValue,placeDigit,training} from "../dist/model.mjs";

test("the five independent blocks build the training card, including the zero",()=>{
  const expected=digitsOf(training.number);
  assert.equal(expected.length,5);
  assert.deepEqual([...training.tiles].sort(),[...expected].sort());
  expected.forEach((digit,index)=>assert.equal(placeDigit(training.number,index,digit).correct,true));
  assert.equal(placeDigit(training.number,2,0).value,0);
});

test("placing 4 in hundreds shows 400 and only its thousands slot accepts it",()=>{
  assert.deepEqual(placeDigit(training.number,2,4),{correct:false,value:400,expected:0});
  assert.deepEqual(placeDigit(training.number,1,4),{correct:true,value:4000,expected:4});
});

test("the second card tests changed place value with one correct choice",()=>{
  assert.equal(digitValue(challenge.number,challenge.digit),40000);
  assert.equal(challenge.options.filter(item=>item===digitValue(challenge.number,challenge.digit)).length,1);
});
