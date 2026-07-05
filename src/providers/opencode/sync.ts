import { registry } from "../index.js";

export function installProviders(root: string): void {
  const opencode = registry.find((p) => p.name === "opencode")!;
  opencode.install(root);
}

export function checkProviders(root: string): void {
  const opencode = registry.find((p) => p.name === "opencode")!;
  opencode.check(root);
}
