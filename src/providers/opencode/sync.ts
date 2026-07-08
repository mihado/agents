import { registry } from "../index.js";

export function installProviders(root: string): void {
  for (const provider of registry) {
    provider.install(root);
  }
}

export function checkProviders(root: string): void {
  for (const provider of registry) {
    provider.check(root);
  }
}
