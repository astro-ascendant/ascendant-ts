.DEFAULT_GOAL := help

.PHONY: help install hooks example build test test-watch typecheck lint lint-fix format format-check package-check publish check benchmark

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: hooks ## Install dependencies
	bun install

hooks: ## Register the versioned git hooks in .githooks
	@sh .githooks/install.sh

example: ## Select and run an example
	bun run examples/index.ts

benchmark: ## Run benchmarks (interactive CLI)
	bun run benchmarks/cli.ts

build: ## Build the npm package into dist/
	bun run build

test: ## Run the test suite once
	bun run test

test-watch: ## Run tests in watch mode
	bun run test:watch

typecheck: ## Check TypeScript types
	bun run typecheck

lint: ## Check lint rules
	bun run lint

lint-fix: ## Fix lint violations where possible
	bun run lint:fix

format: ## Format project files
	bun run fmt

format-check: ## Check project formatting
	bun run fmt:check

package-check: build ## Inspect the npm package contents
	bun run package:check

publish: ## Publish the package to npm
	npm publish --access public --provenance=false

check: typecheck test lint format-check build ## Run all verification checks

add-effect: ## Add `effect` repository as a git subtree
	git subtree add \
  	--prefix=repos/effect \
  	https://github.com/Effect-TS/effect.git \
  	main \
  	--squash

pull-effect: ## Pull latest changes from `effect` repository into the subtree
	git subtree pull \
		--prefix=repos/effect \
		https://github.com/Effect-TS/effect.git \
		main \
		--squash
