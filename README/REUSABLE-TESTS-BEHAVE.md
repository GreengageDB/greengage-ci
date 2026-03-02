# Greengage Reusable Behave Tests Workflow

This workflow runs Behave test suites for the Greengage project in a containerized environment. It is designed to be called from a parent CI pipeline, enabling users to execute automated behavioral tests with flexible version and operating system configurations.

## Actual version

<<<<<<< HEAD
<<<<<<< HEAD
- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@v24`
=======
- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@v19`
>>>>>>> 62104dc (fix readme)
=======
- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@v23`
>>>>>>> f7502c7 (fix readme)

## Purpose

The workflow executes Behave tests using a Docker image built for the given Greengage version and target operating system. Test features are dynamically discovered from the `gpMgmt/test/behave/mgmt_utils` directory — each `.feature` file found is executed as a separate job in a matrix strategy.

> **Note**: Test filtering is handled via `@skip` tags within individual test files. The workflow itself does not apply any filters or exclusions to the discovered features.

For the `gpexpand` feature, the workflow automatically fetches a SQL dump artifact from a previous "Greengage SQL Dump" workflow run before executing tests.

The workflow generates test artifacts (e.g., Allure reports, logs) and uploads them to GitHub Actions artifacts, with a final aggregated Allure report generated in the `collect-results` job.

### Execution and failure model

Behave tests are executed as a matrix of independent jobs, one per feature. Failures in individual Behave jobs do not prevent the workflow from completing artifact collection.

The final `collect-results` job:

- always runs, even if one or more Behave jobs fail,
- downloads all available artifacts,
- generates a consolidated Allure report from partial results when applicable.

The overall workflow status is determined by the Behave jobs.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

<<<<<<< HEAD
| Name                | Description                                      | Required | Type   | Default |
|---------------------|--------------------------------------------------|----------|--------|---------|
| `version`           | Greengage version (e.g., `6` or `7`)             | Yes      | String | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`, `rockylinux`) | Yes    | String | -       |
| `target_os_version` | Target OS version (e.g., `22`, `7`, `8`)         | No       | String | `''`    |
| `python3`           | Python3 build argument (ignored)                 | No       | String | `''`    |
=======
Name                | Description                                                      | Required | Type   | Default
------------------- | ---------------------------------------------------------------- | -------- | ------ | -------
`version`           | Greengage version (e.g., `6` or `7`)                             | Yes      | String | -
`target_os`         | Target operating system (e.g., `ubuntu`, `centos`, `rockylinux`) | Yes      | String | -
`target_os_version` | Target OS version (e.g., `20.04`, `22.04`, `7`, `8`)             | Yes      | String | -
`python3`           | Python3 build argument (ignored)                                 | No       | String | `''`
`ref`               | Branch or tag to checkout (e.g., `main`, `7.x`)                  | No       | String | `''`
>>>>>>> 62104dc (fix readme)

### Secrets

Name         | Description                  | Required
------------ | ---------------------------- | --------
`ghcr_token` | GitHub token for GHCR access | Yes

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: read`, and `actions: write` permissions to pull images from GHCR, access repository contents, and upload artifacts.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: Ensure a Docker image exists in GHCR matching the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`.
- **Repository Access**: The workflow checks out the repository specified in `github.repository`.
- **Artifacts**: The workflow uploads artifacts (e.g., `allure-results`, `logs`, `logs_cdw`, `logs_sdw1`) and a final aggregated Allure report.
- **SQL Dump**: For the `gpexpand` feature, a SQL dump artifact must be available from a previous "Greengage SQL Dump" workflow run.

### Examples

- **Single Configuration**

  ```yaml
  jobs:
    behave-tests:
      permissions:
        contents: read
        packages: read
        actions: write
<<<<<<< HEAD
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@v24
=======
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@v23
>>>>>>> f7502c7 (fix readme)
      with:
        version: 7
        target_os: ubuntu
        target_os_version: '22.04'
        python3: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **Matrix Configuration**

  ```yaml
  jobs:
    behave-tests:
      strategy:
        fail-fast: true
        matrix:
          include:
            - target_os: ubuntu
              target_os_version: '22.04'
            - target_os: ubuntu
              target_os_version: '24.04'
      permissions:
        contents: read
        packages: read
        actions: write
<<<<<<< HEAD
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@v24
=======
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@v23
>>>>>>> f7502c7 (fix readme)
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
        target_os_version: ${{ matrix.target_os_version }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- The Docker image is expected to be tagged with the full commit SHA (e.g., `ghcr.io/<owner>/<repo>/ggdb6_ubuntu:<full-sha>`).
- Test features are dynamically discovered from `gpMgmt/test/behave/mgmt_utils` — each `.feature` file is executed as a separate matrix job.
- Test filtering is handled via `@skip` tags within individual test files, not by the workflow.
- For the `gpexpand` feature, ensure a SQL dump artifact is available from a previous "Greengage SQL Dump" workflow run.
- Artifacts are uploaded with names like `behave_<feature>_ggdb<version>_<target_os><target_os_version>_results`, and a final aggregated report is named `behave_all_ggdb<version>_<target_os><target_os_version>`.
- Ensure the Behave test environment is configured correctly in the repository (e.g., `ci/docker-compose.yaml`, `ci/.env`).

For further details, refer to the workflow file in the `.github/workflows/` directory.
