.PHONY: install deps check test typecheck lint vendor vendor-review vendor-audit vendor-accept vendor-reject vendor-remove mcp providers help clean clean-build clean-stage

.DEFAULT_GOAL := help

BUILD_STAMP := dist/.build-stamp
TS_SOURCES := $(shell find src -name '*.ts' -print)
BUILD_INPUTS := $(TS_SOURCES) tsconfig.json package.json pnpm-lock.yaml

# Canonical CLI entrypoint — all lifecycle targets below route through this.
CLI := node dist/cli/main.js

help:
	@echo "make install        Install user config (symlinks, MCP, providers)"
	@echo "make deps           Install dev dependencies (uv sync — skillspector, semgrep)"
	@echo "make check          Run machine integrity checks (doctor, MCP, providers, vendor)"
	@echo "make build          Build TypeScript sources to dist/"
	@echo "make clean          Remove all build artifacts and staged skills"
	@echo "make clean-build    Remove build artifacts only"
	@echo "make clean-stage    Remove staged skills only"
	@echo "make typecheck      Type-check TypeScript sources (no emit)"
	@echo "make lint           Lint all source files"
	@echo "make test           Run tests"
	@echo "make vendor         Fetch vendored skills to stage (agents vendor fetch)"
	@echo "make vendor-review  Review staged skill diffs with skillspector (agents vendor review --skillspector)"
	@echo "make vendor-audit   Audit live skill tree with skillspector (agents vendor audit --skillspector)"
	@echo "make vendor-accept  Promote stage to live (agents vendor accept)"
	@echo "make vendor-reject  Remove a skill from stage (agents vendor reject <skill>)"
	@echo "make vendor-remove  Remove a skill from live tree (agents vendor remove <skill>)"
	@echo "make mcp            Sync MCP configuration"
	@echo "make providers      Sync OpenCode provider configuration"

install: build
	node dist/cli/link.js
	$(MAKE) mcp

deps:
	uv sync

$(BUILD_STAMP): $(BUILD_INPUTS)
	pnpm build
	@mkdir -p dist
	@touch $(BUILD_STAMP)

build: $(BUILD_STAMP)

clean: clean-build clean-stage

clean-build:
	rm -rf dist

clean-stage:
	rm -rf .stage/skills .stage/stage-lock.json

typecheck:
	pnpm typecheck

lint:
	pnpm lint

check: build
	node dist/cli/doctor.js
	node dist/cli/mcp.js --check
	$(CLI) vendor check

test: build
	pnpm test

vendor: build
	$(CLI) vendor fetch

vendor-review: build
	$(CLI) vendor review --skillspector

vendor-audit: build
	$(CLI) vendor audit --skillspector

vendor-accept: build
	$(CLI) vendor accept

vendor-reject:
	@if [ -z "$(SKILL)" ]; then \
		echo "Usage: make vendor-reject SKILL=<skill-name>"; \
		exit 1; \
	fi
	$(MAKE) build
	$(CLI) vendor reject $(SKILL)

vendor-remove:
	@if [ -z "$(SKILL)" ]; then \
		echo "Usage: make vendor-remove SKILL=<skill-name>"; \
		exit 1; \
	fi
	$(MAKE) build
	$(CLI) vendor remove $(SKILL)

mcp: build
	node dist/cli/mcp.js --install

providers: build
	node dist/cli/opencode-providers.js --install
