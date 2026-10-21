.DEFAULT_GOAL := help

# This file only defines targets that add something Make itself provides
# (help, hook registration, publish flags, subtree). Every other target is
# forwarded to package.json, so `make test` is `bun run test` and adding a
# script never means editing this file.

OWN_TARGETS := help install hooks check publish add-effect pull-effect

.PHONY: $(OWN_TARGETS)

help: ## Show available commands
	@printf 'Usage: make <target>\n\nMake targets:\n'
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf '\nPackage scripts, also runnable as "make <name>":\n'
	@OWN='$(OWN_TARGETS)' bun -e 'const own = new Set(process.env.OWN.split(" ")); const {scripts} = require("./package.json"); for (const name of Object.keys(scripts).sort()) if (!own.has(name)) console.log("  " + name.padEnd(16) + scripts[name])'

install: hooks ## Install dependencies
	bun install

hooks: ## Register the versioned git hooks in .githooks
	@sh .githooks/install.sh

check: ## Run all verification checks
	@bun run check

publish: ## Publish the package to npm
	npm publish --access public --provenance=false

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

# Any other target must name a package.json script. Dashes resolve to the
# colon-named scripts, so `make test-watch` runs `test:watch`. Written as the
# default rule so it never tries to rebuild this Makefile.
.DEFAULT:
	@target=$$(bun -e '\
		const {scripts} = require("./package.json"); \
		const asked = process.argv[1]; \
		const name = [asked, asked.replace(/-/g, ":")].find((c) => Object.hasOwn(scripts, c)); \
		if (name) console.log(name); else process.exit(1);' $@) \
		|| { printf 'make: no target or package.json script named "%s"\nRun "make help" to list targets.\n' "$@" >&2; exit 2; }; \
	bun run "$$target"
