.PHONY: install deps check test typecheck lint vendor vendor-review vendor-audit vendor-accept vendor-reject vendor-remove mcp providers help clean clean-build clean-stage

.DEFAULT_GOAL := help

BUILD_STAMP := dist/.build-stamp
TS_SOURCES := $(shell find src -name '*.ts' -print)
BUILD_INPUTS := $(TS_SOURCES) tsconfig.json package.json pnpm-lock.yaml

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
	@echo "make vendor         Fetch vendored skills to stage"
	@echo "make vendor-review  Advisory scan of staged skill diffs (with skillspector)"
	@echo "make vendor-audit   Audit entire live skill tree (regex + skillspector)"
	@echo "make vendor-accept  Accept findings, promote stage to live"
	@echo "make vendor-reject  Remove a skill from stage (usage: make vendor-reject SKILL=<skill-name>)"
	@echo "make vendor-remove  Remove a skill from live tree and lock (usage: make vendor-remove SKILL=<skill-name>)"
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
	node dist/cli/vendor.js --check

test: build
	pnpm test

vendor: build
	node dist/cli/vendor.js --fetch

vendor-review: build
	node dist/cli/vendor-review.js --skillspector

vendor-audit: build
	node dist/cli/vendor-audit.js --skillspector

vendor-accept: build
	node dist/cli/vendor-accept.js

vendor-reject: build
	node dist/cli/vendor-reject.js

vendor-remove: build
	node dist/cli/vendor-remove.js

mcp: build
	node dist/cli/mcp.js --install

providers: build
	node dist/cli/opencode-providers.js --install
