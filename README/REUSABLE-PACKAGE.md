# Greengage Reusable Package Workflow

This workflow builds and packages Debian (.deb) packages for the Greengage project and optionally tests their installation in Lima or Docker environments. It is designed to be called from a parent CI pipeline, providing flexibility for version, target operating system, and testing configurations.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v23`

## Purpose

The workflow performs the following tasks:

- `build-deb`: Builds Debian packages for the specified Greengage version and target operating system (Ubuntu).
- `test-lima`: Tests installation of the generated Debian packages in a Lima virtual machine (if specified).
- `test-docker`: Tests installation of the generated Debian packages in a Docker container (if specified).

### Algorithm

The workflow processes the source code to build and test Debian packages. Below is the detailed algorithm:

1. **Build Debian Packages** (`build-deb`):

  - Checks out the repository with submodules and full history.
  - Logs into the GitHub Container Registry (GHCR) using the provided token.
  - Builds or pulls a builder Docker image (`ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:builder`) based on the `rebuild_builder` input:

    - If `rebuild_builder` is `true` or the builder image does not exist, builds and pushes the image using `Dockerfile.ubuntu.builder`.
    - Otherwise, pulls the existing builder image.

  - Runs the builder image to compile Debian packages using `make -C gpdb_src/gpAux pkg-deb` with parallel compilation based on available CPU cores.

  - Determines changelog options based on the event:

    - For tagged push events (`refs/tags/*`), uses default changelog options.
    - For branch pushes, includes all commits since the last tag (`last-tag all-commits`).

  - Uploads generated artifacts (`.deb`, `.ddeb`, `.build`, `.buildinfo`, `.changes`) as `deb-packages`.

2. **Test Installation in Lima** (`test-lima`, if `test_lima` is provided):

  - Sets up Lima and caches its configuration.
  - Downloads the `deb-packages` artifact.
  - Starts a Lima VM with the specified template (e.g., `ubuntu-22.04`), configured with 4 CPUs, 8GB memory, and a 9p filesystem mount.
  - Copies the Debian packages to the VM and installs them using `apt-get install` or `dpkg -i` with `apt-get install -f` for dependency resolution.
  - Uploads installation logs as `install-logs`.
  - Cleans up the Lima VM on completion or failure.

3. **Test Installation in Docker** (`test-docker`, if `test_docker` is provided):

  - Downloads the `deb-packages` artifact.
  - Runs a Docker container with the specified image (e.g., `ubuntu:<target_os_version>`).
  - Installs the Debian packages using `apt-get install` or `dpkg -i` with `apt-get install -f` for dependency resolution.
  - Uploads installation logs as `install-logs-docker`.

4. **Failure Conditions**:

  - If the builder image build or pull fails, the `build-deb` job exits with an error.
  - If `target_os` is not `ubuntu`, the `build-deb` job is skipped.
  - If the Debian package build fails (e.g., due to missing dependencies or compilation errors), the `build-deb` job exits with an error.
  - If installation in Lima or Docker fails, the respective test job exits with an error, but subsequent jobs are not blocked.
  - If `ghcr_token` is invalid or lacks permissions, GHCR login fails, causing the workflow to exit.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

Name                | Description                                          | Required | Type    | Default
------------------- | ---------------------------------------------------- | -------- | ------- | -------
`version`           | Version derived from tag (e.g., `6` or `7`)          | Yes      | String  | -
`target_os`         | Target operating system (e.g., `ubuntu`)             | Yes      | String  | -
`target_os_version` | Target OS version (e.g., `22.04`, `24.04`, `7`)      | Yes      | String  | -
`rebuild_builder`   | Rebuild builder image even if it exists              | No       | Boolean | `false`
`test_lima`         | Lima template (e.g., `ubuntu-22.04`) for deploy test | No       | String  | `''`
`test_docker`       | Docker image (e.g., `ubuntu:22.04`) for deploy test  | No       | String  | `''`

### Secrets

Name         | Description                  | Required
------------ | ---------------------------- | --------
`ghcr_token` | GitHub token for GHCR access | Yes

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: write`, and `actions: write` permissions to access repository contents, push images to GHCR, and upload artifacts.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: The workflow builds or pulls a builder image matching `ghcr.io/<repo>/ggdb<version>_<target_os>:builder`.
- **Repository Access**: The workflow checks out the repository specified in `github.repository` with submodules and full history.

### Examples

- Single

  ```yaml
  jobs:
    package:
      permissions:
        contents: read
        packages: write
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v23
      with:
        version: 6
        target_os: ubuntu
        target_os_version: '22.04'
        rebuild_builder: false
        test_lima: ubuntu-22.04
        test_docker: ubuntu:22.04
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- Matrix

  ```yaml
  jobs:
    package:
      strategy:
        fail-fast: false
        matrix:
          include:
            - target_os: ubuntu
              target_os_version: '22.04'
            - target_os: ubuntu
              target_os_version: '24.04'
      permissions:
        contents: read
        packages: write
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v23
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
        target_os_version: ${{ matrix.target_os_version }}
        rebuild_builder: false
        test_docker: ubuntu:${{ matrix.target_os_version }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- The `build-deb` job is skipped if `target_os` is not `ubuntu`.
- If `test_lima` or `test_docker` is empty, the respective test job is skipped.
- The workflow fetches full git history to support changelog generation for non-tagged commits.
- Installation logs are uploaded for debugging failed installations.
- Lima VMs are cleaned up after execution to avoid resource leaks.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
