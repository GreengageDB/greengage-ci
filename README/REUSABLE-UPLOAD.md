# Greengage Reusable Docker Retag and Upload Workflow

This workflow retags and uploads Docker images for the Greengage project to the GitHub Container Registry (GHCR) and optionally DockerHub.
It is designed to be called from a parent CI pipeline, enabling users to manage Docker image tags with flexible version and operating system configurations.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@CI-6587`

## Purpose

The workflow takes the two images that the Build workflow made for the given Greengage version and target operating system: the base image and the developer image.
It gives them the release tags and pushes them to GHCR and DockerHub.
The workflow has one job, `upload`.

### Algorithm

1. **Authentication**:

   - Login to GHCR is always mandatory.
   - Login to DockerHub is conditional:

     - For repository `greengagedb/greengage`: mandatory (failure stops workflow).
     - For other repositories: optional (failure is allowed).

2. **Input Images**:

   - The workflow expects two images in GHCR. The `restore-load-image` action loads them:

     - The base image: `ghcr.io/<repo>/base_ggdb<version>_<target_os><target_os_version>:<full-sha>`
     - The developer image: `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<full-sha>`

   - Where:

     - `<repo>` is the repository name (`${{ github.repository }}`).
     - `<version>` is the Greengage version (e.g., `6` or `7`), provided via the `version` input.
     - `<target_os>` is the target operating system (e.g., `ubuntu`, `rockylinux`), provided via the `target_os` input.
     - `<target_os_version>` is the OS version (e.g., `22.04`, `24.04`, `9`), provided via the `target_os_version` input.
     - `<full-sha>` is the full commit SHA (`${{ github.sha }}`) of the repository at the time of the build.

   - The names of the images in DockerHub are:

     - `<DOCKERHUB_USERNAME>/base_ggdb<version>_<target_os><target_os_version>`
     - `<DOCKERHUB_USERNAME>/ggdb<version>_<target_os><target_os_version>`

3. **Tags and Pushing**:

   The workflow gives the same tags to the base image and to the developer image.
   The tags depend on the event that started the workflow:

   | Event                     | GHCR      | DockerHub                                                         |
   |---------------------------|-----------|-------------------------------------------------------------------|
   | Push to a branch          | `latest`  | `testing`                                                         |
   | Push of a git tag `X.Y.Z` | `X.Y.Z`   | `X.Y.Z`, and `latest` if this is the latest semantic version tag  |

   The workflow pushes to DockerHub only if the login to DockerHub was successful.

   - **Push to a branch**:

     - The workflow handles each ref that is not a tag as a push to a branch.
     - The tag `latest` in GHCR points to the image of the last push to the branch.
     - The workflow does not set the tags with the branch name. The Build workflow sets them for pull requests.

   - **Push of a git tag** (when `github.ref` matches `refs/tags/*`):

     - The workflow gets the tag name from `git describe --tags --abbrev=0`.
     - It replaces each character that is not alphanumeric, `.`, `_`, or `-` with `_` to make a valid Docker tag. The Build workflow uses the same rule for the branch name.
     - A tag is the latest semantic version tag if it has the form `<version>.<number>.<number>`, and no newer tag of this form is merged into the checked out commit.
     - The tag `latest` in GHCR does not change. The push to the branch has set it before the tagging.
     - Example: for the git tag `6.28.3`, the images get the tag `6.28.3` in GHCR and in DockerHub. If `6.28.3` is the newest `6.x.y` tag, the images also get the tag `latest` in DockerHub.

4. **Failure Conditions**:

   - If the developer image is not in GHCR and not in the cache, the `restore-load-image` action fails and the workflow stops.
   - If the base image is not available on the runner, the commands for the base image fail without stopping the workflow, and the base image is not published.
   - If the tag is empty or invalid, `docker push` fails because the tag does not conform to the Docker requirements.
   - If `DOCKERHUB_USERNAME` or `DOCKERHUB_TOKEN` are missing, the login to DockerHub fails.
     For repository `greengagedb/greengage`, this stops the workflow.
     For other repositories, the workflow continues and pushes to GHCR only.

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
| `target_os_version` | Target OS version (e.g., `22.04`, `24.04`, `9`).       | No       | String  | `''`    |
| `python3`           | Python3 build argument (ignored)                       | No       | String  | `''`    |

### Secrets

| Name                 | Description                           | Required |
|----------------------|---------------------------------------|----------|
| `ghcr_token`         | GitHub token for GHCR access          | Yes      |
| `DOCKERHUB_USERNAME` | DockerHub username for authentication | No       |
| `DOCKERHUB_TOKEN`    | DockerHub token for authentication    | No       |

### Requirements

- **Permissions**: The job requires `contents: read` and `packages: write` permissions to access repository contents and push images to GHCR.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret. Optionally provide `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` for DockerHub uploads.
- **Docker Images**: The Build workflow must make the base image and the developer image for the same commit and with the same inputs. Rerun the Build job if the images do not exist.
- **Trigger**: The workflow does not check the branch or the event. The calling workflow must run it only for the version branches (by default `6.x`, `7.x`, and `next`) and for the tags of these versions.
- **Repository Access**: The workflow checks out the repository specified in `github.repository`.

### Examples

- Single

  ```yaml
  jobs:
    upload:
      permissions:
        contents: read
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@CI-6587
      with:
        version: 7
        target_os: ubuntu
        target_os_version: '24.04'
        python3: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
        DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
        DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
  ```

- Matrix

  ```yaml
  jobs:
    upload:
      strategy:
        fail-fast: true
        matrix:
          include:
            - target_os: ubuntu
              target_os_version: '22.04'
            - target_os: ubuntu
              target_os_version: '24.04'
      permissions:
        contents: read
        packages: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-upload.yml@CI-6587
      with:
        version: 6
        target_os: ${{ matrix.target_os }}
        target_os_version: ${{ matrix.target_os_version }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
        DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
        DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
  ```

### Notes

- The workflow fetches all tags to resolve the version correctly.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
