import { calculateLogMessageSize, calculateLogBufferSize, deepClone } from "../src/utils";
import { STRING_SIZE_7546_BYTES } from "./misc/messages";

describe('calculateLogBufferSize()', () => {
  it('should calculate log message size', () => {
    expect(calculateLogBufferSize([true, 100])).toBe(4 + 3);
    expect(calculateLogBufferSize([STRING_SIZE_7546_BYTES, { details: STRING_SIZE_7546_BYTES }])).toBe(7546 + 7558);
  });
});

describe('calculateLogMessageSize()', () => {
  it('should calculate log message size', () => {
    expect(calculateLogMessageSize('a')).toBe(3);
    expect(calculateLogMessageSize('¢')).toBe(4);
    expect(calculateLogMessageSize(true)).toBe(4);
    expect(calculateLogMessageSize(100)).toBe(3);
    expect(calculateLogMessageSize(STRING_SIZE_7546_BYTES)).toBe(7546);
    expect(calculateLogMessageSize({ details: STRING_SIZE_7546_BYTES })).toBe(7558);
  });
});

describe('deepClone()', () => {
  it('should clone a passed in item deeply; primitive value', () => {
    const testItem = 3;
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toBe(3);
    expect(typeof clonedTest).toBe('number');
  });
  it('should clone a passsed in item deeply; basic array', () => {
    const testItem = [1, 2, 3];
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toStrictEqual(testItem);
    expect(typeof clonedTest).toBe('object');
    expect(Array.isArray(clonedTest)).toBeTruthy();
  });
  it('should clone a passed in item deeply; complex array', () => {
    const testItem = [1, "hello", [1, 2, 3], function() { console.log('hello')}, {test1: 1, test2: 2}];
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toStrictEqual(testItem);
    expect(typeof clonedTest).toBe('object');
    expect(Array.isArray(clonedTest)).toBeTruthy();
    expect(Array.isArray(clonedTest[2])).toBeTruthy();
    expect(typeof clonedTest[3]).toBe('function');
    expect(typeof clonedTest[4]).toBe('object');
    expect(Object.keys(clonedTest[4]).length).toBe(2);
  });
  it('should clone a passed in item deeply; simple object', () => {
    const testItem = {test1: 1, test2: 2};
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toStrictEqual(testItem);
    expect(typeof clonedTest).toBe('object');
    expect(Object.keys(clonedTest).length).toBe(2);
    expect(clonedTest.test1).toBe(1);
    expect(clonedTest.test2).toBe(2);
  });
  it('should clone a passed in item deeply; complex object', () => {
    const testItem = {
      test1: 1,
      testString: 'hello',
      testObj: {
        test2: 2,
        testString2: 'hello',
        testObj2: {
          test3: 3,
          testString3: 'hello'
        }
      },
      testFunc: function() {
        console.log('hello');
      },
      testArray: [1, 2, 3, 4]
    }
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toStrictEqual(testItem);
    expect(typeof clonedTest).toBe('object');
    expect(Object.keys(clonedTest).length).toBe(5);
    expect(typeof clonedTest.testObj).toBe('object');
    expect(Object.keys(clonedTest.testObj).length).toBe(3);
    expect(typeof clonedTest.testObj.testObj2).toBe('object');
    expect(Object.keys(clonedTest.testObj.testObj2).length).toBe(2);
    expect(typeof clonedTest.testFunc).toBe('function');
    expect(typeof clonedTest.testArray).toBe('object');
    expect(Array.isArray(clonedTest.testArray)).toBeTruthy();
  });
  it('should clone a passed in item deeply; function', () => {
    const testItem = function() {
      console.log('hello');
    }
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toStrictEqual(testItem);
    expect(typeof clonedTest).toBe('function');
  });
  it('should clone a passed in item deeply; null', () => {
    const testItem = null;
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toBeFalsy();
  })
});