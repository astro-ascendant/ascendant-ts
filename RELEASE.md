# Releasing astro-ascendant

Publishing runs in CI from a tag push, using npm OIDC trusted publishing, so
releases need no `NPM_TOKEN` secret and no one-time passwords.

Versions and release notes come from changesets. `CHANGELOG.md` and the
`version` field in `package.json` are the only places the release version
lives; `dist/` is build output and is never committed.

## One-time setup

Before the first tag-triggered release, add the trusted publisher on npmjs.com
(package **astro-ascendant** → Settings → Trusted publishing → GitHub
Actions):

| Field             | Value             |
| ----------------- | ----------------- |
| Provider          | GitHub Actions    |
| Organization/User | `astro-ascendant` |
| Repository        | `ascendant-ts`    |
| Workflow filename | `release.yml`     |
| Environment       | _(blank)_         |

After that there is nothing to do for future releases. The entry must match
exactly, including the workflow filename; if the workflow is ever renamed,
update the trusted publisher first or the OIDC exchange fails with
`403`/`ENEEDAUTH`.

Do not set an `NPM_TOKEN` secret, at repo or org level. The workflow never
passes a token to `npm publish`, because any `NODE_AUTH_TOKEN` in the publish
step makes npm authenticate with that token instead of exchanging the OIDC
token, and a missing or expired one fails with `ENEEDAUTH` before the trusted
publisher is consulted. An org-level secret is inherited by every repo, so
check the organization too, not just the repository. If you ever need a token
path instead of OIDC, add it deliberately and use an Automation or granular
token, never a classic Publish token.

## Release steps

1. Add a changeset for every user-facing change:
   ```bash
   bun run changeset
   ```
   Choose `astro-ascendant` and the semver bump: `major` for breaking
   changes, `minor` for features, `patch` for fixes. Commit the generated
   `.changeset/<name>.md` with the change.
2. Consume the pending changesets and bump the version:
   ```bash
   bun run version
   ```
   This rewrites `package.json`, regenerates `CHANGELOG.md`, and refreshes
   the lockfile. Review the diff: the changeset text becomes the `CHANGELOG.md`
   entry, which is what the npm version page shows.
3. Verify locally:
   ```bash
   make check
   make package:check
   ```
   `check` runs typecheck, tests, lint, format, and the build; `package:check`
   builds the published artifacts, type-checks the emitted declarations, runs
   the package runtime test, and dry-runs the tarball.
4. Commit the release and push to `main`:
   ```bash
   git add -A
   git commit -m "release: astro-ascendant vX.Y.Z"
   git push origin main
   ```
5. Create and push the tag (confirm first, since pushing the tag publishes
   to npm):
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

Pushing the tag runs `.github/workflows/release.yml`, which

- fails if the tag does not match `package.json` (`vX.Y.Z` vs `X.Y.Z`),
- reinstalls, verifies (`bun run check`, `bun run package:check`),
- publishes with `npm publish --provenance --access public` over OIDC, and
- creates a GitHub Release for the tag with generated notes.

The npm release and the GitHub Release both come from the one tag push, so
there is normally nothing extra to do after pushing it.

## GitHub Releases

The same job creates a GitHub Release for the tag, immediately after the npm
publish succeeds.

- The release title is the tag itself (`vX.Y.Z`); there is no separate name.
- The body comes from GitHub's own note generator (`--generate-notes`): merged
  pull requests and commits between the previous tag and this one. It is not
  the changeset text. That text lives in `CHANGELOG.md` and on the npm version
  page. If you want the Release to read like the changelog, edit the body after
  the fact:
  ```bash
  gh release edit vX.Y.Z --notes-file -   # paste, then Ctrl-D
  ```
- `--verify-tag` makes `gh` refuse to create the Release unless the tag already
  exists on the remote, so a bad ref cannot produce an empty shell release.
- The step is idempotent: it runs `gh release view` first and only creates the
  Release when one is missing. A retry never fails with "release already
  exists".
- It only runs on tag pushes. `workflow_dispatch` runs publish without creating
  a Release, because there is no tag to attach it to.
- Creating a Release needs write access to the repository contents, which is
  why the workflow requests `contents: write`. The default `github.token` is
  read-only now, so a missing permission shows up as a `403` on this step, not
  on the npm publish.

The Release is a pointer, not the artifact: the package itself is the npm
tarball. Deleting or editing a Release does not unpublish the version, and
deleting a tag does not remove the npm release either.

If the Release step fails after a successful publish, create it by hand:

```bash
gh release create vX.Y.Z --title vX.Y.Z --generate-notes --verify-tag
```

Do not re-run the whole workflow to fix this: the re-run repeats the publish
step first, which fails with `EPUBLISHCONFLICT` because the version is already
on npm, and never reaches the Release step. Version and tag should still match
the commit that `main` points at.

## Local publish alternative

```bash
make publish
```

`make publish` runs `npm publish --access public --provenance=false` from your
machine. It does not bump the version and does not create a tag, so run
`bun run version` first, and note that a local publish has no build
provenance. It needs npm auth with 2FA handled (automation token or `--otp`).
Prefer the tag-push CI path above.

`bun run release` (`bun run build && changeset publish`) is the changesets
equivalent: it publishes and creates `astro-ascendant@X.Y.Z` tags. Do not use
it for a release that goes through CI, since the two tag schemes would
diverge.

## Troubleshooting

- **`EOTP`**: a 2FA prompt reached CI. Use trusted publishing (no token) or an
  Automation token, never a classic Publish token.
- **`ENEEDAUTH` / `403`**: `id-token: write` is missing from the workflow, npm
  in the runner is older than 11.5.1, a token secret is reaching the publish
  step and shadowing OIDC (check org-level secrets, not just the repo), or the
  trusted publisher entry does not match the repository and workflow filename.
- **`EPUBLISHCONFLICT`**: the version is already on npm. Bump again with a new
  changeset; never re-tag an existing version. If the publish succeeded but the
  Release step did not, create the Release by hand instead of re-running the
  job (see [GitHub Releases](#github-releases)).
- **Tag/version mismatch**: delete the tag (`git tag -d vX.Y.Z`,
  `git push origin :vX.Y.Z`) and re-tag the commit where `package.json`
  matches.
