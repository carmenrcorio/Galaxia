/**
 * Shared fetch timeout for every async surface.
 *
 * Settings subscription (2s) is the gold standard: a spinner that never
 * resolves is a failure, not a wait. Data screens use a longer budget
 * because they fan out people + charts. Vela waits on a streamed model
 * reply, so it gets its own ceiling.
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 8000;
export const VELA_FETCH_TIMEOUT_MS = 15000;

export class FetchTimeoutError extends Error {
  constructor(message = "timeout") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export function isFetchTimeoutError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "FetchTimeoutError"
  );
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new FetchTimeoutError());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      }
    );
  });
}
