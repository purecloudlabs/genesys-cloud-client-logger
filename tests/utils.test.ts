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
    expect(clonedTest).not.toBe(testItem);
  });
  it('should clone a passed in item deeply; complex array', () => {
    const testItem = [1, "hello", [1, 2, 3], function() { console.log('hello')}, {test1: 1, test2: 2}];
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toStrictEqual(testItem);
    expect(clonedTest).not.toBe(testItem);
    expect(clonedTest[2]).toStrictEqual(testItem[2]);
    expect(clonedTest[2]).not.toBe(testItem[2]);
    expect(clonedTest[4]).toStrictEqual(testItem[4]);
    expect(clonedTest[4]).not.toBe(testItem[4]);
  });
  it('should clone a passed in item deeply; simple object', () => {
    const testItem = {test1: 1, test2: 2};
    const clonedTest = deepClone(testItem);
    expect(clonedTest).toStrictEqual(testItem);
    expect(clonedTest).not.toBe(testItem);
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
    expect(clonedTest).not.toBe(testItem);
    expect(clonedTest.testObj).toStrictEqual(testItem.testObj);
    expect(clonedTest.testArray).toStrictEqual(testItem.testArray);
    expect(clonedTest.testObj).not.toBe(testItem.testObj);
    expect(clonedTest.testArray).not.toBe(testItem.testArray);
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