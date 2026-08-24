# Greengage Reusable pg_upgrade Test Workflow

This workflow builds a combined 6.x/7.x test image and runs
`pg_upgrade` against a pre-generated Greengage 6.x SQL dump to verify
the upgrade path from Greengage 6.x to the target Greengage 7.x build.
It is designed to be called from a parent CI pipeline.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@CI-6130`

## Purpose

- **`pg_upgrade`**: Restores the previously built target-version
  image, builds a dedicated pg_upgrade test image containing both
  Greengage 6.x and the target 7.x installation, loads a pre-generated
  Greengage 6.x SQL dump, and runs the 6X→7X migration test.

### Algorithm

1. **Restore & Load target image**:

   - Restores and loads the target version's Docker image from cache
     or GHCR using the
     [`restore-load-image`](../actions/restore-load-image/action.yml)
     action, with `extract_ci: ci` so the `ci/` scripts directory is
     pulled out of the image itself (no separate git checkout needed).

2. **Fetch SQL dump**:

   - Fetches a pre-generated Greengage 6.x SQL dump from a successful
     `Greengage SQL Dump` workflow run using the
     [`sql-dump/fetch`](../actions/sql-dump/fetch/action.yml) action.
   - The extracted dump is passed to the pg_upgrade test container as
     `SQL_SCHEMA`.

3. **Build pg_upgrade image**:

   - Builds `ci/Dockerfile.pg_upgrade`, passing the restored target
     image as `GGDB7_IMAGE`. The Dockerfile layers a 6.x installation
     (`GGDB6_IMAGE`, defaulted in the Dockerfile) on top of it, so the
     resulting image contains both a 6.x and a 7.x Greengage
     installation.

4. **Run pg_upgrade**:

   - Mounts the fetched SQL dump into the test container and runs
     `pg_upgrade_run_6X_to_7X_migration.bash` as `gpadmin`.
   - `CLEANUP_SCRIPT` and `DUMP_OPTIONS` can optionally be provided for
     additional pg_upgrade test configuration.

5. **Collect logs on failure**:

   - When the migration fails, uses the
     [`collect-logs`](../actions/collect-logs/action.yml) action to
     collect pre- and post-upgrade dumps and regression diffs from the
     test container.
   - Large dump files and diffs are collected only when the upgrade
     fails.

6. **Upload logs**:

   - Uploads the collected files as an artifact named
     `pg_upgrade_ggdb{version}_{target_os}{target_os_version}_diffs`.
   - The artifact is uploaded only when the pg_upgrade test fails.

7. **Failure Conditions**:

   - If the target image cannot be restored or loaded, the job exits
     with an error.
   - If the SQL dump cannot be fetched, the job exits with an error.
   - If the pg_upgrade migration script fails, the job exits with an
     error and the collected diagnostic files are uploaded.

## Inputs

| Name                | Description                                                   | Required | Default  |
|---------------------|---------------------------------------------------------------|----------|----------|
| `version`           | Greengage version to upgrade to (target side of the pair)     | no       | `7`      |
| `target_os`         | Target OS (`ubuntu` only)                                     | no       | `ubuntu` |
| `target_os_version` | Target OS version (e.g., `24.04`)                             | no       | `''`     |
| `cleanup_script`    | Optional cleanup script to run after loading `SQL_SCHEMA`     | no       | `''`     |
| `dump_options`      | Optional `pg_dump` parameters for pre- and post-upgrade dumps | no       | `''`     |

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
````

### Matrix for different target OS versions

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
      target_os: ${{ matrix.target_os }}
      target_os_version: ${{ matrix.target_os_version }}
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

### Optional pg_upgrade configuration

```yaml
jobs:
  pg_upgrade:
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@v53
    with:
      cleanup_script: /path/to/cleanup.sql
      dump_options: '--data-only --extra-float-digits=-3'
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

- `target_os` is validated at job start and must be `ubuntu` — any
  other value fails the job immediately with a clear error. It is kept
  as an input, rather than hardcoded, for consistency with the
  matrix-style calling convention used by other reusable workflows in
  this repository.

- `target_os_version` is passed to the SQL dump fetch action and is
  used to select the corresponding dump artifact. Leave it empty for
  Ubuntu 22.04, which uses the default `ubuntu` artifact naming
  convention.

- The SQL dump is always fetched from the Greengage 6.x side of the
  upgrade pair. The workflow target `version` specifies the Greengage
  version being upgraded to and does not affect the source dump
  version.

- `cleanup_script` and `dump_options` are optional and empty by
  default. They are provided for test configurations that require
  cleanup of objects from the source dump or specific `pg_dump`
  parameters.

- The 6.x side of the upgrade pair is **not** an input to this
  workflow — it is resolved inside `ci/Dockerfile.pg_upgrade` via the
  `GGDB6_IMAGE` build arg, which currently defaults to
  `ghcr.io/greengagedb/greengage/ggdb6_ubuntu:latest` (a development
  build). If a stable/pinned 6.x pairing is needed, override
  `GGDB6_IMAGE` explicitly when building
  `ci/Dockerfile.pg_upgrade`.

- Diagnostic dumps and regression diffs are collected only when the
  migration fails. This avoids uploading large dump artifacts for
  successful runs.

- Requires the target image to already exist (built by a prior
  `build-package`/`build` job in the same run) — this workflow does
  not build the base Greengage image itself.

- The workflow uses the `collect-logs` action to collect diagnostic
  files from the pg_upgrade test container. The log collection action
  handles both running and stopped containers without restarting the
  test container.
