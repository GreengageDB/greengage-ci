# Greengage Reusable Docker Build Workflow

This workflow builds the Docker images for the Greengage project and passes them to the next jobs of a CI pipeline.
It builds two images: the base image (OS packages and Python packages) and the developer image (Greengage build).
A parent CI pipeline calls it with the Greengage version and the target OS.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@CI-6587`

## Purpose

The workflow does these steps:

1. It builds the base image for the target OS. Layers that did not change come from the cache.
2. It builds the developer image from this base image.
3. It tags both images with the commit SHA and pushes them to the GitHub Container Registry (GHCR).
4. If the push fails, it saves the developer image to a `.tar` file and caches it for the next jobs.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                            | Required | Type    | Default |
|---------------------|--------------------------------------------------------|----------|---------|---------|
| `version`           | Greengage version (e.g., `6` or `7`)                   | Yes      | String  | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `rockylinux`) | Yes      | String  | -       |
| `target_os_version` | Target OS version (e.g., `22.04`, `24.04`, `9`)        | Yes      | String  | -       |
| `skip_unittests`    | Skip unit tests during build (set to `1` to skip)      | No       | String  | `''`    |

### Secrets

|Name         | Description                  | Required|
|------------ | ---------------------------- | --------|
|`ghcr_token` | GitHub token for GHCR access | Yes     |

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: write`, and `actions: write` permissions to check out the repository, push images to GHCR, and save the cache.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.
- **Dockerfiles**: The repository must have `ci/Dockerfile.base` and `ci/Dockerfile.developer`.
  - `ci/Dockerfile.base` gets the build arguments `OS_VERSION` and `TARGET_OS`. It reads `ci/requirements.txt` and `ci/scripts/setup_<target_os>.bash`.
  - `ci/Dockerfile.developer` gets the build arguments `BASE_IMAGE` and `SKIP_UNITTESTS`.
- **Repository Access**: The workflow checks out the repository specified in `github.repository`. For PRs, it uses `github.event.pull_request.head.sha`; otherwise, it uses `github.ref`.
- **Disk Space**: The workflow uses the `greengagedb/greengage-ci/.github/actions/maximize-disk-space@v24` action to maximize available disk space before building.

## Images and tags

Image names are in lowercase. `<name>` is `ggdb<version>_<target_os><target_os_version>`, for example `ggdb7_ubuntu24.04`.

| Image     | Name                                  | Tags                                                          |
|-----------|---------------------------------------|---------------------------------------------------------------|
| Base      | `ghcr.io/<owner>/<repo>/base_<name>`  | `<full-sha>`; for PRs also the branch tag                     |
| Developer | `ghcr.io/<owner>/<repo>/<name>`       | `<full-sha>`; for PRs also the branch tag                     |

The branch tag is the branch name where each character that is not alphanumeric, `.`, `_`, or `-` is replaced with `_` (for example, `feature/branch` becomes `feature_branch`).

The tags `latest`, `testing`, and the release tags are not set by this workflow.
The workflow `greengage-reusable-upload.yml` sets them after the tests.
See [REUSABLE-UPLOAD.md](REUSABLE-UPLOAD.md).

## How it works

1. **Prepare environment.** The workflow calculates the branch tag. For `ubuntu`, it resolves `azure.archive.ubuntu.com` and sets `--add-host` for `archive.ubuntu.com` and `security.ubuntu.com`.
   If the mirror is not reachable, the default mirrors are used. For other OS (for example, `rockylinux`), no mirror is set. The mirror applies to the base image build only.
2. **Login to GHCR.** The step uses `continue-on-error: true`.
3. **Build base image.** The workflow builds the base image on every run. The build uses these image sources for the cache, in this order:
   1. the base image with the SHA tag
   2. the base image with the branch tag
   3. the base image with the tag `latest` in GHCR
   4. the base image with the tag `latest` on Docker Hub (`greengagedb/base_<name>`)

   A cache source that does not exist does not stop the build. If the base image did not change, all layers come from the cache.
4. **Push base images.** The workflow pushes the SHA tag. For PRs, it also pushes the branch tag. The step uses `continue-on-error: true`.
5. **Build developer image.** The workflow builds the developer image from the base image with the SHA tag.
6. **Push developer images.** The workflow pushes the SHA tag. For PRs, it also pushes the branch tag. The step uses `continue-on-error: true`.
7. **Save and cache.** If step 6 did not succeed, the workflow saves the developer image to a `.tar` file and caches it with `actions/cache/save@v6`.
   The key is `ggdb<version>_<target_os><target_os_version>_<full-sha>`. The base image is not cached: its layers are part of the developer image.

## Examples

- **Single Configuration**

  ```yaml
  jobs:
    build:
      permissions:
        contents: read
        packages: write
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@CI-6587
      with:
        version: 7
        target_os: ubuntu
        target_os_version: 24.04
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **Matrix Configuration**

  ```yaml
  jobs:
    build:
      strategy:
        fail-fast: false
        matrix:
          include:
            - target_os: ubuntu
              target_os_version: "22.04"
            - target_os: ubuntu
              target_os_version: "24.04"
      permissions:
        contents: read
        packages: write
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-build.yml@CI-6587
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
        target_os_version: ${{ matrix.target_os_version }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

## Notes

- The workflow tries to push on every event. A pull request from an external repository cannot push to GHCR.
  The push steps do not stop the workflow, and the workflow saves the developer image to the cache instead.
- The images in GHCR are for the next jobs and for debugging. For the pull requests, the branch tag always points to the last build of the branch.
- A change of `ci/requirements.txt` or of a setup script rebuilds the layers of the base image from the changed step.
  A new digest of the OS image (for example, `ubuntu:24.04`) rebuilds all layers.
- **Unit tests**: By default, unit tests are skipped for push events always and run for pull requests.
  Use the `skip_unittests` input to override this behavior for pull requests (set to `1` to skip).
- The target OS and its version must be valid for `ci/Dockerfile.base`: the Dockerfile uses them as the name and the tag of the OS image.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
