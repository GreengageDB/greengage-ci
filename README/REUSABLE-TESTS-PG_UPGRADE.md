# Greengage Reusable pg_upgrade Test Workflow

This workflow builds a combined 6.x/7.x test image and runs
`pg_upgrade` against it to verify the upgrade path from Greengage 6.x
to the target Greengage 7.x build still works.
It is designed to be called from a parent CI pipeline.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@v53`

## Purpose

- **`pg_upgrade`**: Restores the previously built target-version
  image, builds a dedicated pg_upgrade test image on top of it
  (combining a 6.x installation with the target 7.x installation via
  `ci/Dockerfile.pg_upgrade`), runs the 6X→7X migration script inside
  it, and uploads the resulting diffs as an artifact.

### Algorithm

1. **Restore & Load target image**:

   - Restores and loads the target version's Docker image from cache
     or GHCR using the
     [`restore-load-image`](../actions/restore-load-image/action.yml)
     action, with `extract_ci: ci` so the `ci/` scripts directory is
     pulled out of the image itself (no separate git checkout needed).

2. **Build pg_upgrade image**:

   - Builds `ci/Dockerfile.pg_upgrade`, passing the restored image as
     `GGDB7_IMAGE`. The Dockerfile layers a 6.x installation
     (`GGDB6_IMAGE`, defaulted in the Dockerfile) on top of it, so the
     resulting image contains both a 6.x and a 7.x Greengage
     installation.

3. **Run pg_upgrade**:

   - Runs the built image, sets up the `gpadmin` user, and executes
     `pg_upgrade_run_6X_to_7X_migration.bash` as `gpadmin`.
   - Regression diff files produced by the migration test
     (`regression.diffs`, `partitions_regression.diffs`) are copied
     out to a mounted `logs/` volume regardless of the test outcome.

4. **Upload logs**:

   - Uploads the `logs/` directory as an artifact named
     `pg_upgrade_ggdb{version}_{target_os}{target_os_version}_diffs`,
     always (`if: always()`), so diffs are available even on failure.

5. **Failure Conditions**:

   - If the target image cannot be restored or loaded, the job exits
     with an error.
   - If the pg_upgrade migration script fails, the job exits with an
     error (diffs are still uploaded for inspection).

## Inputs

| Name                | Description                                                | Required | Default   |
|---------------------|------------------------------------------------------------|----------|-----------|
| `version`            | Greengage version to upgrade to (target side of the pair) | no       | `7`       |
| `target_os`          | Target OS (`ubuntu` only)                                 | no       | `ubuntu`  |
| `target_os_version`  | Target OS version (e.g., `24.04`)                         | no       | `''`      |

## Secrets

| Name         | Description                   | Required |
|--------------|-------------------------------|----------|
| `ghcr_token` | GitHub token for GHCR access  | yes      |

## Usage

### Single minimal use with defaults

```yaml
jobs:
  pg_upgrade:
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@v53
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

### Matrix for different versions

```yaml
jobs:
  pg_upgrade:
    strategy:
      fail-fast: false
      matrix:
        include:
          - target_os: ubuntu
          - target_os: ubuntu
            target_os_version: 24.04
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@v53
    with:
      target_os:         ${{ matrix.target_os }}
      target_os_version: ${{ matrix.target_os_version }}
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

- `target_os` is validated at job start and must be `ubuntu` — any
  other value fails the job immediately with a clear error. It's
  kept as an input, rather than hardcoded, for consistency with the
  matrix-style calling convention used by other reusable workflows in
  this repo.
- `target_os_version` is accepted for forward compatibility (e.g.
  Ubuntu 24.04 support is planned) but only the default has been
  validated so far. As with other workflows in this repo, leave it
  empty for Ubuntu 22.04 — see [Important Notes on
  `target_os_version`](../README.md#important-notes-on-target_os_version)
  in the root README for why.
- The 6.x side of the upgrade pair is **not** an input to this
  workflow — it's resolved inside `ci/Dockerfile.pg_upgrade` via the
  `GGDB6_IMAGE` build arg, which currently defaults to
  `ghcr.io/greengagedb/greengage/ggdb6_ubuntu:latest` (a development
  build). If a stable/pinned 6.x pairing is needed, override
  `GGDB6_IMAGE` explicitly when building `ci/Dockerfile.pg_upgrade`.
- Diffs are uploaded on every run (`if: always()`), not only on
  failure — the artifact is empty (or absent, `if-no-files-found:
  warn`) when the migration succeeds cleanly.
- Requires the target image to already exist (built by a prior
  `build-package`/`build` job in the same run) — this workflow does
  not build the base Greengage image itself.
