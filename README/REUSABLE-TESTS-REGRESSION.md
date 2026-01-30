# Greengage Reusable Regression Tests Workflow

This workflow runs regression test suites for the Greengage project in a containerized environment. It is designed to be called from a parent CI pipeline, enabling users to execute automated regression tests with flexible version and operating system configurations across multiple query optimizers.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@v16`

## Purpose

The workflow executes regression tests using Docker images built for the given Greengage version and target operating system. It runs tests in parallel with two optimizer configurations:

- ORCA optimizer (`optimizer=on`)
- Postgres optimizer (`optimizer=off`)

The workflow leverages composite actions to restore Docker images, run tests, and collect comprehensive test artifacts (e.g., regression logs, `pg_log` directories, `gpAdminLogs`) and uploads them to GitHub Actions artifacts.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                           | Required | Type   | Default |
|---------------------|-------------------------------------------------------|----------|--------|---------|
| `version`           | Greengage version (e.g., `6` or `7`)                  | Yes      | String | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`)    | Yes      | String | -       |
| `target_os_version` | Target OS version (e.g., `22`, `7`, `8`)              | No       | String | `''`    |
| `python3`           | Python3 build argument (ignored, kept for compatibility) | No    | String | `''`    |

### Secrets

| Name         | Description                  | Required |
|--------------|------------------------------|----------|
| `ghcr_token` | GitHub token for GHCR access | Yes      |

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: read`, and `actions: write` permissions to pull images from GHCR, access repository contents, and upload artifacts.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: A Docker image with the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>` must be built and cached in a prior build job. The workflow uses the `restore-load-image` composite action to restore the image from GitHub Actions cache and load it into the runner's local Docker registry.
- **Repository Access**: The workflow checks out the repository at the PR head SHA or current ref with recursive submodules.
- **Artifacts**: The workflow uploads artifacts for each optimizer configuration (ORCA and Postgres) to GitHub Actions with a 7-day retention period.
- **Storage**: The workflow relocates Docker storage to `/mnt/docker` to utilize available disk space on GitHub runners.

### Examples

- Single OS configuration

  ```yaml
  jobs:
    regression-tests:
      needs: build
      if: github.event_name == 'pull_request'
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@v16
      with:
        version: 6
        target_os: ubuntu
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- Matrix strategy for multiple operating systems

  ```yaml
  jobs:
    regression-tests:
      needs: build
      if: github.event_name == 'pull_request'
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@v16
      with:
        version: 7
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Artifacts

The workflow uploads artifacts with the following naming pattern:

- `regression_ggdb<version>_<target_os><target_os_version>_optimizer_<optimizer>`

Where `<optimizer>` is either `orca` or `postgres`.

Each artifact contains tar archives with test logs, results, and diagnostics:

- GP admin logs
- Test results
- Regression diffs (if exists)
- PostgreSQL logs

Artifacts are retained for 7 days and include a warning if no files are found.

### Notes

- The workflow uses a matrix strategy with `fail-fast: false` to ensure all optimizer combinations run even if one fails.
- The timeout for the entire job is set to 180 minutes (3 hours).
- Docker storage is relocated to `/mnt/docker` to maximize available disk space.
- The workflow expects images to be available in GitHub Actions cache from a prior build job and uses the full commit SHA (`github.sha`) for cache key matching.
- The `restore-load-image` composite action restores the Docker image from GitHub Actions cache and loads it into the runner's local Docker registry for use in tests.
- Submodules are checked out recursively to ensure all dependencies are available.
- The `tests/regression` composite action handles test execution and log collection.
- The workflow sets `COMPOSE_HTTP_TIMEOUT=400` and configures `DOCKER_COMPOSE` for extended timeout scenarios.

For further details, refer to the workflow file in `.github/workflows/greengage-reusable-tests-regression.yml` and the composite actions in `.github/actions/`.
