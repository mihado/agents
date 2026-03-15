#!/usr/bin/env bash
set -euo pipefail

DYNOKUMA="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== dynokuma install ==="

# Claude Code — MCP registered via CLI (writes to ~/.claude.json, not a file symlink)
if claude mcp list 2>/dev/null | grep -q "context7"; then
  echo "claude: context7 already registered"
else
  claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
  echo "claude: context7 added to user config"
fi

# Claude Code — user-level agents
mkdir -p ~/.claude
ln -sf "$DYNOKUMA/.agents/agents" ~/.claude/agents
echo "claude: ~/.claude/agents"

# OpenCode — user-level config
mkdir -p ~/.config/opencode
ln -sf "$DYNOKUMA/opencode/opencode.json" ~/.config/opencode/opencode.json
echo "opencode: ~/.config/opencode/opencode.json"

# OpenCode — user-level agents and commands
ln -sf "$DYNOKUMA/.agents/agents" ~/.config/opencode/agents
echo "opencode: ~/.config/opencode/agents"
ln -sf "$DYNOKUMA/.agents/commands" ~/.config/opencode/commands
echo "opencode: ~/.config/opencode/commands"

echo ""
echo "VSCode MCP is per-project (not global). For each project:"
echo "  mkdir -p <project>/.vscode"
echo "  ln -sf $DYNOKUMA/vscode/mcp.json <project>/.vscode/mcp.json"
echo ""
echo "Make sure CONTEXT7_API_KEY is exported in your shell if you have a key."
echo ""
echo "done"
