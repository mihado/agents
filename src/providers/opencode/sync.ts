import { registry } from "../index.js";

export function installProviders(root: string): void {
  for (const provider of registry) {
    provider.install(root);
  }
}

export function checkProviders(root: string): boolean {
  let ok = true;
  for (const provider of registry) {
    if (!provider.check(root)) ok = false;
  }
  if (!ok) process.exitCode = 1;
  return ok;
}
