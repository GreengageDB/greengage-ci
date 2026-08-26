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
     action.
   - Checks out the `ci/` directory required to build the pg_upgrade
     image and run the migration test.

2. **Fetch SQL dump**:

   - Fetches a pre-generated Greengage 6.x SQL dump from a successful
     `Greengage SQL Dump` workflow run using the
     [`sql-dump/fetch`](../actions/sql-dump/fetch/action.yml) action.
   - The extracted dump is mounted into the pg_upgrade test container
     and passed to the migration script as `SQL_SCHEMA`.

3. **Build pg_upgrade image**:

   - Builds `ci/Dockerfile.pg_upgrade`, passing the restored target
     image as `GGDB7_IMAGE`. The Dockerfile layers a 6.x installation
     (`GGDB6_IMAGE`, defaulted in the Dockerfile) on top of it, so the
     resulting image contains both a 6.x and a 7.x Greengage
     installation.

4. **Run pg_upgrade**:

   - Mounts the fetched SQL dump into the test container and runs
     `pg_upgrade_run_6X_to_7X_migration.bash` as `gpadmin`.
   - `CLEANUP_SCRIPT` and `DUMP_OPTIONS` are configured by default for
     the regression dump and can be overridden when a different test
     configuration is required.

5. **Collect logs**:

   - Always collects runtime logs from the pg_upgrade test container
     using the [`collect-logs`](../actions/collect-logs/action.yml)
     action.
   - If the migration fails, also collects the pre- and post-upgrade
     dumps and regression diffs.

6. **Upload artifacts**:

   - Runtime logs are always uploaded as an artifact named
     `pg_upgrade_ggdb{version}_{target_os}{target_os_version}_logs`.
   - Diagnostic dumps and regression diffs are uploaded only when the
     pg_upgrade test fails as an artifact named
     `pg_upgrade_ggdb{version}_{target_os}{target_os_version}_dumps`.

7. **Failure Conditions**:

   - If the target image cannot be restored or loaded, the job exits
     with an error.
   - If the SQL dump cannot be fetched, the job exits with an error.
   - If the pg_upgrade migration script fails, the job exits with an
     error and diagnostic dumps and diffs are collected and uploaded.

## Inputs

| Name | Description | Required | Default |
| ---- | ----------- | -------- | ------- |
| `version` | Greengage version to upgrade to (target side of the pair) | no | `7` |
| `target_os` | Target OS (`ubuntu` only) | no | `ubuntu` |
| `target_os_version` | Target OS version (e.g., `24.04`) | no | `''` |
| `cleanup_script` | Cleanup script to run after loading `SQL_SCHEMA` | no | `cleanup_regression_dump_from_6X.sql` |
| `dump_options` | `pg_dump` parameters for pre- and post-upgrade dumps | no | `--data-only --extra-float-digits=-3` |

## Secrets

| Name | Description | Required |
| ---- | ----------- | -------- |
| `ghcr_token` | GitHub token for GHCR access | yes |

## Usage

### Single minimal use with defaults

```yaml
jobs:
  pg_upgrade:
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@CI-6130
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
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@CI-6130
    with:
      target_os: ${{ matrix.target_os }}
      target_os_version: ${{ matrix.target_os_version }}
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

### Custom pg_upgrade configuration

```yaml
jobs:
  pg_upgrade:
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-pg_upgrade.yml@CI-6130
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
  upgrade pair. The workflow `version` specifies the Greengage version
  being upgraded to and does not affect the source dump version.

- `cleanup_script` defaults to
  `cleanup_regression_dump_from_6X.sql` from the pg_upgrade source tree.
  Override it when a different cleanup script is required.

- `dump_options` defaults to `--data-only --extra-float-digits=-3`.
  These options are used for the pre- and post-upgrade dumps to compare
  the data while avoiding schema differences caused by version-specific
  DDL and synchronizing floating-point formatting.

- The 6.x side of the upgrade pair is **not** an input to this
  workflow — it is resolved inside `ci/Dockerfile.pg_upgrade` via the
  `GGDB6_IMAGE` build arg, which currently defaults to
  `ghcr.io/greengagedb/greengage/ggdb6_ubuntu:latest` (a development
  build). If a stable/pinned 6.x pairing is needed, override
  `GGDB6_IMAGE` explicitly when building
  `ci/Dockerfile.pg_upgrade`.

- Runtime logs are collected and uploaded on every run.

- Diagnostic dumps and regression diffs are collected and uploaded only
  when the pg_upgrade migration fails. This avoids storing large dump
  artifacts for successful runs.

- The `collect-logs` action collects files from the pg_upgrade test
  container without restarting the container, including when the
  container has already stopped.

- Requires the target image to already exist (built by a prior
  `build-package`/`build` job in the same run) — this workflow does not
  build the base Greengage image itself.
