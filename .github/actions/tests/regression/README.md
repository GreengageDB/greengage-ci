# Regression Tests Composite Action

This composite action runs regression test suites for the Greengage project in a containerized environment.
It executes tests with a specified optimizer configuration.

## Actual version

- `greengagedb/greengage-ci/.github/actions/tests/regression@CI-6187-no-docker-cp`

## Purpose

The action executes regression tests using a Docker container with the specified Greengage image. It supports both ORCA and Postgres query optimizers, and optionally collects a SQL dump of the database after the test run.

Test artifacts (regression results, `regression.diffs`, `gpAdminLogs`, `pg_log`, coverage data, etc.) are left inside the container filesystem and are not collected by this action — use the [`collect-logs`](../../collect-logs/README.md) action as a separate step after this one to gather them.

## Usage

To integrate this action into your workflow:

1. Add a step in your job that calls this composite action.
2. Provide the required inputs as described below.
3. Ensure Docker is available in the runner environment.

### Inputs

Name | Description | Required | Type | Default
--- | --- | --- | --- | ---
`image` | Greengage Docker image for tests | Yes | String | -
`target_os` | Target operating system (e.g., `ubuntu`) | Yes | String | -
`target_os_version` | Target OS version (e.g., `22`, `7`) | No | String | `''`
`optimizer` | Optimizer for tests (`postgres` or `orca`) | Yes | String | -
`dump_db` | Dump database after tests (set to `true` to enable) | No | String | `''`

### Requirements

- **Docker**: The action requires Docker to be available on the runner.
- **Image Access**: Ensure the specified Docker image is accessible (e.g., from GHCR with appropriate permissions or locally).
- **Kernel Parameters**: The action sets `kernel.sem=500 1024000 200 4096` via `--sysctl`.

### Examples

- Basic usage with Postgres optimizer

  ```yaml
  - name: Run regression tests
    uses: greengagedb/greengage-ci/.github/actions/tests/regression@CI-6187-no-docker-cp
    with:
      image: ghcr.io/greengagedb/greengage/ggdb6_ubuntu22.04:1c1bfa51989c52423e6b332128ad41aca938e5f3
      optimizer: postgres
      target_os: ubuntu
      target_os_version: '22.04'
  ```

- With database dump (typically used with Postgres optimizer)

  ```yaml
  - name: Run regression tests with DB dump
    uses: greengagedb/greengage-ci/.github/actions/tests/regression@CI-6187-no-docker-cp
    with:
      image: ghcr.io/greengagedb/greengage/ggdb6_ubuntu22.04:1c1bfa51989c52423e6b332128ad41aca938e5f3
      optimizer: postgres
      target_os: ubuntu
      target_os_version: '22.04'
      dump_db: 'true'
  ```

- Real usage from `greengage-reusable-tests-regression.yml`, with log collection as a separate step

  ```yaml
  - name: Regression tests with optimizer '${{ matrix.optimizer }}'
    uses: greengagedb/greengage-ci/.github/actions/tests/regression@CI-6187-no-docker-cp
    with:
      image: ghcr.io/${{ github.repository }}/ggdb${{ inputs.version }}_${{ inputs.target_os }}${{ inputs.target_os_version }}:${{ github.sha }}
      optimizer: ${{ matrix.optimizer }}
      target_os: ${{ inputs.target_os }}
      target_os_version: ${{ inputs.target_os_version }}

  - name: Collect regression logs
    if: always()
    uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187-no-docker-cp
    with:
      name: regression_logs_ggdb${{ inputs.version }}_${{ inputs.target_os }}${{ inputs.target_os_version }}_${{ matrix.optimizer }}
      params: |
          /tmp/coverage-data d coverage-data
          gpAdminLogs d gpAdminLogs
          gpdb_src/src/test d results
          gpdb_src/src/test f regression.diffs
          gpdb_src/gpAux/gpdemo/datadirs d log
          gpdb_src/gpAux/gpdemo/datadirs d pg_log
  ```

### Outputs

- When `dump_db` is enabled, a `{target_os}{target_os_version}_postgres_sqldump.tar` archive is created in the workspace root, containing the SQL dump (`dump.sql`).
- All other test artifacts (results, logs, coverage data) remain inside the container filesystem; collect them with the [`collect-logs`](../../collect-logs/README.md) action.

### Notes

- The action runs tests using the `installcheck-world` make target with the optimizer specified via `PGOPTIONS`.
- The optimizer input accepts `orca` (sets `optimizer=on`) or `postgres` (sets `optimizer=off`).
- Database dumps are typically collected with the Postgres optimizer (`optimizer=off`), though the action allows dumps with any optimizer configuration at the developer's discretion.
- The action returns the exit code from the test script, allowing the workflow to fail appropriately on test failures.
- The test environment is configured via `gpdb_src/concourse/scripts/ic_gpdb.bash`.

For further details, refer to the action definition in `.github/actions/tests/regression/action.yml`.
