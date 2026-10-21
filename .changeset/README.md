# Changesets

Add one Markdown file here for every user-facing change that should appear in
the package release notes.

Create a changeset with:

```bash
bun run changeset
```

Choose `astro-ascendant` and the appropriate semver bump. `bun run version`
consumes the pending changesets and writes `CHANGELOG.md`; the release itself
runs in CI from a tag push. See [`RELEASE.md`](../RELEASE.md) for the full
process.
