import path from "node:path";
import { fileURLToPath } from "node:url";
import { promoteStagedContent } from "../skills/ingest/promote.js";
import { writeArtifact } from "../skills/review/artifact.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");

const lock = promoteStagedContent(root);

const skillNames = Object.keys(lock.skills);
writeArtifact(root, "vendor-accept", "vendor-accept", skillNames, [], ["promotion"], undefined);

console.log(`\nPromoted ${skillNames.length} skills to live tree.`);