import { calculateLogMessageSize, calculateLogBufferSize } from "../src/utils";
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