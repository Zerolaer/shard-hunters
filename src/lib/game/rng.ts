/**
 * Random primitives, kept in a leaf module so content tables (gems, workshop)
 * can roll without importing `formulas`, which imports them back.
 */

export function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function irand(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
