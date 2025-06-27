# Greengage Reusable Docker Retag and Upload Workflow

This GitHub Actions reusable workflow retags and uploads a Docker image to the GitHub Container Registry (GHCR). It is designed to be called by other workflows, such as the main Greengage CI pipeline, to handle Docker image uploads for specific operating systems and versions.

## Purpose

The workflow:

- Checks out the Greengage repository (with an optional ref).
- Sets up Docker Buildx for image handling.
- Logs into GHCR using a provided token.
- Determines appropriate Docker image tags based on the Git context (commit SHA, branch, or tag).
- Retags an existing Docker image and pushes it to GHCR with either a branch-based or version-based tag.

## Prerequisites

- A Docker image must be available (e.g., from a prior build job) with a tag based on the commit SHA.
- The GitHub token provided must have `packages: write` permissions for GHCR.

## Inputs

| Name               | Description                                 | Required   | Type   | Default |
|--------------------|---------------------------------------------|------------|--------|---------|
| `version`          | Version derived from tag (e.g., `6` or `7`) | Yes        | String | -       |
| `target_os`        | Target operating system (e.g., `ubuntu`, `centos`) | Yes | String | -       |
| `target_os_version`| Target OS version (e.g., `22`, `7`)         | No         | String | `''`    |
| `python3`          | Python3 build argument                      | No         | String | `''`    |
| `ref`              | Branch or ref to checkout                   | No         | String | `''`    |

## Secrets

| Name          | Description                        | Required |
|---------------|------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

## Usage

This workflow is intended to be called by another workflow, such as the main Greengage CI pipeline. Example usage:

```yaml
jobs:
  upload:
    strategy:
      matrix:
        target_os: [ubuntu, centos]
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@main
    with:
      version: 6
      target_os: ${{ matrix.target_os }}
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

## Workflow Steps

1. **Checkout Greengage repo**: Checks out the repository with full Git history and submodules. If `ref` is provided, it checks out the specified branch or tag.
2. **Set up Docker Buildx**: Configures Docker Buildx for image handling.
3. **Login to GitHub Container Registry**: Authenticates with GHCR using the provided token.
4. **Determine image tags**: Generates tags based on the commit SHA, branch (for pull requests), or tag (for tagged pushes).
5. **Upload**: Retags the Docker image (assumed to exist) with a branch or version tag and pushes it to GHCR.

## Notes

- The workflow assumes the Docker image (`ghcr.io/<repository>/ggdb<version>_<target_os>:<sha_tag>`) is available from a prior job.
- The `python3` input is currently unused but included for potential future build argument support.
- If no Git tags are found, the workflow uses `unknown` as a fallback version to prevent failures.

## Limitations

- The workflow does not build the Docker image; it only retags and pushes an existing image.
