/**
 * Runs `worker` over every item in `items` with at most `limit` calls in
 * flight at once, and resolves to the results in the original order. Workers
 * pull the next index as soon as they're free, so throughput isn't gated on
 * the slowest item in a "batch" — it's `total work / limit` in aggregate.
 *
 * `worker` is expected to handle its own errors (return a result object rather
 * than throw); a throw from `worker` rejects the whole run, matching
 * `Promise.all` semantics.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const current = next++;
      results[current] = await worker(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, run));
  return results;
}
