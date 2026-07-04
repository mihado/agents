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
scripts/
  link                     symlinks instructions and skills into Claude, Codex, and ~/.agents (universal)
  doctor                   checks installation and integrity
  mcp                      installs and verifies baseline MCP servers
  vendor                   fetches and verifies vendored skills
  vendor-review            diff-based advisory scan (after fetch, before commit)
  vendor-audit             full-tree audit of all live skills
  opencode-providers       syncs providers.json → OpenCode provider config
  lib/
    patterns.js            shared injection/exec-risk pattern definitions
    scanner.js             scanLines, scanFile, fingerprint, walk
    baseline.js            read/write/merge baseline (fingerprint ledger)
    skillspector.js        resolve and run skillspector from venv
    opencode-config.js     shared OpenCode config I/O
pyproject.toml             uv project: pins skillspector and Python tooling dependencies
uv.lock                    locked dependency graph (committed, reproducible installs)
.python-version            Python version pin (3.12)
Makefile                   convenience targets for install, setup, check, test
mcp.json                   baseline MCP server definitions
providers.json             AI provider manifest (models, limits, reasoning flags)
skills.json                selected skills and their upstream sources
skills.lock                resolved commits, provenance, and content hashes
.vendor-review-baseline.json  vendor-review findings accepted as reviewed, keyed by fingerprint
LICENSE                    Apache-2.0
```

## Install

Requirements: Git, Node.js, [uv](https://docs.astral.sh/uv/), Claude Code, Codex, and/or OpenCode.

```bash
git clone git@github.com:mihado/agents.git ~/path/to/repo
cd ~/path/to/repo
make install
make check
```

`make install` runs the link script (Claude/Codex/universal symlinks), sets up the Python venv (`uv sync` — installs skillspector and other tooling pinned in `pyproject.toml`), syncs baseline MCP (Claude/Codex) and OpenCode remote config, then writes provider config (OpenCode). `make check` runs the full integrity suite (doctor, MCP, providers, vendor).

To run individual steps:

```bash
make setup        # set up Python venv (skillspector, etc.) via uv sync
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

`mcp.json` declares shared baseline MCP servers (currently Context7). The script configures whichever of Claude Code, Codex, and OpenCode are present. OpenCode MCP servers are mapped to their remote endpoint equivalents and written to `~/.config/opencode/opencode.jsonc`:

```bash
./scripts/mcp --install   # install
./scripts/mcp --check     # verify without changing anything
# or: make mcp
```

Environment variable names may be documented in `mcp.json`; values stay in the machine environment and are never stored here.

## Vendored Skills

Skills are copied unchanged from upstream repositories declared in `skills.json`:

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [mattpocock/skills](https://github.com/mattpocock/skills)
- [wondelai/skills](https://github.com/wondelai/skills)
- [shadcn/improve](https://github.com/shadcn/improve)
- [nutlope/hallmark](https://github.com/nutlope/hallmark)
- [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- [tw93/kami](https://github.com/tw93/Kami)
- [lguz/humanize-writing-skill][https://github.com/lguz/humanize-writing-skill]

```bash
./scripts/vendor --fetch                    # fetch all declared skills and regenerate skills.lock
./scripts/vendor --check                    # verify hashes offline without fetching
./scripts/vendor-review                     # advisory scan of the fetched diff for injection/exec risk
./scripts/vendor-review --accept            # mark current findings as reviewed (silences future scans)
./scripts/vendor-review --show-suppressed   # also list baseline-accepted findings
./scripts/vendor-review --skillspector      # also run skillspector on changed skill dirs
./scripts/vendor-audit                      # audit entire live skill tree (all patterns, all skills)
./scripts/vendor-audit --json               # output findings as JSON (for agent review)
./scripts/vendor-audit --skillspector       # also run skillspector on all skill dirs
# or: make vendor                           # runs --fetch then vendor-review
# or: make vendor-audit                     # runs vendor-audit
```

`scripts/vendor` proves *integrity* — hash-locked content, path-safe extraction, tracked licenses. It cannot prove *safety*: a vendored `SKILL.md` is prose an agent reads and follows as instructions, and vendored scripts run under agent hooks.

`scripts/vendor-review` scans the git diff (newly fetched changes) for two risk classes hashing can't catch: prompt-injection language in prose files (instruction overrides, "don't tell the user," credential/secret access, exfiltration phrasing) and exec/shell risk in scripts (`curl | sh`, `eval`, `subprocess`, `child_process`, `rm -rf /`). Findings are fingerprinted and filtered against `.vendor-review-baseline.json` (committed) so only genuinely new hits surface.

`scripts/vendor-audit` walks the entire live skill tree — same patterns, no baseline filtering. Use it to calibrate the scanner against the current corpus, or to hand findings to another agent for review. With `--json`, produces structured output suitable for programmatic analysis. With `--skillspector`, also runs NVIDIA SkillSpector (AST/taint/YARA, static-only `--no-llm`) across all skill directories.

Both scripts share patterns and utilities from `scripts/lib/` (patterns, scanner, baseline, skillspector). [`skillspector`](https://github.com/NVIDIA/skillspector) is installed in the repo-local venv via `uv sync`, pinned to a specific commit in `pyproject.toml`. No skill content leaves the machine.

This is advisory, not a gate — findings need a human to read them, and none of this replaces actually reading the diff of any repo you don't control.

After fetching, review the Git diff and `scripts/vendor-review` output before committing. First-party skills can be added directly to `.agents/skills/` without being listed in `skills.json`.

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
make check        # full suite
./scripts/doctor  # doctor only
```

`make check` runs doctor (Claude/Codex/Kiro symlinks), MCP config verification (Claude/Codex) and OpenCode remote config, provider config verification (OpenCode), and vendored skill hash checks. `./scripts/doctor` reports missing commands, broken or foreign symlinks, manifest and lock integrity, content hash mismatches, and MCP configuration — without changing the machine.


## License

Apache-2.0 - see [LICENSE](LICENSE).
