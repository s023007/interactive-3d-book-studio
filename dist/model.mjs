export const places=["عشرات الآلاف","الآلاف","المئات","العشرات","الآحاد"];
export const training={
  number:64082,
  tiles:[8,0,4,2,6],
};
export const challenge={
  number:40682,
  digit:4,
  options:[4000,400,40000],
};

export const numeral = new Intl.NumberFormat("ar-OM",{numberingSystem:"arab"});
export function digitsOf(number){
  return String(number).split("").map(Number);
}

export function digitValue(number,digit){
  const digits=digitsOf(number);
  const position=digits.indexOf(digit);
  return position<0?null:digit*10**(digits.length-position-1);
}

export function placeDigit(number,slot,digit){
  const digits=digitsOf(number);
  if(!Number.isInteger(slot)||slot<0||slot>=digits.length)return {correct:false};
  const weight=10**(digits.length-slot-1);
  return {correct:digits[slot]===digit,value:digit*weight,expected:digits[slot]};
}
