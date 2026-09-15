/** Browser fetch with AbortController timeout so auth/boot never hang forever. */

export const AUTH_FETCH_MS = 12_000;
export const SAVE_FETCH_MS = 12_000;
export const HYDRATE_BUDGET_MS = 15_000;

export class FetchTimeoutError extends Error {
  constructor(message = "Превышено время ожидания сервера") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = AUTH_FETCH_MS,
): Promise<Response> {
  const controller = new AbortController();
  const external = init.signal;
  const onAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener("abort", onAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted && !external?.aborted) {
      throw new FetchTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }
}
