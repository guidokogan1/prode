const SETTLE_TIMEOUT_MS = 700;

// motion's `.finished` only resolves from finish(); cancel() leaves it pending forever
// (motion-dom WithPromise has no reject path), so awaiting it bare can hang a handler.
export function settleAnimations(finished: Promise<unknown>[]) {
  return Promise.race([
    Promise.all(finished).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, SETTLE_TIMEOUT_MS)),
  ]);
}
