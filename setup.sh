#!/usr/bin/env bash
set -euo pipefail

AGENTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== .agents install ==="

# Claude Code — MCP registered via CLI (writes to ~/.claude.json, not a file symlink)
if claude mcp list 2>/dev/null | grep -q "context7"; then
  echo "claude: context7 already registered"
else
  claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
  echo "claude: context7 added to user config"
fi

# Claude Code — user-level agents and commands
mkdir -p ~/.claude
ln -sfn "$AGENTS/.agents/agents" ~/.claude/agents
echo "claude: ~/.claude/agents"
ln -sfn "$AGENTS/.agents/commands" ~/.claude/commands
echo "claude: ~/.claude/commands"

# OpenCode — user-level config
mkdir -p ~/.config/opencode
ln -sfn "$AGENTS/opencode/opencode.json" ~/.config/opencode/opencode.json
echo "opencode: ~/.config/opencode/opencode.json"

# OpenCode — user-level agents and commands
ln -sfn "$AGENTS/.agents/agents" ~/.config/opencode/agents
echo "opencode: ~/.config/opencode/agents"
ln -sfn "$AGENTS/.agents/commands" ~/.config/opencode/commands
echo "opencode: ~/.config/opencode/commands"

echo ""
echo "VSCode MCP is per-project (not global). For each project:"
echo "  mkdir -p <project>/.vscode"
echo "  ln -sf $AGENTS/vscode/mcp.json <project>/.vscode/mcp.json"
echo ""
echo "Make sure CONTEXT7_API_KEY is exported in your shell if you have a key."
echo ""
echo "done"
