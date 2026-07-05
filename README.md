# agents

Shared engineering instructions and workflows for Claude Code, Codex, and OpenCode.

This repository contains portable engineering practice only. Product context, company policy, credentials, MCP configuration, and machine-specific paths belong in domain, project, or local configuration.

## Instruction Layers

```text
global engineering instructions
  -> project instructions
  -> nested directory instructions
  -> current task
```

## Layout

```text
AGENTS.md                  shared global instructions
CLAUDE.md                  Claude wrapper around AGENTS.md
.agents/
  skills/engineering/      portable engineering practice
  skills/productivity/     portable general workflows
  skills/product/          product framework skills and chains
  skills/design/           UI/UX design skills and chains
  skills/business/         business and operations skills
  skills/calibrated/minh/  skills containing Minh-calibrated context
  licenses/                upstream license notices
src/
  cli/                     thin CLI entrypoints (link, doctor, mcp, vendor, etc.)
  core/                    shared infrastructure (commands, paths, reporter)
  providers/               provider modules + shared utilities
  skills/                  inventory, integrity, ingest, review subdomains
dist/                      compiled output (gitignored)
config/
  providers/               mcp.json, opencode.json
  skills/                  manifest.json, lock.json, semgrep.yml
pyproject.toml             uv project: pins skillspector and Python tooling dependencies
uv.lock                    locked dependency graph (committed, reproducible installs)
.python-version            Python version pin (3.12)
Makefile                   convenience targets for install, deps, check, test
```

## Install

Requirements: Git, Node.js, [uv](https://docs.astral.sh/uv/), Claude Code, Codex, and/or OpenCode.

```bash
git clone git@github.com:mihado/agents.git ~/path/to/repo
cd ~/path/to/repo
make install
make check
```

`make install` builds TypeScript sources, runs the link script (Claude/Codex/universal symlinks), syncs baseline MCP (Claude/Codex), and writes provider config (OpenCode). `make check` runs the full integrity suite (doctor, MCP, providers, vendor). Run `make deps` separately to install Python tooling (skillspector, semgrep) via `uv sync`.

To run individual steps:

```bash
make deps         # set up Python venv (skillspector, semgrep) via uv sync
make mcp          # sync MCP (Claude/Codex) and OpenCode remote config
make providers    # sync OpenCode providers only
make vendor       # fetch vendored skills
make test         # run tests
```

The link script creates these symlinks:

```text
~/.codex/AGENTS.md       -> <repo>/AGENTS.md
~/.claude/AGENTS.md      -> <repo>/AGENTS.md
~/.claude/CLAUDE.md      -> <repo>/CLAUDE.md
~/.codex/skills/<name>   -> <repo>/.agents/skills/<name>
~/.claude/skills/<name>  -> <repo>/.agents/skills/<name>
~/.agents/skills/<name>  -> <repo>/.agents/skills/<name>
~/.kiro/skills/<name>    -> <repo>/.agents/skills/<name>
```

`~/.agents/skills/` is the universal skills path — OpenCode and Zed discover skills here. `~/.kiro/skills/` is Kiro's global skills path. If `~/.kiro` doesn't exist yet (Kiro not installed on this machine), the link script creates it so skills are ready the moment Kiro is installed.

Each entry is linked individually. Existing unrelated skills survive. A file, directory, or foreign symlink at the same path causes installation to stop rather than overwrite.

`CODEX_HOME`, `CLAUDE_HOME`, `AGENTS_HOME`, and `KIRO_HOME` may be set to install into alternate locations.

## Baseline MCP

`config/providers/mcp.json` declares shared baseline MCP servers (currently Context7). The script configures whichever of Claude Code, Codex, and OpenCode are present. OpenCode MCP servers are mapped to their remote endpoint equivalents and written to `~/.config/opencode/opencode.jsonc`:

```bash
make mcp            # install all MCP config (dist/ is built automatically)
make check          # verify without changing anything
```

Environment variable names may be documented in `config/providers/mcp.json`; values stay in the machine environment and are never stored here.


## Vendored Skills

Skills are copied unchanged from upstream repositories declared in `config/skills/manifest.json`:

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [mattpocock/skills](https://github.com/mattpocock/skills)
- [wondelai/skills](https://github.com/wondelai/skills)
- [shadcn/improve](https://github.com/shadcn/improve)
- [nutlope/hallmark](https://github.com/nutlope/hallmark)
- [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- [tw93/kami](https://github.com/tw93/Kami)
- [lguz/humanize-writing-skill][https://github.com/lguz/humanize-writing-skill]

```bash
make vendor       # fetch all declared skills, regenerate lock, then run vendor-review
make check        # verify hashes offline without fetching (included in make check)
make vendor-review          # advisory scan of the fetched diff for injection/exec risk
make vendor-accept          # mark current findings as reviewed (silences future scans)
make vendor-audit           # audit entire live skill tree (regex + skillspector)
```

The vendor tool proves *integrity* — hash-locked content, path-safe extraction, tracked licenses. It cannot prove *safety*: a vendored `SKILL.md` is prose an agent reads and follows as instructions, and vendored scripts run under agent hooks.

`vendor-review` scans the git diff (newly fetched changes) for two risk classes hashing can't catch: prompt-injection language in prose files (custom regexes for instruction overrides, concealment, credential/secret access, exfiltration phrasing) and code-execution risk in scripts (Semgrep rules for `curl | sh`, `eval`, `subprocess`, `child_process`, `rm -rf /`, and dynamic env access). Findings are fingerprinted and filtered against the vendor-review baseline so only genuinely new hits surface.

`vendor-audit` walks the entire live skill tree — prose regex scan plus Semgrep code scan, no baseline filtering. Use it to calibrate the scanner against the current corpus, or to hand findings to another agent for review. Also runs NVIDIA SkillSpector (AST/taint/YARA, static-only `--no-llm`) across all skill directories.

Both tools share patterns and utilities from `src/skills/review/`. [`semgrep`](https://semgrep.dev/) and [`skillspector`](https://github.com/NVIDIA/skillspector) are installed in the repo-local venv via `uv sync`. No skill content leaves the machine.

This is advisory, not a gate — findings need a human to read them, and none of this replaces actually reading the diff of any repo you don't control.

After fetching, review the Git diff and `vendor-review` output before committing. First-party skills can be added directly to `.agents/skills/` without being listed in `config/skills/manifest.json`.

Skill directory names must be globally unique across all installed repositories.

### First-Party Skill Boundaries

First-party skills are grouped by portability and calibration:

- `engineering/` contains portable engineering practice and ship chains.
- `productivity/` contains portable workflows that are useful beyond a single person or domain.
- `product/` contains product framework skills and discovery chains.
- `design/` contains UI/UX design skills and review chains.
- `business/` contains business and operations skills.
- `calibrated/minh/` contains skills and references calibrated to Minh's voice, judgment, history, or preferences.

Chain skills compose multiple vendored skills into a single workflow (e.g., `design-review` chains refactoring-ui, ux-heuristics, and microinteractions). They live next to the skills they compose.

All categories are installed on Minh's machines and discovered under a flat skill namespace. The directory structure documents ownership and portability; it is not a runtime profile system. Review calibrated material before pushing it to a public repository.

## Diagnostics

```bash
make check            # full suite: doctor + MCP + providers + vendor integrity
```

`make check` runs doctor (symlink validation for all providers), MCP config verification (Claude/Codex/OpenCode), provider config verification (OpenCode), and vendored skill hash checks — all without changing the machine.


## License

Apache-2.0 - see [LICENSE](LICENSE).
