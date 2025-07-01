# Greengage Reusable Docker Build Workflow

This workflow builds and pushes Docker images for the Greengage project to the GitHub Container Registry (GHCR). It is designed to be called from a parent CI pipeline, enabling users to create containerized environments with flexible version and operating system configurations.

## Purpose

The workflow constructs a Docker image based on the specified Greengage version and target operating system, tags it with the commit SHA, and pushes it to GHCR. It supports both automated CI runs and manual executions with custom branch or tag references.

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
| `ref`               | Branch or tag to checkout (e.g., `main`, `7.x`)  | No       | String | `''`    |

### Secrets

| Name          | Description                         | Required |
|---------------|-------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

### Requirements

- **Permissions**: The job requires `packages: write` permissions to push images to GHCR.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Dockerfile**: Ensure a Dockerfile exists at `ci/Dockerfile.<target_os><target_os_version>` (e.g., `ci/Dockerfile.ubuntu`, `ci/Dockerfile.centos7`).
- **Repository Access**: The workflow checks out the repository specified in `github.repository`.

### Examples

- Single

  ```yaml
  jobs:
    build:
      permissions:
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

- Matrix

  ```yaml
  jobs:
    build:
      strategy:
        fail-fast: true  # Stop on any failure in the matrix
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- If `ref` is not provided, the workflow checks out the default branch.
- The Docker image is tagged with the full commit SHA (e.g., `ghcr.io/<owner>/<repo>/ggdb6_ubuntu:<full-sha>`).
- Ensure the target OS and version match an existing Dockerfile in the `ci/` directory.

For further details, refer to the workflow file in the `.github/workflows/` directory.
