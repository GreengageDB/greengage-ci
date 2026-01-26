# Greengage Reusable Docker Retag and Upload Workflow

This workflow retags and uploads Docker images for the Greengage project to the GitHub Container Registry (GHCR) and optionally DockerHub. It is designed to be called from a parent CI pipeline, enabling users to manage Docker image tags with flexible version and operating system configurations.

## Actual version `v16`

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@v16`

## Purpose

The workflow performs the following task using a Docker image built for the given Greengage version and target operating system:

- `retag-upload`

### Algorithm

The workflow processes a Docker image to retag and push it to GHCR and DockerHub based on specific conditions. Below is the detailed algorithm:

1. **Input Image**:
   - The workflow expects an existing Docker image in GHCR with the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`, where:
     - `<repo>` is the repository name (`${{ github.repository }}`).
     - `<version>` is the Greengage version (e.g., `6` or `7`), provided via the `version` input.
     - `<target_os>` is the target operating system (e.g., `ubuntu`, `centos`), provided via the `target_os` input.
     - `<target_os_version>` is the optional OS version (e.g., `20`, `7`), provided via the `target_os_version` input, or empty if not specified.
     - `<full-sha>` is the full commit SHA (`${{ github.sha }}`) of the repository at the time of the build.

2. **Tag Assignment**:
   - The workflow assigns tags to the input image based on the event triggering the workflow:
     - **For tagged push events** (when `github.ref` matches `refs/tags/*`):
       - The version tag is derived from the git tag using `git describe --tags --abbrev=0`.
       - Slashes (`/`) in the tag are replaced with `_` to ensure a valid Docker tag.
       - If no tag is found or the tag is invalid, the fallback tag `unknown` is used.
       - The workflow checks if this tag is the latest semantic tag for the given version (matching pattern `^<version>.<minor>.<patch>$`).
       - For GHCR: the tag is always pushed.
       - For DockerHub: the tag is pushed, and if it's the latest semantic tag for that version, it's also tagged as `latest`.
       - Example: For a git tag `6.28.3`, the tag `6.28.3` is pushed to GHCR. For DockerHub, `6.28.3` is pushed, and if it's the latest semantic tag for version 6, then `latest` is also pushed.
     - **For push to a branch** (e.g., `main` or `6.x`):
       - For GHCR: only the `latest` tag is assigned and pushed.
       - For DockerHub: only the `testing` tag is assigned and pushed.
       - Example: For a branch `main`, the tag `latest` is pushed to GHCR, and `testing` to DockerHub.

3. **Tagging and Pushing**:
   - For tagged pushes:
     - The input image (`$GHCR_IMAGE:${{ github.sha }}`) is tagged with the version tag (`$GHCR_IMAGE:$TAG`) and pushed to GHCR.
     - **Only if DockerHub credentials are configured**: The image is tagged with the version tag (`$DOCKERHUB_IMAGE:$TAG`). If the tag is the latest semantic tag for that version, then it is also tagged as `latest` (`$DOCKERHUB_IMAGE:latest`) and pushed to DockerHub.
     - Example: For a tag `6.28.3`, the image `ghcr.io/greengagedb/greengage/ggdb6_ubuntu:abcdef1234567890` is retagged as `ghcr.io/greengagedb/greengage/ggdb6_ubuntu:6.28.3` for GHCR. For DockerHub, if credentials are available, it's tagged as `<username>/ggdb6_ubuntu:6.28.3`. If it's the latest semantic tag for version 6, then it's also tagged as `<username>/ggdb6_ubuntu:latest`.
   - For branch pushes:
     - The input image is tagged with `latest` (`$GHCR_IMAGE:latest`) and pushed to GHCR.
     - **Only if DockerHub credentials are configured**: The image is tagged with `testing` (`$DOCKERHUB_IMAGE:testing`) and pushed to DockerHub.
     - Example: For a branch `main`, the image is retagged as `ghcr.io/greengagedb/greengage/ggdb6_ubuntu:latest` for GHCR, and `<username>/ggdb6_ubuntu:testing` for DockerHub (if credentials available).

4. **DockerHub Conditional Processing**:
   - DockerHub operations (login and push) are **only performed** when both `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are provided and non-empty.
   - If either secret is missing or empty, the workflow skips all DockerHub operations entirely without errors.

5. **Failure Conditions**:
   - If the input image does not exist in GHCR, the `docker pull` command will fail, causing the workflow to exit with an error.
   - If the sanitized tag is invalid or empty (despite the `unknown` fallback), the `docker push` may fail if the tag does not conform to Docker's tag requirements.
   - If `DOCKERHUB_USERNAME` or `DOCKERHUB_TOKEN` are missing, DockerHub operations are skipped without errors.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                      | Required | Type   | Default |
|---------------------|--------------------------------------------------|----------|--------|---------|
| `version`           | Version derived from tag (e.g., `6` or `7`)      | Yes      | String | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`) | Yes    | String | -       |
| `target_os_version` | Target OS version (e.g., `20`, `7`)              | No       | String | `''`    |
| `python3`           | Python3 build argument (ignored)                 | No       | String | `''`    |

### Secrets

| Name                | Description                         | Required |
|---------------------|-------------------------------------|----------|
| `ghcr_token`        | GitHub token for GHCR access        | Yes      |
| `DOCKERHUB_USERNAME`| DockerHub username for authentication | No     |
| `DOCKERHUB_TOKEN`   | DockerHub token for authentication  | No       |

**Note:** DockerHub operations are only performed when **both** `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are provided and non-empty. If either is missing, the workflow skips DockerHub entirely.

### Requirements

- **Permissions**: The job requires `contents: read` and `packages: write` permissions to access repository contents and push images to GHCR.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret. Optionally provide `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` for DockerHub uploads.
- **Docker Image**: Ensure a Docker image exists in GHCR matching the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`.
- **Repository Access**: The workflow checks out the repository specified in `github.repository`.

### Examples

- Single

  ```yaml
  jobs:
    upload:
      permissions:
        contents: read  # Explicit for default behavior
        packages: write # Required for GHCR access
        actions:  write # Required for artifact upload
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@v16
      with:
        version: 6
        target_os: ubuntu
        target_os_version: ''
        python3: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
        DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
        DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
  ```

- Matrix

  ```yaml
  jobs:
    upload:
      if: github.event_name == 'push' # For push or tags
      needs: build                    # After build only
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        contents: read  # Explicit for default behavior
        packages: write # Required for GHCR access
        actions:  write # Required for artifact upload
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@v16
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
        DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
        DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
  ```

### Notes

- For push of a git tag (e.g., `6.28.3`), images are tagged with the version and pushed to GHCR. For DockerHub, the version tag is always pushed (if credentials are available), and `latest` is only pushed if the tag is the latest semantic tag for that version.
- For push to a branch (e.g., `main` or `6.x`), only the `latest` tag is pushed to GHCR, and only `testing` is pushed to DockerHub (if credentials are provided).
- Tags are always fetched to ensure correct version resolution.
- If `DOCKERHUB_USERNAME` or `DOCKERHUB_TOKEN` are missing or empty, DockerHub operations are completely skipped without errors.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
