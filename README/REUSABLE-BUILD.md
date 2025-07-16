# Greengage Reusable Docker Build Workflow

This workflow builds Docker images for the Greengage project and caches them for use in subsequent testing stages within a CI pipeline. It is designed to be called from a parent CI pipeline, enabling users to create containerized environments with flexible version and operating system configurations. For pull requests within the same repository, it also pushes the image to the GitHub Container Registry (GHCR) to facilitate debugging.

## Purpose

The workflow constructs a Docker image based on the specified Greengage version and target operating system, tags it with the commit SHA, and caches it using GitHub's caching mechanism to pass the image to subsequent jobs for testing. For pull requests within the same repository, it optionally adds a developer tag (sanitized branch name) and pushes the image to GHCR for debugging purposes. It supports automated CI runs for the current branch.

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

- **Permissions**: The job requires `contents: read`, `packages: write`, and `actions: write` permissions to checkout the repository, push images to GHCR (for debugging), and manage caching, respectively.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Dockerfile**: Ensure a Dockerfile exists at `ci/Dockerfile.<target_os><target_os_version>` (e.g., `ci/Dockerfile.ubuntu`, `ci/Dockerfile.centos7`).
- **Repository Access**: The workflow checks out the current branch of the repository specified in `github.repository`.

### Examples

- **Single Configuration**

  ```yaml
  jobs:
    build:
      permissions:
        contents: read
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@main
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
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- The workflow checks out the current branch of the repository, using the commit SHA for pull requests.
- The Docker image is tagged with the full commit SHA (e.g., `ghcr.io/<owner>/<repo>/ggdb6_ubuntu:<full-sha>`). For pull requests within the same repository, a developer tag based on the sanitized branch name (e.g., `feature_branch`) is also added and pushed to GHCR for debugging. For external repositories, the image is not pushed to GHCR.
- The built image is saved and cached using GitHub's caching mechanism to pass it to subsequent jobs for testing in the pipeline.
- Tags are always fetched to ensure accurate version resolution.
- Ensure the target OS and version correspond to an existing Dockerfile in the `ci/` directory.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
