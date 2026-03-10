# Greengage Reusable Package Workflow

This workflow builds and packages Debian (.deb) packages for the Greengage project and tests their installation in a Docker container. It is designed to be called from a parent CI pipeline, providing flexibility for version and target operating system.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v27`

## Purpose

The workflow performs the following tasks:

- `build-deb`: Builds Debian packages for the specified Greengage version and target operating system (Ubuntu).
- `test-install`: Tests installation of the generated Debian packages in a Docker container (mandatory).

### Algorithm

The workflow processes the source code to build and test Debian packages. Below is the detailed algorithm:

1. **Build Debian Packages** (`build-deb`):

- Checks out the repository with submodules and full history.
- Logs into the GitHub Container Registry (GHCR) using the provided token.
- Restores or loads the SHA image using `restore-load-image` action.
- Runs the builder image to compile Debian packages using `make -C gpdb_src/gpAux pkg-deb`.
- Uploads and caches generated artifacts (`.deb` packages) as `deb-packages`.

1. **Test Installation in Docker** (`test-install`):

- Downloads the `deb-packages` artifact.
- Runs a Docker container with the target OS image derived from `target_os` and `target_os_version` inputs (e.g., `ubuntu:22.04`).
- Installs the Debian packages using `apt-get install` or `dpkg -i` with `apt-get install -f` for dependency resolution.

1. **Failure Conditions**:

- If the builder image build or pull fails, the `build-deb` job exits with an error.
- If `target_os` is not `ubuntu`, the `build-deb` job is skipped.
- If the Debian package build fails (e.g., due to missing dependencies or compilation errors), the `build-deb` job exits with an error.
- If installation in Docker fails, the `test-install` job exits with an error.
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
`target_os_version` | Target OS version (e.g., `22.04`, `24.04`)           | Yes      | String  | -
`rebuild_builder`   | Rebuild builder image even if it exists              | No       | Boolean | `false`

### Secrets

Name         | Description                  | Required
------------ | ---------------------------- | --------
`ghcr_token` | GitHub token for GHCR access | Yes

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: write`, and `actions: write` permissions to access repository contents, push images to GHCR, and upload artifacts.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: The workflow builds or pulls a builder image matching `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:builder`.
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
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v27
      with:
        version: 6
        target_os: ubuntu
        target_os_version: '22.04'
        rebuild_builder: false
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
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v27
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
        target_os_version: ${{ matrix.target_os_version }}
        rebuild_builder: false
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- The `build-deb` job is skipped if `target_os` is not `ubuntu`.
- The `test-install` job always runs after `build-deb` (mandatory).
- The target Docker image for testing is automatically derived from `target_os` and `target_os_version` inputs.
- The workflow fetches full git history to support changelog generation for non-tagged commits.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
