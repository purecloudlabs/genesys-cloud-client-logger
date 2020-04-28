import request from 'superagent';
import { ITrace, RequestApiOptions } from './interfaces';

export const calculateLogBufferSize = function (arr: ITrace[]): number {
  return arr.reduce((size: number, trace: ITrace) => size + calculateLogMessageSize(trace), 0);
};

export const calculateLogMessageSize = function (trace: any): number {
  const str = JSON.stringify(trace);
  // http://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  const m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
};

export const requestApi = function (path: string, reqOpts: RequestApiOptions): Promise<any> {
  const req = (request as any)[reqOpts.method || 'get'](buildUri(path, reqOpts.environment, reqOpts.apiVersion));
  if (reqOpts.accessToken) {
    req.set('Authorization', `Bearer ${reqOpts.accessToken}`);
  }
  req.type(reqOpts.contentType || 'json');

  return req.send(reqOpts.data);
};

const buildUri = function (path: string, environment: string, version: string = 'v2'): string {
  path = path.replace(/^\/+|\/+$/g, ''); // trim leading/trailing /
  return `https://api.${environment}/api/${version}/${path}`;
};

