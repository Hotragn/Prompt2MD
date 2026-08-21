# Digest archive

This branch is the published archive of the Daily Digest. It is **orphaned on
purpose** — it shares no history with `main`, carries no source code, and is
never merged anywhere.

    digests/YYYY-MM-DD.md

## Why it is not on `main`

`main` is governed by the "main: changes ship through green CI" ruleset: every
change arrives through a pull request with seven required status checks and a
code-scanning gate. A daily bot commit cannot satisfy that. It has no reviewer,
and a push made with the workflow's `GITHUB_TOKEN` is attributed to the GitHub
Actions app, which cannot be granted a ruleset bypass on a personal repository.

The workflow used to push straight to `main` anyway. Once the ruleset went
active that push started being rejected outright:

    remote: error: GH013: Repository rule violations found for refs/heads/main.
    remote: - Changes must be made through a pull request.

The alternatives were all worse. Granting a bypass to a personal access token
would put a credential that can push past every rule into a job that runs
`pnpm install` and then executes project code — one hostile transitive
dependency away from writing to `main` unchecked. Relaxing the ruleset to let
the bot through would weaken the guarantee for everyone to accommodate one
writer.

So the archive moved off `main` instead. The digest is append-only published
data, not source, and nothing on `main` reads it at build time. Keeping it here
means `main`'s guarantee stays literally true with no exceptions, and this
branch needs no bypass, no extra credential and no CI run.

Written by `.github/workflows/digest.yml` on `main`.
