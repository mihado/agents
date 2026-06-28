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
  opencode-providers       syncs providers.json → OpenCode provider config
  lib/                     shared utilities (opencode config I/O)
Makefile                   convenience targets for install, check, test
mcp.json                   baseline MCP server definitions
providers.json             AI provider manifest (models, limits, reasoning flags)
skills.json                selected skills and their upstream sources
skills.lock                resolved commits, provenance, and content hashes
LICENSE                    AGPL-3.0
```

## Install

Requirements: Git, Node.js, Claude Code, Codex, and/or OpenCode.

```bash
git clone git@github.com:mihado/agents.git ~/path/to/repo
cd ~/path/to/repo
make install
make check
```

`make install` runs the link script (Claude/Codex/universal symlinks), syncs baseline MCP (Claude/Codex) and OpenCode remote config, then writes provider config (OpenCode). `make check` runs the full integrity suite (doctor, MCP, providers, vendor).

To run individual steps:

```bash
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
```

`~/.agents/skills/` is the universal skills path — OpenCode and Zed discover skills here.

Each entry is linked individually. Existing unrelated skills survive. A file, directory, or foreign symlink at the same path causes installation to stop rather than overwrite.

`CODEX_HOME`, `CLAUDE_HOME`, and `AGENTS_HOME` may be set to install into alternate locations.

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

```bash
./scripts/vendor --fetch   # fetch all declared skills and regenerate skills.lock
./scripts/vendor --check   # verify hashes offline without fetching
# or: make vendor
```

After fetching, review the Git diff before committing. First-party skills can be added directly to `.agents/skills/` without being listed in `skills.json`.

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

`make check` runs doctor (Claude/Codex symlinks), MCP config verification (Claude/Codex) and OpenCode remote config, provider config verification (OpenCode), and vendored skill hash checks. `./scripts/doctor` reports missing commands, broken or foreign symlinks, manifest and lock integrity, content hash mismatches, and MCP configuration — without changing the machine.

## Provider Routing

We run a **"poor man's OpenRouter"**: pool multiple cheap API subscription plans through [9Router](https://github.com/mihado/9router), a hardened proxy that handles quota tracking, automatic tier fallback, and token saving (RTK).

### How it fits together

```
Your CLI tool ──► OpenCode config ──► 9Router ──► provider A (until drained)
                  (providers.json)                └─► provider B (fill_first)
                                                  └─► provider C
```

- **`providers.json`** — manifest of providers and models we use. Each provider declares its base URL, API key env var, and models with reasoning/limit metadata. Models are identified by their upstream canonical IDs (e.g., `cmc/deepseek/deepseek-v4-pro`).
- **`scripts/opencode-providers`** — syncs `providers.json` → OpenCode's `~/.config/opencode/opencode.jsonc`. Run `--install` to write, `--check` to verify. Propagates `reasoning`, `limit`, and `apiKey` fields.
- **`9router`** — hardened fork of `decolua/9router` (MIT). Sits between your tools and the providers. Handles quota tracking, `fill_first` account draining (keeps KV caches warm on a single account), auto-fallback when an account runs dry, and RTK token compression. Built and published only from the `hardened` branch to `ghcr.io/mihado/9router`.

### Strategy

Pool multiple $1–15/month API subscription plans (Command Code GO, OpenCode Go, etc.). Route through 9Router with `fill_first` to keep KV caches warm for cache-read discounts. When one account's quota exhausts, fall back to the next. Net result: production-quality AI coding at a fraction of direct API pricing.

### Quick start

```bash
make providers   # sync providers.json → OpenCode config
make check       # verify everything
```

## License

AGPL-3.0 — see [LICENSE](LICENSE).
