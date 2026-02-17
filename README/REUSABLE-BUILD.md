# Greengage Reusable Docker Build Workflow

This workflow builds Docker images for the Greengage project and caches them for use in subsequent testing stages within a CI pipeline. It is designed to be called from a parent CI pipeline, enabling users to create containerized environments with flexible version and operating system configurations. For pull requests within the same repository and push events, it also pushes the image to the GitHub Container Registry (GHCR) to facilitate debugging.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@v19`

## Purpose

The workflow constructs a Docker image based on the specified Greengage version and target operating system, tags it with the commit SHA, and caches it using GitHub's caching mechanism to pass the image to subsequent jobs for testing. For push events and pull requests within the same repository, it also pushes the SHA-tagged image to GHCR. For PRs, an additional developer tag (sanitized branch name) is added and pushed. The workflow runs unit tests during PR builds by default (unless `SKIP_UNITTESTS` is set).

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
| `python3`           | Python3 build argument for the Dockerfile        | No       | String | `''`    |

### Secrets

| Name          | Description                         | Required |
|---------------|-------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: write`, and `actions: write` permissions to checkout the repository, push images to GHCR, and manage caching, respectively.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Dockerfile**: Ensure a Dockerfile exists at `ci/Dockerfile.<target_os><target_os_version>` (e.g., `ci/Dockerfile.ubuntu`, `ci/Dockerfile.centos7`).
- **Repository Access**: The workflow checks out the current branch of the repository specified in `github.repository`. For PRs, it uses `github.event.pull_request.head.sha`; otherwise, it uses `github.ref`.
- **Disk Space**: The workflow uses the `greengagedb/greengage-ci/.github/actions/maximize-disk-space@v19` action to maximize available disk space before building.
- **Docker Buildx**: The workflow uses `docker/setup-buildx-action@v3` to set up Docker Buildx for building images.
- **Caching**: The built image is saved as a `.tar` file and cached using `actions/cache/save@v4` with a key matching the image tag.

### Examples

- **Single Configuration**

  ```yaml
  jobs:
    build:
      permissions:
        contents: read
        packages: write
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@v19
      with:
        version: 7
        target_os: ubuntu
        target_os_version: ''
        python3: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **Matrix Configuration**

  ```yaml
  jobs:
    build:
      strategy:
        fail-fast: true  # Stop on any failure in the matrix
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        contents: read
        packages: write
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@v19
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- The workflow checks out the current branch of the repository. For pull requests, it uses `github.event.pull_request.head.sha`; for other events, it uses `github.ref`.
- The Docker image is tagged with the full commit SHA (e.g., `ghcr.io/<owner>/<repo>/ggdb6_ubuntu:<full-sha>`).
- For **push events** and **pull requests within the same repository**, the SHA-tagged image is pushed to GHCR.
- For **pull requests**, an additional developer tag based on the sanitized branch name (e.g., `feature/branch` → `feature_branch`) is also added and pushed to GHCR for debugging. The branch name is sanitized by replacing any character that is not alphanumeric, `.`, `_`, or `-` with `_`.
- For **external repository PRs**, the image is **not** pushed to GHCR.
- **Unit tests** are run during Docker build for pull requests by default. For push events, unit tests are skipped (`SKIP_UNITTESTS=1`).
- The built image is saved as a `.tar` file and cached using GitHub's caching mechanism to pass it to subsequent jobs for testing in the pipeline.
- Tags are fetched (`git fetch --tags --force`) to ensure accurate version resolution during the build.
- Ensure the target OS and version correspond to an existing Dockerfile in the `ci/` directory.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
