# Greengage Reusable Package Workflow

This workflow builds and packages Debian (.deb) packages for the Greengage project and optionally tests their installation in a Docker environment. It is designed to be called from a parent CI pipeline, providing flexibility for version, target operating system, and testing configurations.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-5788`

## Purpose

The workflow performs the following tasks:

- `build-deb`: Builds Debian packages for the specified Greengage version and target operating system (Ubuntu).
- `test-docker`: Tests installation of the generated Debian packages in a Docker container (if specified).

### Algorithm

1. **Build Debian Packages** (`build-deb`):

   - Logs into the GitHub Container Registry (GHCR) using the provided token.
   - Restores and loads the builder Docker image (`ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<sha>`) from cache or GHCR using the [`restore-load-image`](.github/actions/restore-load-image/action.yml) action.
   - Runs the builder image to compile Debian packages using `make -C gpdb_src/gpAux pkg-deb`.
   - Uploads generated artifacts as `deb-packages-<target_os><target_os_version>`.
   - Caches artifacts by `<target_os><target_os_version>-<sha>` key for subsequent jobs.

2. **Test Installation in Docker** (`test-docker`, if `test_docker` is provided):

   - Uses the [`tests/deb-install`](.github/actions/tests/deb-install/action.yml) composite action.
   - Downloads the artifact, runs the specified Docker image, adds the Greengage apt repository, and installs the packages.

3. **Failure Conditions**:

   - If `target_os` is not `ubuntu`, the `build-deb` job is skipped.
   - If the builder image cannot be restored or loaded, the `build-deb` job exits with an error.
   - If the Debian package build fails, the `build-deb` job exits with an error.
   - If `ghcr_token` is invalid or lacks permissions, GHCR login fails, causing the workflow to exit.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                | Description                                          | Required | Type    | Default |
|---------------------|------------------------------------------------------|----------|---------|---------|
| `version`           | Greengage version (e.g., `6` or `7`)                 | Yes      | String  | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`)             | Yes      | String  | -       |
| `target_os_version` | Target OS version (e.g., ``, `24.04`)                | No       | String  | `''`    |
| `rebuild_builder`   | Rebuild builder image even if it exists              | No       | Boolean | `false` |
| `test_docker`       | Docker image (e.g., `ubuntu:22.04`) for deploy test  | No       | String  | `''`    |

### Secrets

| Name         | Description                  | Required |
|--------------|------------------------------|----------|
| `ghcr_token` | GitHub token for GHCR access | Yes      |

### Requirements

- **Permissions**: The job requires `contents: read`, `packages: write`, and `actions: write` permissions.
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret.

### Examples

#### Single

```yaml
jobs:
  package:
    permissions:
      contents: read
      packages: write
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-5788
    with:
      version: 6
      target_os: ubuntu
      test_docker: ubuntu:22.04
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

#### Matrix

```yaml
jobs:
  package:
    strategy:
      fail-fast: false
      matrix:
        include:
          - target_os: ubuntu
          - target_os: ubuntu
            target_os_version: '24.04'
    permissions:
      contents: read
      packages: write
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-5788
    with:
      version: 6
      target_os: ${{ matrix.target_os }}
      target_os_version: ${{ matrix.target_os_version }}
      test_docker: ubuntu:${{ matrix.target_os_version || '22.04' }}
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

### Notes

- The `build-deb` job is skipped if `target_os` is not `ubuntu`.
- If `test_docker` is empty, the test job is skipped.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
