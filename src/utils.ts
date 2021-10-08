import { IDeferred } from "./interfaces";

export const calculateLogBufferSize = function (arr: any[]): number {
  return arr.reduce((size: number, trace: any) => size + calculateLogMessageSize(trace), 0);
};

export const calculateLogMessageSize = function (trace: any): number {
  const str = JSON.stringify(trace);
  // http://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  const m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
};

export const getDeferred = (): IDeferred => {
  let resolve: any;
  let reject: any;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}