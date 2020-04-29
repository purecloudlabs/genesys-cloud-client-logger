import * as utils from './utils';
import * as superagent from 'superagent';
jest.mock('superagent');

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

describe('requestApi', () => {
  beforeEach(() => jest.resetAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('should use default method', async () => {
    const mockRequest = { set: jest.fn(), type: jest.fn(), send: jest.fn() }
    jest.spyOn(superagent, 'get').mockReturnValue(mockRequest as any);
    await utils.requestApi('testPath', { environment: 'asdf' });
    expect(mockRequest.set).not.toHaveBeenCalled();
    expect(mockRequest.type).toHaveBeenCalledWith('json');
    expect(mockRequest.send).toHaveBeenCalledWith(undefined);
  });

  it('should authToken', async () => {
    const mockRequest = { set: jest.fn(), type: jest.fn(), send: jest.fn() }
    jest.spyOn(superagent, 'get').mockReturnValue(mockRequest as any);
    await utils.requestApi('testPath', { environment: 'asdf', accessToken: 'mytoken' });
    expect(mockRequest.set).toHaveBeenCalledWith('Authorization', 'Bearer mytoken');
    expect(mockRequest.type).toHaveBeenCalledWith('json');
    expect(mockRequest.send).toHaveBeenCalledWith(undefined);
  });

  it('should use provided method', async () => {
    const mockRequest = { set: jest.fn(), type: jest.fn(), send: jest.fn() }
    jest.spyOn(superagent, 'post').mockReturnValue(mockRequest as any);
    const myData = { message: 'here' };
    await utils.requestApi('testPath', { method: 'post', data: myData, environment: 'asdf' });
    expect(mockRequest.type).toHaveBeenCalledWith('json');
    expect(mockRequest.send).toHaveBeenCalledWith(myData);
  });

  it('should use provided contentType', async () => {
    const mockRequest = { set: jest.fn(), type: jest.fn(), send: jest.fn() }
    jest.spyOn(superagent, 'post').mockReturnValue(mockRequest as any);
    const myData = { message: 'here' };
    await utils.requestApi('testPath', { method: 'post', data: myData, contentType: 'text', environment: 'asdf' });
    expect(mockRequest.type).toHaveBeenCalledWith('text');
    expect(mockRequest.send).toHaveBeenCalledWith(myData);
  });

  describe('buildUri', () => {
    it('should use default version', async () => {
      const mockRequest = { set: jest.fn(), type: jest.fn(), send: jest.fn() }
      const spy = jest.spyOn(superagent, 'get').mockReturnValue(mockRequest as any);
      await utils.requestApi('myPath', { environment: 'asdf' })
      expect(spy.mock.calls[0][0]).toEqual('https://api.asdf/api/v2/myPath');
    });

    it('should use provided version', async () => {
      const mockRequest = { set: jest.fn(), type: jest.fn(), send: jest.fn() }
      const spy = jest.spyOn(superagent, 'get').mockReturnValue(mockRequest as any);
      await utils.requestApi('myPath', { environment: 'asdf', apiVersion: 'v4' })
      expect(spy.mock.calls[0][0]).toEqual('https://api.asdf/api/v4/myPath');
    });
  });
});