.PHONY: install check test vendor mcp providers help

.DEFAULT_GOAL := help

help:
	@echo "make install     Install everything (symlinks, MCP, providers)"
	@echo "make check       Run machine integrity checks (doctor, MCP, providers, vendor)"
	@echo "make test        Run tests"
	@echo "make vendor      Fetch vendored skills"
	@echo "make mcp         Sync MCP configuration"
	@echo "make providers   Sync OpenCode provider configuration"

install:
	./scripts/link
	$(MAKE) mcp
	$(MAKE) providers

check:
	./scripts/doctor
	./scripts/mcp --check
	./scripts/opencode-providers --check
	./scripts/vendor --check

test:
	node --test scripts/lib/opencode-config.test.js

vendor:
	./scripts/vendor --fetch

mcp:
	./scripts/mcp --install

providers:
	./scripts/opencode-providers --install
