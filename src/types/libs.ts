declare module 'backoff-web' {
  export class Backoff {
    failAfter: (val: number) => void;
    backoff: (defaultError?: any) => void;
    reset: () => void;
    on: (event: string, handler: (...params: any) => void) => void;
  }

  export interface IBackoffOpts {
    randomisationFactor: number;
    initialDelay: number;
    maxDelay: number;
    factor: number;
  }

  const main: {
    exponential: (opts: IBackoffOpts) => Backoff
  }

  export default main;
}