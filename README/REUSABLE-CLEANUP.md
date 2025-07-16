# Greengage Reusable Cleanup Workflow

This workflow deletes branch-specific Docker images from the GitHub Container Registry (GHCR) for the Greengage project. It is designed to be called from a parent CI pipeline to clean up images associated with developer branches (e.g., pull requests) after they are merged or closed, ensuring the registry remains uncluttered.

## Purpose

The workflow identifies Docker images in GHCR tagged with a sanitized branch name (developer tag) for a specific Greengage version and target operating system. It deletes all tags associated with the same image digest, excluding the `latest` tag, to clean up branch-specific images created during development. This workflow is only relevant for branches within the same repository.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow, typically triggered on branch deletion or pull request closure.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                      | Required | Type   | Default |
|---------------------|--------------------------------------------------|----------|--------|---------|
| `version`           | Greengage version (e.g., `6` or `7`)             | Yes      | String | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`) | Yes    | String | -       |
| `target_os_version` | Target OS version (e.g., `20`, `7`)              | No       | String | `''`    |

### Secrets

| Name          | Description                         | Required |
|---------------|-------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

### Requirements

- **Permissions**: The job requires `packages: write` permissions to delete images from GHCR.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Repository Access**: The workflow operates on images in the repository specified in `github.repository`.

### Examples

- **Single Configuration**

  ```yaml
  jobs:
    cleanup:
      permissions:
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-cleanup.yml@main
      with:
        version: 7
        target_os: ubuntu
        target_os_version: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **Matrix Configuration**

  ```yaml
  jobs:
    cleanup:
      strategy:
        fail-fast: true  # Stop on any failure in the matrix
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-cleanup.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- The workflow derives the developer tag by sanitizing the branch name from `github.event.ref`. If the branch name cannot be determined, the workflow exits without error.
- It targets images in GHCR with the format `ghcr.io/<owner>/<repo>/ggdb<version>_<target_os><target_os_version>:<dev_tag>`. All tags sharing the same image digest as the developer tag are deleted, except for the `latest` tag.
- If no image is found for the developer tag, the workflow exits without error.
- The workflow is only applicable for branches within the same repository, as it aligns with the image push behavior in the Greengage Reusable Build Workflow.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
