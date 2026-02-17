# Greengage Reusable Docker Retag and Upload Workflow

This workflow retags and uploads Docker images for the Greengage project to
the GitHub Container Registry (GHCR) and optionally DockerHub. It is designed
to be called from a parent CI pipeline, enabling users to manage Docker image
tags with flexible version and operating system configurations.

## Actual version `v17`

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-regression.yml@v21`

## Purpose

The workflow performs the following task using a Docker image built for the
given Greengage version and target operating system:

- `retag-upload`

### Algorithm

The workflow processes a Docker image to retag and push it to GHCR and
DockerHub based on specific conditions. Below is the detailed algorithm:

1. **Authentication**:
   - Login to GHCR is always mandatory.
   - Login to DockerHub is conditional:
     - For repository `greengagedb/greengage`: mandatory (failure stops workflow)
     - For other repositories: optional (failure is allowed)

2. **Input Image**:
   - The workflow expects an existing Docker image in GHCR with the format
     `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`,
     where:
     - `<repo>` is the repository name (`${{ github.repository }}`).
     - `<version>` is the Greengage version (e.g., `6` or `7`), provided via
       the `version` input.
     - `<target_os>` is the target operating system (e.g., `ubuntu`, `centos`),
       provided via the `target_os` input.
     - `<target_os_version>` is the optional OS version (e.g., `20`, `7`),
       provided via the `target_os_version` input, or empty if not specified.
     - `<full-sha>` is the full commit SHA (`${{ github.sha }}`) of the
       repository at the time of the build.

3. **Tag Assignment**:
   - The workflow assigns tags to the input image based on the event
     triggering the workflow:
     - **For tagged push events** (when `github.ref` matches `refs/tags/*`):
       - The version tag is derived from the git tag using `git describe
         --tags --abbrev=0`.
       - Slashes (`/`) in the tag are replaced with `_` to ensure a valid
         Docker tag.
       - If no tag is found or the tag is invalid, the fallback tag `unknown`
         is used.
       - The `latest` tag is assigned if this is the latest semantic version
         tag.
       - Example: For a git tag `6.28.3`, the tags are `6.28.3` and possibly
         `latest`.
     - **For push to a branch** (e.g., `main` or `7.x`):
       - No version tag is assigned. Developer's branch tags pushed via Build.
       - The `latest` tag is assigned for GHCR.
       - The `testing` tag is assigned for DockerHub when logged in.

4. **Tagging and Pushing**:
   - For tagged pushes:
     - The input image (`$GHCR_IMAGE:${{ github.sha }}`) is tagged with the
       version tag (`$GHCR_IMAGE:$TAG`) and pushed to GHCR.
     - If the tag is the latest semantic version, it is also tagged as
       `latest` and pushed to GHCR.
     - If DockerHub login was successful, the image is tagged with the version
       tag (`$DOCKERHUB_IMAGE:$TAG`) and pushed to DockerHub.
   - For branch pushes:
     - The input image is tagged as `latest` (`$GHCR_IMAGE:latest`) and pushed
       to GHCR.
     - If DockerHub login was successful, the image is tagged as `testing`
       (`$DOCKERHUB_IMAGE:testing`) and pushed to DockerHub.
5. **Failure Conditions**:
   - If the input image does not exist in GHCR, the `docker pull` command will
     fail, causing the workflow to exit with an error.
   - If the sanitized tag is invalid or empty (despite the `unknown` fallback),
     the `docker push` may fail if the tag does not conform to Docker's tag
     requirements.
   - If `DOCKERHUB_USERNAME` or `DOCKERHUB_TOKEN` are missing, DockerHub login
     may fail, but pushes to GHCR proceed.
   - For repository `greengagedb/greengage`, DockerHub login failure will stop
     the workflow.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                      | Required | Type   | Default |
|---------------------|--------------------------------------------------|----------|--------|---------|
| `version`           | Version derived from tag (e.g., `6` or `7`)      | Yes      | String | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`)| Yes     | String | -       |
| `target_os_version` | Target OS version (e.g., `20`, `7`)              | No       | String | `''`    |
| `python3`           | Python3 build argument (ignored)                 | No       | String | `''`    |

### Secrets

| Name                | Description                         | Required |
|---------------------|-------------------------------------|----------|
| `ghcr_token`        | GitHub token for GHCR access        | Yes      |
| `DOCKERHUB_USERNAME`| DockerHub username for authentication| No      |
| `DOCKERHUB_TOKEN`   | DockerHub token for authentication  | No       |

### Requirements

- **Permissions**: The job requires `contents: read` and `packages: write`
  permissions to access repository contents and push images to GHCR.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the
  `ghcr_token` secret. Optionally provide `DOCKERHUB_USERNAME` and
  `DOCKERHUB_TOKEN` for DockerHub uploads.
- **Docker Image**: Ensure a Docker image exists in GHCR matching the format
  `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`.
  Rerun Build job for rebuild if Image not exists.
- **Repository Access**: The workflow checks out the repository specified in
  `github.repository`.

### Examples

- Single

  ```yaml
  jobs:
    retag-upload:
      permissions:
        contents: read
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-docker-retag-upload.yml@v17
      with:
        version: 7
        target_os: ubuntu
        target_os_version: ''
        python3: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
        DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
        DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
  ```

- Matrix

  ```yaml
  jobs:
    retag-upload:
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        contents: read
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-docker-retag-upload.yml@v17
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
        DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
        DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
  ```

### Notes

- For push of a git tag (e.g., `6.28.3`), images are tagged with the version
  and possibly `latest` (if it's the latest semantic version) and pushed to
  GHCR. If DockerHub login is successful, the version tag is also pushed to
  DockerHub.
- For push to a branch (e.g., `main` or `7.x`), images are tagged as `latest`
  for GHCR, and as `testing` for DockerHub (if login is successful).
- Tags are always fetched to ensure correct version resolution.
- DockerHub pushes only occur if login was successful.
- For further details, refer to the workflow file in the
  `.github/workflows/` directory.
