#!/bin/sh
# Point git at the versioned hooks in .githooks. Idempotent, and a no-op unless
# this repository actually ships that directory, so installing the package
# elsewhere never rewrites someone else's hook configuration.
set -eu

top=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -f "$top/.githooks/pre-commit" ] || exit 0

previous=$(git config --get core.hooksPath || true)
if [ "$previous" = ".githooks" ]; then
	exit 0
fi

git config core.hooksPath .githooks

if [ -n "$previous" ]; then
	echo "git hooks: core.hooksPath $previous -> .githooks" >&2
else
	echo "git hooks: core.hooksPath -> .githooks"
fi
