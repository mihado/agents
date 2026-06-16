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
  skills/engineering/      portable engineering practice
  skills/productivity/     portable general workflows
  skills/personal/         Minh-specific utilities
  skills/calibrated/minh/  skills containing Minh-calibrated context
  licenses/                upstream license notices
scripts/
  install                  symlinks instructions and skills into Claude, Codex, and Zed
  doctor                   checks installation and integrity
  mcp                      installs and verifies baseline MCP servers
  vendor                   fetches and verifies vendored skills
mcp.json                   baseline MCP server definitions
skills.json                selected skills and their upstream sources
skills.lock                resolved commits, provenance, and content hashes
```

## Install

Requirements: Git, Node.js, Claude Code, Codex, and/or Zed.

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
~/.zed/skills/<name>     -> <repo>/.agents/skills/<name>
```

Each entry is linked individually. Existing unrelated skills survive. A file, directory, or foreign symlink at the same path causes installation to stop rather than overwrite.

`CODEX_HOME`, `CLAUDE_HOME`, and `ZED_HOME` may be set to install into alternate locations.

## Baseline MCP

`mcp.json` declares shared baseline MCP servers (currently Context7). The script configures whichever of Claude Code, Codex, and OpenCode are present. OpenCode MCP servers are mapped to their remote endpoint equivalents and written to `~/.config/opencode/opencode.jsonc`:

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

### First-Party Skill Boundaries

First-party skills are grouped by portability and calibration:

- `engineering/` contains portable engineering practice.
- `productivity/` contains portable workflows that are useful beyond a single person or domain.
- `personal/` contains utilities that are useful because of how Minh works but do not model his identity or voice.
- `calibrated/minh/` contains skills and references calibrated to Minh's voice, judgment, history, or preferences.

All categories are installed on Minh's machines and discovered under a flat skill namespace. The directory structure documents ownership and portability; it is not a runtime profile system. Review calibrated material before pushing it to a public repository.

## Diagnostics

```bash
./scripts/doctor
```

Reports missing commands, broken or foreign symlinks, manifest and lock integrity, content hash mismatches, and MCP configuration — without changing the machine.
