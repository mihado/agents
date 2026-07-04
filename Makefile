.PHONY: install setup check test vendor vendor-review vendor-audit mcp providers help

.DEFAULT_GOAL := help

help:
	@echo "make install       Install everything (symlinks, MCP, providers, Python tooling)"
	@echo "make setup         Set up Python venv (skillspector, etc.) via uv"
	@echo "make check         Run machine integrity checks (doctor, MCP, providers, vendor)"
	@echo "make test          Run tests"
	@echo "make vendor        Fetch vendored skills, then run vendor-review"
	@echo "make vendor-review Advisory scan of vendored skill diffs for injection/exec risk"
	@echo "make vendor-audit  Audit entire live skill tree for injection/exec risk patterns"
	@echo "make mcp           Sync MCP configuration"
	@echo "make providers     Sync OpenCode provider configuration"

install:
	./scripts/link
	$(MAKE) setup
	$(MAKE) mcp
	$(MAKE) providers

setup:
	uv sync

check:
	./scripts/doctor
	./scripts/mcp --check
	./scripts/opencode-providers --check
	./scripts/vendor --check

test:
	pnpm test

vendor:
	./scripts/vendor --fetch
	./scripts/vendor-review

vendor-review:
	./scripts/vendor-review

vendor-audit:
	./scripts/vendor-audit

mcp:
	./scripts/mcp --install

providers:
	./scripts/opencode-providers --install
