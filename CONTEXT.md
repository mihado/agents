# Agent Tooling

This repository manages agent skill content and configures agent runtimes (Claude, Codex, OpenCode, Kiro, `.agents`) in this workspace.

## Language

### Domains

**Skill Supply Chain**:
The full lifecycle of declared skill content: manifest definition, lock pinning, upstream fetch, integrity verification, diff review, and live-tree audit.
_Avoid_: Vendor (use only for CLI entrypoint names)

**Provider Module**:
A self-contained integration module for one target agent environment. Each provider module owns its paths, install behavior, check behavior, and any MCP or config behavior.
_Avoid_: Provider (unqualified, when it could mean an LLM API provider)

### Skill Subdomains

**Inventory**:
The declared and discovered shape of skills — manifest, lock, discovery, and safe-path rules.

**Integrity**:
Whether bytes on disk match what the lock and content hashes say should exist.
_Avoid_: Verification (use integrity instead)

**Ingest**:
Bringing upstream skill content into this repository's managed tree — fetch and apply.
_Avoid_: Vendor, download

**Review**:
Advisory or audit scanning over skill content — prose scan, Semgrep, SkillSpector, diff parsing, and baselines.
_Avoid_: Audit (use for full-tree scanning only), review (use for diff-based scanning only)

### Provider Concepts

**Agent Environment**:
A runtime or CLI tool that can load skill content from this repo, such as Claude, Codex, OpenCode, Kiro, or bare `.agents`.
_Avoid_: Provider (when it means agent environment instead of LLM API provider)

**Link**:
Creation or repair of symlinks pointing into a provider's config or home area. Symlinks only — not config file generation.
_Avoid_: Install (which is the broader setup workflow)

**Install**:
Top-level machine setup workflow for a provider. May call link plus provider-specific config setup (MCP, model config, etc.).

**Check**:
Verification workflow that confirms a provider's current machine state is correct. The CLI command name for this workflow is `doctor`.
_Avoid_: Doctor, verify (for provider context)

### Core Types

**Finding**:
A single review result with a file path, label, snippet, optional line number, and content fingerprint.

**Baseline**:
A set of accepted findings and suppression rules that has been reviewed and accepted by a human.

**SkillEntry**:
A discovered skill directory at a specific path, with its name and relative path.

**Manifest**:
The declared set of sources (upstream repositories) and skills that this repo intends to vend. Stored in `config/skills/manifest.json`.

**Lock**:
The pinned, resolved state of the manifest — the specific commits, content hashes, and license hashes for every declared source and skill. Stored in `config/skills/lock.json`.

**Source**:
An upstream repository from which skill content is fetched.

### Other

**MCP (Model Context Protocol)**:
A protocol for connecting agent environments to external tools and data sources. MCP server definitions are stored in `config/providers/mcp.json`. These are provider-adjacent configuration, not part of the skill supply chain.
