# agents

Generic AI tooling config — agents, commands, and MCP servers. Clone on any machine and run `setup.sh`.

Works with: Claude Code, OpenCode, VSCode (with Copilot).

## Layout

```
.agents/
  agents/        # custom agents (Claude Code: ~/.claude/agents, OpenCode: ~/.config/opencode/agents)
  commands/      # slash commands (project-level: .claude/commands, .opencode/commands)
opencode/
  opencode.json  # OpenCode user-level config → ~/.config/opencode/opencode.json
vscode/
  mcp.json       # VSCode MCP config (per-project symlink, not global)
setup.sh
```

## Install

```bash
git clone git@github.com:mihado/agents.git ~/Repos/agents
cd ~/Repos/agents
./setup.sh
```

### What setup.sh does

| Tool | Mechanism | Location |
|------|-----------|----------|
| Claude Code MCP | `claude mcp add --scope user` | `~/.claude.json` |
| Claude Code agents | symlink | `~/.claude/agents → .agents/agents` |
| Claude Code commands | symlink | `~/.claude/commands → .agents/commands` |
| OpenCode MCP | symlink | `~/.config/opencode/opencode.json` |
| OpenCode agents | symlink | `~/.config/opencode/agents → .agents/agents` |
| OpenCode commands | symlink | `~/.config/opencode/commands → .agents/commands` |
| VSCode MCP | **per-project** symlink (manual) | `<project>/.vscode/mcp.json` |

Claude Code reads MCP config from `~/.claude.json` via `claude mcp add` — not from a symlinked file.
OpenCode reads from `~/.config/opencode/opencode.json` — symlink works fine.

### VSCode MCP (per-project)

VSCode MCP is workspace-scoped. For each project that needs it:

```bash
mkdir -p <project>/.vscode
ln -sf ~/Repos/agents/vscode/mcp.json <project>/.vscode/mcp.json
```

## MCP Servers

### Context7

Provides live library documentation to AI tools.

- No API key required for basic use
- Optional: `export CONTEXT7_API_KEY=your-key` in `.bashrc`/`.zshrc` for higher rate limits
- Key is never stored in this repo — it comes from shell environment

## .agents pattern

`.agents/` is the canonical source. Each tool symlinks into it:

| Directory | Claude Code | OpenCode |
|-----------|-------------|----------|
| `agents/` | `~/.claude/agents` (user-level) | `~/.config/opencode/agents` (user-level) |
| `commands/` | `.claude/commands` (project-level) | `.opencode/commands` (project-level) |

For project-level commands:
```
.agents/commands/   # source
.claude/commands    → ../.agents/commands
.opencode/commands  → ../.agents/commands
```

## Adding a new MCP server

1. Add to `opencode/opencode.json` (OpenCode)
2. Run `claude mcp add --scope user <name> -- <command>` (Claude Code)
3. Add to `vscode/mcp.json` (VSCode, if needed)
4. Document here
