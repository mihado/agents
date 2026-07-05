import path from "node:path";
import { fileURLToPath } from "node:url";
import { runVendorReview, type ReviewOptions } from "../skills/review/review.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const args = new Set(process.argv.slice(2));

const opts: ReviewOptions = {
  root,
  accept: args.has("--accept"),
  showSuppressed: args.has("--show-suppressed"),
  withSkillspector: args.has("--skillspector"),
};

runVendorReview(opts);
