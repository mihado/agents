# agents

Shared engineering instructions and workflows for Claude Code and Codex.

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
  skills/<category>/       vendored skills organized for humans
  licenses/                upstream license notices
scripts/
  install                  symlinks instructions and skills into Claude and Codex
  doctor                   checks installation and integrity
  mcp                      installs and verifies baseline MCP servers
  vendor                   fetches and verifies vendored skills
mcp.json                   baseline MCP server definitions
skills.json                selected skills and their upstream sources
skills.lock                resolved commits, provenance, and content hashes
```

## Install

Requirements: Git, Node.js, Claude Code, and/or Codex.

```bash
git clone git@github.com:mihado/agents.git ~/Repos/agents
cd ~/Repos/agents
./scripts/install
./scripts/mcp --install
./scripts/doctor
```

The installer creates these symlinks:

```text
~/.codex/AGENTS.md       -> <repo>/AGENTS.md
~/.claude/AGENTS.md      -> <repo>/AGENTS.md
~/.claude/CLAUDE.md      -> <repo>/CLAUDE.md
~/.codex/skills/<name>   -> <repo>/.agents/skills/<name>
~/.claude/skills/<name>  -> <repo>/.agents/skills/<name>
```

Each entry is linked individually. Existing unrelated skills survive. A file, directory, or foreign symlink at the same path causes installation to stop rather than overwrite.

`CODEX_HOME` and `CLAUDE_HOME` may be set to install into alternate locations.

## Baseline MCP

`mcp.json` declares shared baseline MCP servers (currently Context7). The script configures whichever of Claude Code and Codex are present:

```bash
./scripts/mcp --install   # install
./scripts/mcp --check     # verify without changing anything
```

Environment variable names may be documented in `mcp.json`; values stay in the machine environment and are never stored here.

## Vendored Skills

Skills are copied unchanged from upstream repositories declared in `skills.json`:

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
- [mattpocock/skills](https://github.com/mattpocock/skills)

```bash
./scripts/vendor --fetch   # fetch all declared skills and regenerate skills.lock
./scripts/vendor --check   # verify hashes offline without fetching
```

After fetching, review the Git diff before committing. First-party skills can be added directly to `.agents/skills/` without being listed in `skills.json`.

Skill directory names must be globally unique across all installed repositories.

## Diagnostics

```bash
./scripts/doctor
```

Reports missing commands, broken or foreign symlinks, manifest and lock integrity, content hash mismatches, and MCP configuration — without changing the machine.
