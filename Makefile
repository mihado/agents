.PHONY: install deps test typecheck lint help clean clean-build clean-stage

.DEFAULT_GOAL := help

BUILD_STAMP := dist/.build-stamp
TS_SOURCES := $(shell find src -name '*.ts' -print)
BUILD_INPUTS := $(TS_SOURCES) tsconfig.json package.json pnpm-lock.yaml

help:
	@echo "make install        Install user config (link + MCP + providers)"
	@echo "make deps           Install dev dependencies (uv sync — skillspector, semgrep)"
	@echo "make build          Build TypeScript sources to dist/"
	@echo "make clean          Remove all build artifacts and staged skills"
	@echo "make clean-build    Remove build artifacts only"
	@echo "make clean-stage    Remove staged skills only"
	@echo "make typecheck      Type-check TypeScript sources (no emit)"
	@echo "make lint           Lint all source files"
	@echo "make test           Run tests"
	@echo ""
	@echo "Make is for build and install. For individual actions, use ./apm:"
	@echo "  ./apm skills fetch | check | review | accept | reject <s> | remove <s> | audit"
	@echo "  ./apm mcp install | check"
	@echo "  ./apm providers install | check"
	@echo "  ./apm doctor | check | link"

install: build
	./apm link
	./apm mcp install
	./apm providers install

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

test: build
	pnpm test
