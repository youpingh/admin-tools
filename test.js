
function testProp() {
  const obj = {
    name: 'john',
    age: 50
  };

  const propName = 'name';

  console.log(Object.hasOwn(obj, propName), obj[propName]);
}

function testSplit() {
  const text = "1. (dòu) 争斗；搏斗；打斗；戒斗。2.照射；反射；衬托";
  // const result = text.split(/[；1.]/);
  const result = text.split(/\s*[1-9].\s*|\s*；\s*/);

  console.log(result);
  // Output: ["apple", "orange", "banana", "grape"] /\s*--\s*|\s*AND\s*/
}

testSplit()
