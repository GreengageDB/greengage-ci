# Regression Tests Composite Action

This composite action runs regression test suites for the Greengage project in a containerized environment. It executes tests with a specified optimizer configuration and collects comprehensive test artifacts.

## Actual version

- `greengagedb/greengage-ci/.github/actions/tests/regression@v16

## Purpose

The action executes regression tests using a Docker container with the specified Greengage image. It supports both ORCA and Postgres query optimizers and automatically collects test artifacts including:

- Regression test results
- SQL dumps (when enabled)
- `pg_log` directories
- `gpAdminLogs`
- `regression.diffs` files (if exists)

## Usage

To integrate this action into your workflow:

1. Add a step in your job that calls this composite action.
2. Provide the required inputs as described below.
3. Ensure Docker is available in the runner environment.

### Inputs

| Name        | Description                                           | Required | Type   | Default     |
|-------------|-------------------------------------------------------|----------|--------|-------------|
| `image`     | Greengage Docker image for tests                      | Yes      | String | -           |
| `target_os` | Target operating system (e.g., `ubuntu`, `centos`)    | Yes      | String | -           |
| `optimizer` | Optimizer for tests (`postgres` or `orca`)            | Yes      | String | -           |
| `log_dir`   | Output logs directory for mount in container          | No       | String | `/mnt/logs` |
| `dump_db`   | Dump database after tests (set to `true` to enable)   | No       | String | `''`        |

### Requirements

- **Docker**: The action requires Docker to be available on the runner.
- **Image Access**: Ensure the specified Docker image is accessible (e.g., from GHCR with appropriate permissions or locally).
- **Log Directory**: The `log_dir` path must be writable by the runner. Default `/mnt/logs`.
- **Kernel Parameters**: The action sets `kernel.sem=500 1024000 200 4096` via `--sysctl`.

### Examples

- Basic usage with Postgres optimizer

  ```yaml
  - name: Run regression tests
    uses: greengagedb/greengage-ci/.github/actions/tests/regression@v16
    with:
      image: ghcr.io/greengagedb/greengage/ggdb6_centos:abc123
      optimizer: postgres
      target_os: centos
  ```

- With database dump (typically used with Postgres optimizer)

  ```yaml
  - name: Run regression tests with DB dump
    uses: greengagedb/greengage-ci/.github/actions/tests/regression@v16
    with:
      image: ghcr.io/greengagedb/greengage/ggdb7_ubuntu:def456
      optimizer: postgres
      target_os: ubuntu
      dump_db: 'true'
  ```

- Custom log directory

  ```yaml
  - name: Run regression tests
    uses: greengagedb/greengage-ci/.github/actions/tests/regression@v16
    with:
      image: ghcr.io/greengagedb/greengage/ggdb6_ubuntu22:ghi789
      optimizer: postgres
      target_os: ubuntu
      log_dir: /tmp/test-logs
  ```

### Outputs

The action generates tar archives in the specified `log_dir` with the following naming pattern:

- `{target_os}_{optimizer}_sqldump.tar` - SQL database dumps (when `dump_db` is enabled)
- `{target_os}_{optimizer}_gpAdminLogs.tar` - GP admin logs
- `{target_os}_{optimizer}_results.tar` - Test results
- `{target_os}_{optimizer}_regression.diffs.tar` - Regression diff files (if exists)
- `{target_os}_{optimizer}_log.tar` - Log directories
- `{target_os}_{optimizer}_pg_log.tar` - PostgreSQL log directories

All artifacts are created with world-readable permissions (`a+rwX`) for easy access in subsequent workflow steps.

### Notes

- The action runs tests using the `installcheck-world` make target with the optimizer specified via `PGOPTIONS`.
- The optimizer input accepts `orca` (sets `optimizer=on`) or `postgres` (sets `optimizer=off`).
- Database dumps are typically collected with the Postgres optimizer (`optimizer=off`), though the action allows dumps with any optimizer configuration at the developer's discretion.
- SSH is configured within the container to support distributed test scenarios.
- The action returns the exit code from the test script, allowing the workflow to fail appropriately on test failures.
- Artifacts are collected even if tests fail, ensuring logs are available for debugging.
- The test environment is configured via `gpdb_src/concourse/scripts/ic_gpdb.bash`.

For further details, refer to the action definition in `.github/actions/tests/regression/action.yml`.
