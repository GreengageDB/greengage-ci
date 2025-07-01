# Greengage CI Workflows

**IMPORTANT NOTE**: The inputs `target_os_version`, `python3`, and `ref` are optional and retained for backward compatibility. The `target_os_version` and `python3` inputs are for CentOS7 and Python2 support, while `ref` is for manual testing workflows. These inputs have no practical use in regular operations, are treated as empty (`''`), and will be removed in future versions.

This repository (`greengagedb/greengage-ci`) contains reusable GitHub Actions workflows for building, testing, and publishing **Greengage Database (GGDB)** Docker images. These workflows are designed to be called from a parent CI pipeline in the `GreengageDB/greengage` repository, enabling automated builds and tests with flexible version and operating system configurations.

## Purpose

The repository provides the following reusable workflows, each performing specific tasks for the Greengage project:

- `build`: Builds and pushes GGDB Docker images to the GitHub Container Registry (GHCR) for specified versions and operating systems, tags it with the commit SHA, and pushes it to GHCR.
- `tests-behave`: Executes Behave test suites for various Greengage features, generating test artifacts and Allure reports.
- `tests-orca`: Runs ORCA linter and unit tests, producing test artifacts.
- `regression-tests`: Performs regression tests with optimizer settings, generating log artifacts.
- `resgroup-tests`: Conducts resource groups tests, producing log artifacts.
- `docker-retag-upload`: Retags and uploads GGDB Docker images to GHCR based on branch or tag events.

### Algorithm Overview

1. **`build`**:
   - Builds a GGDB Docker image using `ci/Dockerfile.<target_os>` (e.g., `ci/Dockerfile.ubuntu`) without pulling a base image or using caching.
   - Tags the image with the full commit SHA (e.g., `ghcr.io/<repo>/ggdb6_ubuntu:abcdef1234567890`).
   - Pushes the image to GHCR.
   - Uses inputs: `version`, `target_os`.

2. **`tests-behave`**:
   - Runs Behave tests for features like `analyzedb`, `gpactivatestandby`, etc., in a Docker container.
   - Generates artifacts (`allure-results`, `logs_cdw`, `logs_sdw1`) and an aggregated Allure report.
   - Uses a matrix strategy to test multiple features.
   - Uses inputs: `version`, `target_os`.

3. **`tests-orca`**:
   - Executes ORCA linter and unit tests in a Docker container.
   - Builds a linter image using `ci/Dockerfile.linter` and runs unit tests with `unit_tests_gporca.bash`.
   - Uploads artifacts (`gpAux/ext`).
   - Uses inputs: `version`, `target_os`.

4. **`regression-tests`**:
   - Runs regression tests in a Docker container with optimizer settings (`on`, `off`) using the command `installcheck-world` and the environment variable `PGOPTIONS='-c optimizer=<on|off>'`.
     - `optimizer=on` : Enables ORCA optimization, using ORCA query optimizer for query execution.
     - `optimizer=off`: Uses PostgreSQL's native query optimizer for query execution.
   - Generates log artifacts (`regression_logs`) stored in a volume and copied to the host.
   - Uses a matrix strategy to test both optimizer settings.
   - Uses inputs: `version`, `target_os`.

5. **`resgroup-tests`**:
   - Executes resource groups tests in a Docker container using a Lima VM for Docker setup.
   - Generates log artifacts (`logs_cdw`, `logs_sdw1`).
   - Uses inputs: `version`, `target_os`.

6. **`docker-retag-upload`**:
   - Pulls an existing GGDB image from GHCR (e.g., `ghcr.io/<repo>/ggdb6_ubuntu:abcdef1234567890`).
   - Retags it based on the event:
     - For `pull_request`: Uses sanitized branch name (e.g., `feature_test`).
     - For tagged push: Uses git tag (e.g., `6.28.0`).
     - Exits with an error for other events.
   - Pushes the retagged image to GHCR.
   - Uses inputs: `version`, `target_os`.

## Usage

To integrate these workflows into your pipeline:

