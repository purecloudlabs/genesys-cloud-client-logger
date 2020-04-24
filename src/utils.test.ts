import * as utils from './utils';

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('calculateLogBufferSize', () => {
  it('should return an aggregate size', () => {
    jest.spyOn(utils, 'calculateLogMessageSize')
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4);

    const buffer = [{}, {}, {}];

    expect(utils.calculateLogBufferSize(buffer as any)).toEqual(6);
    expect(utils.calculateLogBufferSize([{}] as any)).toEqual(4);
  });
});

describe('calculateLogMessageSize', () => {
  it('should calculate multibyte characters', () => {
    expect(utils.calculateLogMessageSize('a')).toBe(3);
    expect(utils.calculateLogMessageSize('¢')).toBe(4);
  });
});
