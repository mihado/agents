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
  cli/                     apm CLI entrypoint (main.ts) and smoke tests
  core/                    shared infrastructure (commands, paths, reporter)
  providers/               provider modules + apm helpers (link, doctor, mcp, sync)
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

`make install` builds TypeScript sources, runs the link script (Claude/Codex/universal symlinks), syncs baseline MCP (Claude/Codex), and writes provider config (OpenCode). `./apm check` runs the full integrity suite (doctor, MCP, providers, skills). Run `make deps` separately to install Python tooling (skillspector, semgrep) via `uv sync`.

To run individual steps:

```bash
make deps             # set up Python venv (skillspector, semgrep) via uv sync
make test             # run tests
./apm skills fetch    # fetch vendored skills into .stage
./apm mcp install     # sync MCP (Claude/Codex) from config/providers/mcp.json
./apm providers install   # sync OpenCode providers
./apm doctor          # read-only health check
./apm check           # full integrity sweep
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

## CLI Reference

`apm` is the canonical command-line interface. It is a Commander-based CLI built from `src/cli/main.ts`; the in-repo shim `./apm` runs the built entrypoint until a global install puts the binary on PATH. Run `./apm --help` to see the live surface.

`make` keeps `install` (the multi-step orchestrator that runs `apm link` + `apm mcp install` + `apm providers install`) plus the build/test/lint targets. Individual actions go through `apm`.

```text
apm skills fetch                 fetch declared third-party skills into .stage/skills
apm skills check                 verify live lock matches the working copy
apm skills review                advisory scan of staged skill content
apm skills review --accept       accept findings into the review baseline
apm skills accept                promote stage to live
apm skills reject <name>         remove a staged skill from stage
apm skills remove <name>         remove a live skill from live tree and lock
apm skills audit                 audit entire live skill tree
apm skills audit --json          emit audit findings as JSON
apm mcp install                  install MCP server entries from config/providers/mcp.json
apm mcp check                    verify MCP server entries
apm providers install            install provider configuration
apm providers check              verify provider configuration
apm doctor                       read-only health check (git, node, lock, symlinks, duplicates)
apm check                        full integrity sweep (doctor + mcp + providers + skills)
apm link                         symlink agents/skills and AGENTS.md into provider homes
```

`apm skills accept` and `apm skills review --accept` are different operations. The first promotes staged content into the live tree. The second adds review findings to the review baseline so future scans suppress them.

## Baseline MCP

`config/providers/mcp.json` declares shared baseline MCP servers (currently Context7). The script configures whichever of Claude Code, Codex, and OpenCode are present. OpenCode MCP servers are mapped to their remote endpoint equivalents and written to `~/.config/opencode/opencode.jsonc`:

```bash
./apm mcp install    # install all MCP config
./apm mcp check      # verify without changing anything
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
./apm skills fetch           # fetch all declared skills into .stage
./apm skills review          # advisory scan of the staged diff for injection/exec risk
./apm skills accept          # promote stage to live
./apm skills audit           # audit entire live skill tree (regex + skillspector)
./apm skills reject <skill>  # remove a staged skill from stage
./apm skills remove <skill>  # remove a live skill from live tree and lock
./apm check                  # integrity sweep (doctor + mcp + providers + skills check)
```

`make` is for `install` (the multi-step orchestrator), `build`, `test`, `lint`, `typecheck`, and `clean`. Individual actions go through `./apm` directly. Run `./apm --help` for the full surface; see the CLI reference below.

`apm skills` proves *integrity* — hash-locked content, path-safe extraction, tracked licenses. It cannot prove *safety*: a vendored `SKILL.md` is prose an agent reads and follows as instructions, and vendored scripts run under agent hooks.

`apm skills review` scans the git diff (newly fetched changes) for two risk classes hashing can't catch: prompt-injection language in prose files (custom regexes for instruction overrides, concealment, credential/secret access, exfiltration phrasing) and code-execution risk in scripts (Semgrep rules for `curl | sh`, `eval`, `subprocess`, `child_process`, `rm -rf /`, and dynamic env access). Findings are fingerprinted and filtered against the skills-review baseline so only genuinely new hits surface.

`apm skills audit` walks the entire live skill tree — prose regex scan plus Semgrep code scan, no baseline filtering. Use it to calibrate the scanner against the current corpus, or to hand findings to another agent for review. Also runs NVIDIA SkillSpector (AST/taint/YARA, static-only `--no-llm`) across all skill directories.

Both tools share patterns and utilities from `src/skills/review/`. [`semgrep`](https://semgrep.dev/) and [`skillspector`](https://github.com/NVIDIA/skillspector) are installed in the repo-local venv via `uv sync`. No skill content leaves the machine.

This is advisory, not a gate — findings need a human to read them, and none of this replaces actually reading the diff of any repo you don't control.

After fetching, review the Git diff and the `apm skills review` output before committing. First-party skills can be added directly to `.agents/skills/` without being listed in `config/skills/manifest.json`.

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
./apm doctor          # read-only health check (git, node, lock, symlinks, duplicates)
./apm check           # full integrity sweep: doctor + mcp check + providers check + skills check
```

`./apm check` runs doctor (symlink validation for all providers), MCP config verification (Claude/Codex/OpenCode), provider config verification (OpenCode), and vendored skill hash checks — all without changing the machine.

## Provider Routing

Models are routed through [9Router](https://github.com/mihado/9router), a proxy that handles quota tracking, automatic fallback, and request routing across multiple provider accounts.

```
Your CLI tool ──► OpenCode config ──► 9Router ──► provider A
                  (providers.json)                └─► provider B (fallback)
                                                  └─► provider C
```

- **`config/providers/opencode.json`** — manifest of providers and models. Each provider declares its base URL, API key env var, and models with reasoning, limit, modalities, and capability metadata. Model metadata is sourced from [models.dev](https://models.dev).
- **`./apm providers install`** — syncs `config/providers/opencode.json` → OpenCode's `~/.config/opencode/opencode.jsonc`. Propagates `reasoning`, `limit`, `modalities`, `tool_call`, `temperature`, and `apiKey` fields.
- **Fusion models** (e.g., `deepseek-v4-pro-fusion`) let text-only models gain vision capability through the router: image requests route to a vision-capable backend while text stays on the primary model. Drop-in replacements.

### Metadata reference

Each model in `config/providers/opencode.json` may declare these fields, propagated to OpenCode config:

| Field | What it does |
|---|---|
| `name` | Display name in model picker |
| `reasoning` | Whether the model supports thinking/reasoning tokens |
| `tool_call` | Whether the model supports tool calling |
| `temperature` | Whether the model accepts a `temperature` parameter |
| `limit.context` | Maximum input context window |
| `limit.output` | Maximum output tokens |
| `modalities` | Input/output types: `text`, `image`, `audio`, `video`, `pdf` |

```bash
./apm providers install   # sync config/providers/opencode.json → OpenCode config
./apm check               # verify everything
```

## License

AGPL-3.0 — see [LICENSE](LICENSE).
