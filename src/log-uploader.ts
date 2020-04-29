import { ISendLogRequest, IDeferred, ISendLogState } from './interfaces';
import { requestApi } from './utils';
import backoffWeb, { IBackoffOpts, Backoff } from 'backoff-web';

const backoffOpts: IBackoffOpts = {
  randomisationFactor: 0.2,
  initialDelay: 500,
  maxDelay: 5000,
  factor: 2
}

function getDeferred (): IDeferred {
  let res: any;
  let rej: any;

  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });

  return { promise, resolve: res, reject: rej };
}

export class LogUploader {
  private sendQueue: ISendLogState[] = [];
  private hasPendingRequest = false;
  private backoff: Backoff;
  private environment!: string;

  constructor () {
    this.backoff = backoffWeb.exponential(backoffOpts);
    this.backoff.failAfter(20);

    this.backoff.on('backoff', () => {
      this.hasPendingRequest = true;
      this.uploadLogsToServer();
    });

    this.backoff.on('ready', () => {
      this.backoff.backoff();
    });

    this.backoff.on('fail', () => {
      this.hasPendingRequest = false;
    });
  }

  setEnvironment (environment: string, forceUpdate?: boolean): void {
    if (this.environment && !forceUpdate) {
      return;
    }

    this.environment = environment;
  }

  sendLogs (req: ISendLogRequest): Promise<void> {
    const deferred = getDeferred();
    this.sendQueue.push({ request: req, deferred });
    this.backoff.backoff();
    return deferred.promise;
  }

  private async uploadLogsToServer (): Promise<void> {
    if (this.hasPendingRequest || this.sendQueue.length === 0) {
      return;
    }

    this.hasPendingRequest = true;

    const [queueItem] = this.sendQueue.splice(0, 1);

    return requestApi('/diagnostics/trace', {
      accessToken: queueItem.request.accessToken,
      environment: this.environment,
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      data: JSON.stringify(queueItem.request)
    })
      .then(() => {
        this.backoff.reset();
        this.hasPendingRequest = false;
        queueItem.deferred.resolve();
      })
      .catch((err) => {
        // reset as long as we aren't throttled
        if (err.status !== 429) {
          this.backoff.reset();
        }

        this.hasPendingRequest = false;
        queueItem.deferred.reject(err);
      });
  }
}

const uploader = new LogUploader()
export default uploader;