# Greengage Reusable Regression Tests Workflow

This workflow runs regression test suites for the Greengage project in a containerized environment. It is designed to be called from a parent CI pipeline, enabling users to execute automated regression tests with flexible version and operating system configurations.

## Actual version `v15`

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@v15`

## Purpose

The workflow executes the following regression test using a Docker image built for the given Greengage version and target operating system:

- `regression`

It generates test artifacts (e.g., regression logs, `pg_log` directories, `gpAdminLogs`, SQL dumps) and uploads them to GitHub Actions artifacts.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                      | Required | Type   | Default |
|---------------------|--------------------------------------------------|----------|--------|---------|
| `version`           | Greengage version (e.g., `6` or `7`)             | Yes      | String | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`) | Yes    | String | -       |
| `target_os_version` | Target OS version (e.g., `20`, `7`)              | No       | String | `''`    |
| `python3`           | Python3 build argument (ignored)                 | No       | String | `''`    |
| `ref`               | Branch or tag to checkout (e.g., `main`, `7.x`)  | No       | String | `''`    |

### Secrets

| Name          | Description                         | Required |
|---------------|-------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: read`, and `actions: write` permissions to pull images from GHCR, access repository contents, and upload artifacts.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: Ensure a Docker image exists in GHCR matching the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`.
- **Repository Access**: The workflow checks out the repository specified in `github.repository`.
- **Artifacts**: The workflow uploads artifacts (e.g., `regression_logs`, `pg_log`, `gpAdminLogs`, SQL dumps `sqldump`) to GitHub Actions.

### Examples

- Single

  ```yaml
  jobs:
    regression-tests:
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@v15
      with:
        version: 7
        target_os: ubuntu
        target_os_version: ''
        python3: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- Matrix

  ```yaml
  jobs:
    regression-tests:
      needs: build
      if: github.event_name == 'pull_request' || github.event_name == 'push' && github.ref == 'refs/heads/7.x'
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@v15
      with:
        version: 7
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- If `ref` is not provided, the workflow checks out the default branch.
- The Docker image is expected to be tagged with the full commit SHA (e.g., `ghcr.io/<owner>/<repo>/ggdb6_ubuntu:<full-sha>`).
- Artifacts are uploaded with the name `regression_optimizer_<optimizer>`.
- Ensure the regression test environment is configured correctly in the repository (e.g., `gpdb_src/concourse/scripts/ic_gpdb.bash`).
- The workflow collects logs from multiple sources, including `pg_log` directories under `gpdb_src/gpAux/gpdemo/datadirs/`, `results`, `regression.diffs`, `gpAdminLogs`, and SQL dumps `sqldump`.
- SQL dumps are automatically collected on `push` events when using the Postgres planner (`optimizer off`). The test container receives the `DUMP_DB` environment variable set to `true` in this scenario.

For further details, refer to the workflow file in the `.github/workflows/` directory.
