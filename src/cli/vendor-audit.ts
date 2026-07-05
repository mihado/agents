import path from "node:path";
import { fileURLToPath } from "node:url";
import { runVendorAudit, type AuditOptions, type AuditOutcome } from "../skills/review/audit.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const args = new Set(process.argv.slice(2));

const opts: AuditOptions = {
  root,
  jsonOutput: args.has("--json"),
  accept: args.has("--accept"),
  withSkillspector: args.has("--skillspector"),
};

const outcome: AuditOutcome = runVendorAudit(opts);

if (outcome.kind === "accepted") {
  if (outcome.skillspectorBaselineError) {
    console.error(outcome.skillspectorBaselineError);
    process.exit(1);
  }
  console.log(`Accepted ${outcome.accepted} finding(s) into ${outcome.baselinePath}.`);
  console.log("Generating skillspector baseline (static-only, may take a minute)...");
  process.exit(0);
}

if (outcome.kind === "json-output") {
  console.log(JSON.stringify(outcome.output, null, 2));
  process.exit(0);
}

// outcome.kind === "audited": already printed to console by the implementation
process.exit(0);
