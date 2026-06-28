import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Returns the path to ~/.config/opencode/opencode.jsonc */
export function getPath() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "opencode", "opencode.jsonc");
}

/** Reads and parses the OpenCode JSONC config. Returns {} if the file doesn't exist. */
export function read() {
  const configPath = getPath();
  if (!fs.existsSync(configPath)) return {};
  try {
    return parseJSONC(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

/** Writes the config object back to the OpenCode JSONC file. */
export function write(config) {
  const configPath = getPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

// --- helpers ---

function parseJSONC(content) {
  // Remove single-line comments (//) but only outside strings.
  // A naive regex breaks on URLs containing // like https://
  const lines = content.split("\n");
  const cleaned = lines.map((line) => {
    let inString = false;
    let result = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (!inString && ch === "/" && next === "/") {
        break; // rest of line is a comment
      }
      if (ch === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inString = !inString;
      }
      result += ch;
    }
    return result;
  }).join("\n");
  // Remove multi-line comments
  const withoutMultiLine = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(withoutMultiLine);
}
