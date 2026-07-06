# agents

Engineering instructions and skill content for OpenCode, Claude Code, Codex, and Kiro. Portable practice only: no product context, no credentials, no machine-specific paths.

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

Requirements: Git, Node.js, [uv](https://docs.astral.sh/uv/), OpenCode, Claude Code, and/or Codex.

```bash
git clone git@github.com:mihado/agents.git ~/path/to/repo
cd ~/path/to/repo
make install
./apm check
```

`make install` builds TypeScript sources, then runs `./apm install` to set up local links, MCP config, and provider config. `./apm check` runs the full integrity suite (doctor, MCP, providers, skills). Run `make deps` separately to install Python tooling (skillspector, semgrep) via `uv sync`.

To run individual steps:

```bash
make deps                # set up Python venv (skillspector, semgrep) via uv sync
./apm install            # link + mcp + providers
./apm doctor             # quick local sanity check
./apm check              # full integrity sweep
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

`~/.agents/skills/` is the universal skills path: OpenCode and Zed discover skills here. `~/.kiro/skills/` is Kiro's global skills path. If `~/.kiro` doesn't exist yet (Kiro not installed on this machine), the link script creates it so skills are ready the moment Kiro is installed.

Each entry is linked individually. Existing unrelated skills survive. A file, directory, or foreign symlink at the same path causes installation to stop rather than overwrite.

`CODEX_HOME`, `CLAUDE_HOME`, `AGENTS_HOME`, and `KIRO_HOME` may be set to install into alternate locations.

## CLI Reference

`apm` (**A**gent **P**ackage **M**anager) is the canonical command-line interface. It is a Commander-based CLI built from `src/cli/main.ts`; the in-repo shim `./apm` runs the built entrypoint until a global install puts the binary on PATH. Run `./apm --help` to see the live surface.

`make` keeps `install` (the multi-step orchestrator that runs `./apm install`) plus build/test/lint targets. Individual actions go through `apm`.

```text
apm install                      install local agent setup (links + mcp + providers)
apm doctor                       read-only local sanity check (git, node, lock shape, symlinks, duplicates)
apm check                        full integrity sweep (doctor + mcp check + providers check + skills check)
apm skills fetch                 fetch declared third-party skills into .stage/skills
apm skills check                 verify live lock matches the working copy
apm skills review                review staged skill content before accept/reject
apm skills accept                promote stage to live
apm skills reject <name>         remove a staged skill from stage
apm skills remove <name>         remove a live skill from live tree and lock
apm skills audit                 audit entire live skill tree
apm skills audit --accept        accept current live findings into the review baseline
apm skills audit --json          emit audit findings as JSON
apm mcp install                  install MCP server entries from config/providers/mcp.json
apm mcp check                    verify MCP server entries
apm providers install            install provider configuration
apm providers check              verify provider configuration
```

## Diagnostics

```bash
./apm doctor          # quick local sanity check (git, node, lock shape, symlinks, duplicates)
./apm check           # full integrity sweep: doctor + mcp check + providers check + skills check
```

`./apm doctor` is the fast local pass. `./apm check` runs the full sweep: symlink validation, MCP config verification, provider config verification, and vendored skill hash checks. Nothing changes on your machine.

The skills lifecycle:

- **Fetch** declared skills from upstream into `.stage/skills/`: inert, not loaded by any agent
- **Review** the staged diff against prose injection and code execution risk patterns
- **Reject** any staged skill you don't want: remove it from stage, keep everything else intact
- **Accept** whatever remains in stage, promoting it into `.agents/skills/` and updating the lock
- **Audit** the live tree after promotion, optionally recording accepted findings into the baseline with `apm skills audit --accept`

Reject operates on individual skills: if you approve three out of four staged skills, reject the fourth and accept the rest. The lock always reflects only what is live. For the full security model and scanner details, see [`docs/SECURITY.md`](docs/SECURITY.md).

## Baseline MCP

`config/providers/mcp.json` declares shared MCP servers (currently Context7). The installer configures whichever of OpenCode, Claude Code, and Codex are present on your machine.

```bash
./apm mcp install    # install all MCP config
./apm mcp check      # verify without changing anything
```

Environment variable names may be documented in `config/providers/mcp.json`; values stay in the machine environment and are never stored here.


## Vendored Skills

Skills are copied unchanged from upstream repositories declared in `config/skills/manifest.json`:

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [lguz/humanize-writing-skill](https://github.com/lguz/humanize-writing-skill)
- [mattpocock/skills](https://github.com/mattpocock/skills)
- [nutlope/hallmark](https://github.com/nutlope/hallmark)
- [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- [shadcn/improve](https://github.com/shadcn/improve)
- [tw93/kami](https://github.com/tw93/Kami)
- [wondelai/skills](https://github.com/wondelai/skills)

See [CLI Reference](#cli-reference) for all available commands (fetch, review, accept, reject, remove, audit, check).

The lifecycle: fetch, review, reject anything you don't want, then accept what's left. Fetched content lands in `.stage/skills/` first (inert, not loaded by any agent) until `./apm skills accept` promotes it into `.agents/skills/`. Baseline acceptance is optional and happens separately via `./apm skills audit --accept` against already-live content.

First-party skills can live directly in `.agents/skills/` without being listed in the manifest. If you want them in the managed supply chain, add them to `config/skills/manifest.json`.

### What the scanners actually check

`apm skills review` scans the staged diff for two things hashing can't catch:

- **Prompt injection in prose.** Regex patterns for instruction overrides, concealment, credential access, and exfiltration phrasing in markdown and text files.
- **Code execution risk in scripts.** Semgrep rules for `curl | sh`, `eval`, `subprocess`, `child_process`, `rm -rf /`, and dynamic `process.env` access.

Findings are fingerprinted and filtered against the `skills-review` baseline so only genuinely new hits surface. This is advisory: a human reads the findings and the actual diff.

`apm skills audit` walks the entire live tree with the same prose and Semgrep scan, plus optional [SkillSpector](https://github.com/NVIDIA/skillspector) (AST/taint/YARA, static-only `--no-llm`). Use it to inspect accepted content, or after a staged accept to decide whether current live findings should be recorded into the baseline.

Both tools share patterns from `src/skills/review/`. [`semgrep`](https://semgrep.dev/) and `skillspector` are installed in the repo-local venv via `make deps`. **The venv needs Python 3.12+ (`uv sync` installs it), so review and audit won't work without it.** The other commands: fetch, check, accept, reject, remove, doctor. They work with just pnpm.

No skill content leaves the machine.

### Skill boundaries

Skills are grouped by portability and calibration:

- `engineering/` - portable engineering practice and ship chains
- `productivity/` - portable workflows useful beyond a single person
- `product/` - product framework skills and discovery chains
- `design/` - UI/UX design skills and review chains
- `business/` - business and operations skills
- `calibrated/minh/` - skills calibrated to Minh's voice, judgment, and preferences

Chain skills compose multiple vendored skills into a single workflow (e.g., `design-review` chains `refactoring-ui`, `ux-heuristics`, and `microinteractions`). They live next to the skills they compose.

The directory structure documents ownership and portability, not runtime profiles. Skill directory names must be globally unique across all installed repositories. Review calibrated material before pushing to a public repo.


## License

Apache-2.0 - see [LICENSE](LICENSE).