1. Add jobs in your parent workflow (e.g., in `GreengageDB/greengage`) that call the reusable workflows from `greengagedb/greengage-ci`.
2. Provide the required inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                      | Required | Type   |
|---------------------|--------------------------------------------------|----------|--------|
| `version`           | Greengage version (e.g., `6` or `7`)             | Yes      | String |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`) | Yes    | String |

### Secrets

| Name          | Description                         | Required |
|---------------|-------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

### Requirements

- **Permissions**:
  - `packages: read`  (for pulling images from GHCR in test workflows).
  - `packages: write` (for pushing images to GHCR in `build` and `docker-retag-upload`).
  - `actions: write`  (for uploading artifacts in test workflows).
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: For test and retag workflows, ensure a Docker image exists in GHCR matching the format `ghcr.io/<repo>/ggdb<version>_<target_os>:<full-sha>`.
- **Repository Access**: Workflows check out the repository specified in `github.repository`.
- **Required Files Structure**:

  ```text

  ci/
    ├── Dockerfile.centos
    ├── Dockerfile.ubuntu
    ├── Dockerfile.linter
    ├── docker-compose.yaml
    ├── .env
    ├── scripts/
    │   ├── behave_gpdb.bash
    │   ├── init_containers.sh
    │   ├── run_behave_tests.bash
    │   ├── run_resgroup_test.bash
  concourse/
    ├── scripts/
    │   ├── common.bash
    │   ├── ic_gpdb.bash
    │   ├── setup_gpadmin_user.bash
    │   ├── unit_tests_gporca.bash

  ```

- **Artifacts**: Test workflows (`tests-behave`, `tests-orca`, `regression-tests`, `resgroup-tests`) upload artifacts (e.g., `allure-results`, `logs_cdw`, `regression_logs`).

### Examples

- **Single Job Example** (for `build` workflow):

  ```yaml
  jobs:
    build:
      permissions:
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@main
      with:
        version: 6
        target_os: ubuntu
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **Matrix Example** (for `tests-behave` workflow):

  ```yaml
  jobs:
    behave-tests:
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **Full Combined Example** (for multiple workflows):

  ```yaml
  # Main CI pipeline orchestrating build, test, and upload stages
  name: Greengage CI

  env:
    version: 6

  on:
    push:
      tags: ['6.*']  # Trigger on tags for versioned releases
    pull_request:
      branches: ['*']  # Trigger on pull requests for all branches

  jobs:
    build:
      strategy:
        fail-fast: true  # Stop on any failure in the matrix
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        packages: write  # Required for GHCR access
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}  # Custom token for pushing image with commit SHA tag

    behave-tests:
      needs: build  # Wait for build to complete
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-behave.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}  # Token for test environment access

    regression-tests:
      needs: build
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}  # Token for test environment access

    orca-tests:
      needs: build
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-orca.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}  # Token for test environment access

    resgroup-tests:
      needs: build
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-resgroup.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}  # Token for test environment access

    upload:
      needs: [behave-tests, regression-tests, orca-tests, resgroup-tests]  # Wait for all tests
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        packages: write  # Required for GHCR access
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}  # Custom token for retagging and pushing final image

  ```

### Notes

- Workflows assume the default branch is checked out unless specified otherwise in testing scenarios.
- Docker images are tagged with the full commit SHA (e.g., `ghcr.io/<owner>/<repo>/ggdb6_ubuntu:<full-sha>`).
- The `docker-retag-upload` workflow only runs for `pull_request` or tagged push events, exiting otherwise.
- The `resgroup-tests` workflow uses Lima, requiring significant resources (4 CPUs, 8GB memory), which may need a self-hosted runner.
- The `regression-tests` workflow uses custom `sysctl` settings.
- Ensure the CI directory structure and required scripts (e.g., `run_resgroup_test.bash`, `ic_gpdb.bash`) are present in the repository.
- Artifacts are uploaded with names like `<job>_ggdb<version>_<target_os>` (e.g., `regression_ggdb6_ubuntu_opt_on`).

## Contributing

For issues or contributions, please open a pull request or issue at:

- [GreengageDB/greengage-ci](https://github.com/GreengageDB/greengage-ci)

For Greengage Database development, refer to:

- [GreengageDB/greengage](https://github.com/GreengageDB/greengage)
