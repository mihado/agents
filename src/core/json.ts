import fs from "node:fs";

export function readJson<T = unknown>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch (error: unknown) {
    throw new Error(`cannot read ${file}: ${(error as Error).message}`, { cause: error });
  }
}

export function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}