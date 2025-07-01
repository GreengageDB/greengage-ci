# Greengage Reusable Docker Retag and Upload Workflow

This workflow retags and uploads Docker images for the Greengage project to the GitHub Container Registry (GHCR). It is designed to be called from a parent CI pipeline, enabling users to manage Docker image tags with flexible version and operating system configurations.

## Purpose

The workflow performs the following task using a Docker image built for the given Greengage version and target operating system:

- `retag-upload`

### Algorithm

The workflow processes a Docker image to retag and push it to GHCR based on specific conditions. Below is the detailed algorithm:

1. **Input Image**:
   - The workflow expects an existing Docker image in GHCR with the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`, where:
     - `<repo>` is the repository name (`${{ github.repository }}`).
     - `<version>` is the Greengage version (e.g., `6` or `7`), provided via the `version` input.
     - `<target_os>` is the target operating system (e.g., `ubuntu`, `centos`), provided via the `target_os` input.
     - `<target_os_version>` is the optional OS version (e.g., `20`, `7`), provided via the `target_os_version` input, or empty if not specified.
     - `<full-sha>` is the full commit SHA (`${{ github.sha }}`) of the repository at the time of the build.

2. **Tag Assignment**:
   - The workflow assigns a new tag to the input image based on the event triggering the workflow:
     - **For `pull_request` events**:
       - The new tag is derived from `github.head_ref` (the branch name of the pull request).
       - The branch name is sanitized by replacing any characters not matching `[a-zA-Z0-9._-]` with `_` to ensure a valid Docker tag.
       - If sanitization results in an empty or invalid tag, the fallback tag `unknown` is used.
       - Example: For a branch `feature/my-test`, the tag might be `feature_my-test`.
     - **For tagged push events** (when `github.ref` matches `refs/tags/*`):
       - The new tag is derived from the git tag using `git describe --tags --abbrev=0`.
       - Slashes (`/`) in the tag are replaced with `_` to ensure a valid Docker tag.
       - If no tag is found or the tag is invalid, the fallback tag `unknown` is used.
       - Example: For a git tag `6.1.0`, the tag becomes `6.1.0`.
     - **For other events** (e.g., `push` to a branch without a tag or manual triggers):
       - The workflow exits with an error message: `"Not a pull request or tagged push, skipping tagging"`, and no tagging or pushing occurs.

3. **Tagging and Pushing**:
   - The input image (`$IMAGE:${{ github.sha }}`) is tagged with the new tag (`$IMAGE:$TAG`) using `docker tag`.
   - The newly tagged image is pushed to GHCR using `docker push $IMAGE:$TAG`.
   - Example: If the input image is `ghcr.io/greengagedb/greengage-ci/ggdb6_ubuntu:abcdef1234567890`, and the event is a pull request with `github.head_ref = feature/test`, the image is retagged as `ghcr.io/greengagedb/greengage-ci/ggdb6_ubuntu:feature_test` and pushed.

4. **Failure Conditions**:
   - If the input image does not exist in GHCR, the `docker tag` command will fail, causing the workflow to exit with an error.
   - If the event is neither a `pull_request` nor a tagged push, the workflow exits with a non-zero status code and skips tagging.
   - If the sanitized tag is invalid or empty (despite the `unknown` fallback), the `docker push` may fail if the tag does not conform to Docker’s tag requirements.

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
| `ref`               | Branch or tag to checkout (e.g., `main`, `7.x`)  | No       | String | `''`    |

### Secrets

| Name          | Description                         | Required |
|---------------|-------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

### Requirements

- **Permissions**: The job requires `contents: read` and `packages: write` permissions to access repository contents and push images to GHCR.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Docker Image**: Ensure a Docker image exists in GHCR matching the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`.
- **Repository Access**: The workflow checks out the repository specified in `github.repository`.

### Examples

- Single

  ```yaml
  jobs:
    retag-upload:
      permissions:
        contents: read
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-docker-retag-upload.yml@main
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
    retag-upload:
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu, centos]
      permissions:
        contents: read
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-docker-retag-upload.yml@main
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

### Notes

- If `ref` is not provided, the workflow checks out the default branch.
- The Docker image is expected to be tagged with the full commit SHA (e.g., `ghcr.io/<owner>/<repo>/ggdb6_ubuntu:<full-sha>`) and retagged with a branch or tag name.
- The workflow only runs for `pull_request` or tagged push events; otherwise, it exits with an error.
- Ensure the repository has the necessary tags or branches for retagging.

For further details, refer to the workflow file in the `.github/workflows/` directory.
