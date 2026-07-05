import path from "node:path";
import { fileURLToPath } from "node:url";
import { runVendorAudit, type AuditOptions } from "../skills/review/audit.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const args = new Set(process.argv.slice(2));

const opts: AuditOptions = {
  root,
  jsonOutput: args.has("--json"),
  accept: args.has("--accept"),
  withSkillspector: args.has("--skillspector"),
};

runVendorAudit(opts);
