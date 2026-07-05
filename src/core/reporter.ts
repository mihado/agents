export function pass(label: string): void {
  console.log(`PASS  ${label}`);
}

export function fail(label: string, count: { failures: number }): void {
  console.error(`FAIL  ${label}`);
  count.failures++;
}

export function reporter(): { failures: number; pass: (l: string) => void; fail: (l: string) => void } {
  const count = { failures: 0 };
  return {
    failures: count.failures,
    pass: (l: string) => pass(l),
    fail: (l: string) => fail(l, count),
  };
}
