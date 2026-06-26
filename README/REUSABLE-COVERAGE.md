# Greengage Reusable Coverage Report Workflow

This workflow aggregates Python coverage data from Behave and regression test runs, generates a combined HTML and text report, enforces a configurable quality gate, and uploads the result as a GitHub Actions artifact. It is designed to be called from a parent CI pipeline after all test jobs have completed.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-coverage.yml@v46`

## Purpose

The workflow downloads coverage artifacts produced by Behave and regression test jobs, combines them using `coverage combine` inside the same Docker image used for testing, and generates both a text report and an HTML report with per-test context. If the aggregated coverage falls below the configured threshold, the workflow fails and reports the shortfall as an error annotation.

A step summary with a collapsible per-module breakdown is written to the GitHub Actions Job Summary on every run, including failed ones, so coverage results are always visible in the PR timeline.

### Execution and failure model

- If no `coverage-data` files are found among the downloaded artifacts, the combine step exits with a warning and the remaining steps are skipped gracefully.
- The quality gate step fails the workflow when total coverage is strictly below `coverage_threshold`.
- The summary step and artifact upload always run (`if: always()`), so results are preserved even when the quality gate fails.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Ensure all test jobs (Behave, regression) that produce coverage artifacts have completed before this job runs.
3. Provide the required inputs and secrets as described below.

### Inputs

| Name                  | Description                                          | Required | Type    | Default |
|-----------------------|------------------------------------------------------|----------|---------|---------|
| `version`             | Greengage version (e.g., `6` or `7`)                 | Yes      | String  | -       |
| `target_os`           | Target operating system (e.g., `ubuntu`)             | Yes      | String  | -       |
| `target_os_version`   | Target OS version (e.g., ``, `24.04`)                | No       | String  | `''`    |
| `coverage_threshold`  | Minimum coverage percentage required (e.g., `75`)    | Yes      | Number  | -       |

### Secrets

| Name          | Description                  | Required |
|---------------|------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access | Yes      |

## Requirements

- **Permissions**: The job requires `contents: read`, `packages: read`, and `actions: write` permissions to pull images from GHCR and upload artifacts.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: A Docker image must exist in the GitHub Actions cache (or GHCR) matching the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`. This image is typically produced by the build workflow.
- **Test Artifacts**: Coverage artifacts named `behave_*_ggdb<version>_<target_os><target_os_version>_results` and `regression_ggdb<version>_<target_os><target_os_version>*` must be uploaded by prior test jobs. Each artifact is expected to contain a `coverage-data` file.
- **Coverage Configuration**: The rcfile `gpMgmt/test/coveragerc_combine_report` must exist inside the Docker image at `/home/gpadmin/gpdb_src/`.

## Examples

- **Single Configuration**

  ```yaml
  jobs:
    coverage:
      needs: [behave-tests, regression-tests]
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-coverage.yml@v46
      with:
        version: 7
        target_os: ubuntu
        coverage_threshold: 75
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **Matrix Configuration**

  ```yaml
  jobs:
    coverage:
      needs: [behave-tests, regression-tests]
      strategy:
        fail-fast: false
        matrix:
          include:
            - target_os: ubuntu
            - target_os: ubuntu
              target_os_version: '24.04'
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-coverage.yml@v46
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
        target_os_version: ${{ matrix.target_os_version }}
        coverage_threshold: 75
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

## Notes

- The Docker image name is lowercased before use (`${IMAGE,,}`) to satisfy Docker registry naming requirements.
- `coverage combine` is run with `--append`, so partial data files from different test suites are safely merged even if their source paths overlap.
- The HTML report is generated with `--show-contexts`, allowing you to see which test triggered each covered line.
- The combined `coverage-data` file and the full HTML report are uploaded as the artifact `coverage_all_ggdb<version>_<target_os><target_os_version>` with a 14-day retention period.
- The quality gate uses `awk` for floating-point comparison, so fractional percentages (e.g., `74.9`) are handled correctly.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
