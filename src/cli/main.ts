import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { fetchSkills } from "../skills/ingest/fetch.js";
import { promoteStagedContent } from "../skills/ingest/promote.js";
import { removeSkillFromLock } from "../skills/ingest/remove.js";
import { rejectSkillFromStage } from "../skills/ingest/reject.js";
import { runVendorReview, type ReviewOptions, type ReviewOutcome } from "../skills/review/review.js";
import { runVendorAudit, type AuditOptions, type AuditOutcome } from "../skills/review/audit.js";
import { verifyLock } from "../skills/inventory/verify.js";
import { writeArtifact } from "../skills/review/artifact.js";
import { installMcp, checkMcp } from "../providers/mcp.js";
import { installProviders, checkProviders } from "../providers/opencode/sync.js";
import { runDoctor } from "../providers/doctor.js";
import { runLink } from "../providers/link.js";

const projectRoot = (): string => path.resolve(fileURLToPath(import.meta.url), "../../..");

export function buildProgram(opts?: { root?: string }): Command {
  const root = opts?.root ? (): string => opts.root! : projectRoot;
  const program = new Command();

  program
    .name("apm")
    .description("Agent tooling for the agents repository")
    .version("0.1.0");

  // skills — vendored skill supply chain.
  const skills = program.command("skills").description("manage vendored skills");

  skills
    .command("fetch")
    .description("fetch declared third-party skills into .stage/skills")
    .action(() => {
      fetchSkills(root());
    });

  skills
    .command("check")
    .description("verify live lock matches the working copy")
    .action(() => {
      const { skills: skillCount, licenses } = verifyLock(root());
      console.log(`Verified ${skillCount} vendored skills and ${licenses} licenses.`);
    });

  skills
    .command("review")
    .description("review staged skill content before accept/reject")
    .option("--show-suppressed", "include findings already in the baseline")
    .option("--skillspector", "also run skillspector on changed skills")
    .action((actionOpts: { showSuppressed?: boolean; skillspector?: boolean }) => {
      const reviewOpts: ReviewOptions = {
        root: root(),
        showSuppressed: actionOpts.showSuppressed,
        withSkillspector: actionOpts.skillspector,
      };
      const outcome: ReviewOutcome = runVendorReview(reviewOpts);
      if (outcome.kind === "no-stage") {
        console.log("No skills in stage. Run `apm skills fetch` to fetch skills.");
        process.exit(0);
      }
      if (outcome.kind === "no-diff") {
        console.log("Staged content matches live tree — nothing to review.");
        process.exit(0);
      }
      process.exit(0);
    });

  skills
    .command("accept")
    .description("promote stage to live")
    .action(() => {
      const r = root();
      const lock = promoteStagedContent(r);
      const skillNames = Object.keys(lock.skills);
      writeArtifact(r, "skills-accept", "skills-accept", skillNames, [], ["promotion"], undefined);
      console.log(`\nPromoted ${skillNames.length} skills to live tree.`);
    });

  skills
    .command("reject <skill-name>")
    .description("remove a staged skill from stage (does not touch live state)")
    .action((skillName: string) => {
      const result = rejectSkillFromStage(root(), skillName);
      if (result.cleanedSourceName) {
        console.log(`Cleaned up source '${result.cleanedSourceName}' and its staged license.`);
      }
      console.log(`Rejected ${result.skillName} from stage.`);
      console.log(`Remaining: ${result.remainingSkills} skills in stage.`);
    });

  skills
    .command("remove <skill-name>")
    .description("remove a live skill from live tree and lock (manifest unchanged)")
    .action((skillName: string) => {
      removeSkillFromLock(root(), skillName);
    });

  skills
    .command("audit")
    .description("audit live skill content")
    .option("--json", "emit JSON output")
    .option("--accept", "accept current live findings into the review baseline")
    .option("--skillspector", "also run skillspector on live skills")
    .action((actionOpts: { json?: boolean; accept?: boolean; skillspector?: boolean }) => {
      const auditOpts: AuditOptions = {
        root: root(),
        jsonOutput: actionOpts.json,
        accept: actionOpts.accept,
        withSkillspector: actionOpts.skillspector,
      };
      const outcome: AuditOutcome = runVendorAudit(auditOpts);
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
      process.exit(0);
    });

  // mcp — MCP server configuration for Codex and Claude.
  const mcp = program.command("mcp").description("sync and verify MCP server configuration");

  mcp
    .command("install")
    .description("install MCP server entries from config/providers/mcp.json")
    .action(() => installMcp(root()));

  mcp
    .command("check")
    .description("verify MCP server entries match config/providers/mcp.json")
    .action(() => checkMcp(root()));

  // providers — provider module configuration (currently OpenCode).
  const providers = program.command("providers").description("sync and verify provider configuration");

  providers
    .command("install")
    .description("install provider configuration")
    .action(() => installProviders(root()));

  providers
    .command("check")
    .description("verify provider configuration")
    .action(() => checkProviders(root()));

  program
    .command("install")
    .description("install local agent setup (links + mcp + providers)")
    .action(() => {
      runLink(root());
      installMcp(root());
      installProviders(root());
    });

  // doctor — local machine and repo sanity, without external config sweeps.
  program
    .command("doctor")
    .description("read-only local sanity check (git, node, lock shape, symlinks, duplicates)")
    .action(() => runDoctor(root()));

  // check — full integrity sweep. Runs doctor + mcp check + providers check + skills check.
  program
    .command("check")
    .description("run full integrity sweep (doctor + mcp + providers + skills)")
    .action(() => {
      runDoctor(root());
      checkMcp(root());
      checkProviders(root());
      const { skills: skillCount, licenses } = verifyLock(root());
      console.log(`Verified ${skillCount} vendored skills and ${licenses} licenses.`);
    });

  // link — low-level setup step retained as a compatibility alias.
  program
    .command("link")
    .description("symlink agents/skills and AGENTS.md into provider homes")
    .action(() => runLink(root()));

  return program;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  buildProgram().parseAsync(process.argv).catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(`error: ${error.message}`);
    } else {
      console.error(`error: ${String(error)}`);
    }
    process.exit(1);
  });
}
