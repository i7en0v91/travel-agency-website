
export async function delay (milliseconds: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await new Promise<void>((resolve, reject) => { setTimeout(() => resolve(), milliseconds); });
}

/**
 * Spin waits until specified condition is TRUE
 * @param condition predicate to check
 * @param timeoutMs maximum number of milliseconds to wait for {@link condition} to become TRUE
 * @param iterationMs wait interval in milliseconds between successive checks for condition
 * @returns TRUE if condition has been met until timeout; FALSE otherwise
 */
export async function spinWait (condition: () => Promise<boolean>, timeoutMs: number, iterationMs: number = 1000): Promise<boolean> {
  const startWait = new Date().getTime();
  let conditionMet = await condition();
  if (conditionMet) {
    return true;
  }

  while (!conditionMet) {
    const elapsedMs = new Date().getTime() - startWait;
    if (elapsedMs > timeoutMs) {
      return false;
    }

    await delay(iterationMs);
    conditionMet = await condition();
  }

  return true;
}