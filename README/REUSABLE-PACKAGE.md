# Greengage Reusable Package Workflow

This workflow builds packages for the Greengage project and optionally
tests their installation in a Docker environment.
It is designed to be called from a parent CI pipeline.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-5654`

## Purpose

- **`build-package`**: Builds packages for the specified Greengage
  version and target OS, uploads them as a GitHub Actions artifact.
- **`test-docker-ubuntu`**: Tests installation of the generated `.deb`
  packages in a Docker container (if `test_docker` is provided and
  `target_os` is `ubuntu`).
- **`test-docker-rockylinux`**: Tests installation of the generated
  `.rpm` packages in a Docker container (if `test_docker` is provided
  and `target_os` is `rockylinux`).

### Algorithm

1. **Build Package** (`build-package`):

   - Restores and loads the builder Docker image from cache or GHCR
     using the [`restore-load-image`](.github/actions/restore-load-image/action.yml)
     action.
   - Runs the builder image to compile packages via
     `make -C gpdb_src/gpAux pkg-deb` (Ubuntu) or
     `make -C gpdb_src/gpAux pkg-rpm` (Rocky Linux).
   - Uploads generated packages as artifact named
     `{artifact_prefix}-{target_os}{target_os_version}`
     (e.g. `Package-ubuntu22.04` or `Package-rockylinux8`).

2. **Test Installation in Docker** (if `test_docker` is provided):

   - Ubuntu: uses the
     [`tests/install/deb`](.github/actions/tests/install/deb/action.yml)
     action.
   - Rocky Linux: uses the
     [`tests/install/rpm`](.github/actions/tests/install/rpm/action.yml)
     action.
   - Downloads the artifact, runs the specified Docker image, adds the
     Greengage repository, and installs the packages.

3. **Failure Conditions**:

   - If the builder image cannot be restored or loaded, the job exits
     with an error.
   - If the package build fails, the job exits with an error.

## Inputs

| Name                | Description                                                                 | Required | Default     |
|---------------------|-----------------------------------------------------------------------------|----------|-------------|
| `version`           | Greengage version (e.g., `6` or `7`)                                        | yes      | —           |
| `target_os`         | Target OS (`ubuntu` or `rockylinux`)                                        | yes      | —           |
| `target_os_version` | Target OS version (e.g., `24.04`, `8`). Default `` if empty.      | no       | `''`        |
| `artifact_prefix`   | Artifact name prefix. Full name: `{prefix}-{target_os}{target_os_version}`. | no       | `Package`   |
| `test_docker`       | Docker image for install test (e.g., `ubuntu:22.04`). Skipped if empty.    | no       | `''`        |

## Secrets

| Name         | Description                  | Required |
|--------------|------------------------------|----------|
| `ghcr_token` | GitHub token for GHCR access | yes      |

## Usage

### Single

```yaml
jobs:
  package:
    permissions:
      contents: read
      packages: write
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-5654
    with:
      version: 6
      target_os: ubuntu
      test_docker: ubuntu:22.04
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

### Matrix

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
          - target_os: rockylinux
            target_os_version: '8'
    permissions:
      contents: read
      packages: write
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-5654
    with:
      version:             6
      target_os:           ${{ matrix.target_os }}
      target_os_version:   ${{ matrix.target_os_version }}
      test_docker:         ${{ matrix.target_os }}:${{ matrix.target_os_version }}
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

### Custom artifact prefix

```yaml
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-5654
    with:
      version:         6
      target_os:       ubuntu
      artifact_prefix: deb-packages-greengage6
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

- The `MAKE_TARGET` is selected automatically based on `target_os`:
  `pkg-deb` for `ubuntu`, `pkg-rpm` for `rockylinux`.
- If `test_docker` is empty, the test jobs are skipped.
- Artifact name convention: `{artifact_prefix}-{target_os}{target_os_version}`,
  e.g. `Package-ubuntu22.04` or `Package-rockylinux8`.
- The `upload-pkgs-to-release` action expects the artifact name to follow
  this convention — ensure `artifact_prefix` matches between workflows.
