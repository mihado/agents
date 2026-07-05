import path from "node:path";
import { fileURLToPath } from "node:url";
import { runVendorReview, type ReviewOptions, type ReviewOutcome } from "../skills/review/review.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const args = new Set(process.argv.slice(2));

const opts: ReviewOptions = {
  root,
  accept: args.has("--accept"),
  showSuppressed: args.has("--show-suppressed"),
  withSkillspector: args.has("--skillspector"),
};

const outcome: ReviewOutcome = runVendorReview(opts);

if (outcome.kind === "no-stage") {
  console.log("No skills in stage. Run `make vendor` to fetch skills.");
  process.exit(0);
}

if (outcome.kind === "no-diff") {
  console.log("Staged content matches live tree — nothing to review.");
  process.exit(0);
}

if (outcome.kind === "accepted") {
  console.log(`Accepted ${outcome.accepted} finding(s) into ${outcome.baselinePath}.`);
  process.exit(0);
}

// outcome.kind === "reviewed": nothing else to print
process.exit(0);
