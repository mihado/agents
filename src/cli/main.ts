import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { fetchSkills } from "../skills/ingest/fetch.js";
import { promoteStagedContent } from "../skills/ingest/promote.js";
import { removeSkillFromLock } from "../skills/ingest/remove.js";
import { runVendorReview, type ReviewOptions, type ReviewOutcome } from "../skills/review/review.js";
import { runVendorAudit, type AuditOptions, type AuditOutcome } from "../skills/review/audit.js";
import { verifyLock } from "../skills/inventory/verify.js";
import { validateStageLock, type Lock } from "../skills/inventory/lockfile.js";
import { writeArtifact } from "../skills/review/artifact.js";
import { fail, readJson, writeJson } from "../core/commands.js";
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
  // The "accept" subcommand promotes stage to live. The "review --accept" flag
  // adds findings to the review baseline. Different operations; same English
  // verb. The CLI distinguishes by argument shape.
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
    .description("review staged skill content")
    .option("--accept", "accept all findings into the review baseline")
    .option("--show-suppressed", "include findings already in the baseline")
    .option("--skillspector", "also run skillspector on changed skills")
    .action((actionOpts: { accept?: boolean; showSuppressed?: boolean; skillspector?: boolean }) => {
      const reviewOpts: ReviewOptions = {
        root: root(),
        accept: actionOpts.accept,
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
      if (outcome.kind === "accepted") {
        console.log(`Accepted ${outcome.accepted} finding(s) into ${outcome.baselinePath}.`);
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
      const r = root();
      const stageDir = path.join(r, ".stage/skills");
      if (!fs.existsSync(stageDir)) {
        fail("No stage found. Run `apm skills fetch` first.");
      }
      const stageLockPath = path.join(r, ".stage", "stage-lock.json");
      if (!fs.existsSync(stageLockPath)) {
        fail("No stage-lock.json found. Run `apm skills fetch` first.");
      }
      const stageLock = readJson<Lock>(stageLockPath);
      validateStageLock(stageLock);
      if (!stageLock.skills[skillName]) {
        fail(`Skill '${skillName}' not found in stage. Available: ${Object.keys(stageLock.skills).join(", ")}`);
      }
      const skill = stageLock.skills[skillName];
      const stageSkillPath = path.join(stageDir, skill.path.replace(/^skills\//, ""));
      if (fs.existsSync(stageSkillPath)) {
        fs.rmSync(stageSkillPath, { recursive: true, force: true });
      }
      delete stageLock.skills[skillName];
      const remainingSkills = Object.values(stageLock.skills).filter((s) => s.source === skill.source);
      if (remainingSkills.length === 0) {
        const source = stageLock.sources[skill.source];
        if (source) {
          const stagedLicensePath = path.join(stageDir, "licenses", path.basename(source.licensePath));
          if (fs.existsSync(stagedLicensePath)) {
            fs.rmSync(stagedLicensePath, { force: true });
          }
          delete stageLock.sources[skill.source];
          console.log(`Cleaned up source '${skill.source}' and its staged license.`);
        }
      }
      writeJson(stageLockPath, stageLock);
      console.log(`Rejected ${skillName} from stage.`);
      console.log(`Remaining: ${Object.keys(stageLock.skills).length} skills in stage.`);
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
    .option("--accept", "accept all findings into the review baseline")
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

  // doctor — read-only machine health check across all providers.
  program
    .command("doctor")
    .description("read-only health check (git, node, lock, provider symlinks, duplicate skills)")
    .action(() => runDoctor(root()));

  // check — full integrity sweep. Runs doctor + mcp check + providers check + skills check.
  program
    .command("check")
    .description("run doctor + mcp check + providers check + skills check")
    .action(() => {
      runDoctor(root());
      checkMcp(root());
      checkProviders(root());
      const { skills: skillCount, licenses } = verifyLock(root());
      console.log(`Verified ${skillCount} vendored skills and ${licenses} licenses.`);
    });

  // link — symlink agents/skills and AGENTS.md into ~/.codex, ~/.claude, ~/.agents, ~/.kiro.
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
