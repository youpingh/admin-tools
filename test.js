
function testProp() {
  const obj = {
    name: 'john',
    age: 50
  };

  const propName = 'name';

  console.log(Object.hasOwn(obj, propName), obj[propName]);
}

testProp()
