# Greengage Reusable Package Workflow

This workflow builds packages for the Greengage project and optionally
tests their installation in a Docker environment.
It is designed to be called from a parent CI pipeline.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-6587`

## Purpose

- **`build-package`**: Builds packages for the specified Greengage
  version and target OS, uploads them as a GitHub Actions artifact and,
  if `test_install` is `true`, tests their installation in a Docker
  container (`.deb` for `ubuntu`, `.rpm` for `rockylinux`).

### Algorithm

1. **Build Package** (`build-package`):

   - Restores and loads the builder Docker image from cache or GHCR
     using the [`restore-load-image`](../.github/actions/restore-load-image/action.yml)
     action.
   - Runs the builder image to compile packages via
     `make -C gpdb_src/gpAux pkg-deb` (Ubuntu) or
     `make -C gpdb_src/gpAux pkg-rpm` (Rocky Linux).
   - Uploads generated packages as artifact named
     `{artifact_prefix}-{target_os}{target_os_version}`
     (e.g. `Package-ubuntu22.04` or `Package-rockylinux9`).

2. **Test Installation in Docker** (steps of `build-package`, run after
   the artifact upload, if `test_install` is `true`):

   - Ubuntu: uses the
     [`tests/install/deb`](../.github/actions/tests/install/deb/action.yml)
     action against `ubuntu:{target_os_version}`.
   - Rocky Linux: uses the
     [`tests/install/rpm`](../.github/actions/tests/install/rpm/action.yml)
     action against `rockylinux:{target_os_version}`.
   - Downloads the artifact, runs the matching Docker image, adds the
     Greengage repository, and installs the packages.

3. **Failure Conditions**:

   - If the builder image cannot be restored or loaded, the job exits
     with an error.
   - If the package build fails, the job exits with an error.
   - If the installation test fails, the `build-package` job exits with
     an error. The package artifact is already uploaded and stays
     available for download.

## Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `version` | Greengage version (e.g., `6` or `7`) | yes | — |
| `target_os` | Target OS (`ubuntu` or `rockylinux`) | yes | — |
| `target_os_version` | Target OS version (e.g., `24.04`, `9`). | yes | — |
| `artifact_prefix` | Artifact name prefix. Full name: `{prefix}-{target_os}{target_os_version}`. | no | `Package` |
| `test_install` | Test package installation in `{target_os}:{target_os_version}`. | no | `false` |

## Secrets

| Name | Description | Required |
| --- | --- | --- |
| `ghcr_token` | GitHub token for GHCR access | yes |

## Usage

### Single

```yaml
jobs:
  package:
    permissions:
      contents: read
      packages: write
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-6587
    with:
      version: 6
      target_os: ubuntu
      target_os_version: "22.04"
      test_install: true
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
            target_os_version: "22.04"
          - target_os: ubuntu
            target_os_version: "24.04"
          - target_os: rockylinux
            target_os_version: 9
    permissions:
      contents: read
      packages: write
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-6587
    with:
      version:           6
      target_os:         ${{ matrix.target_os }}
      target_os_version: ${{ matrix.target_os_version }}
      test_install:      true
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

### Custom artifact prefix

```yaml
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@CI-6587
    with:
      version:           7
      target_os:         ubuntu
      target_os_version: "24.04"
      artifact_prefix: deb-packages-greengage6
      test_install:      true
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

- The `MAKE_TARGET` is selected automatically based on `target_os`:
  `pkg-deb` for `ubuntu`, `pkg-rpm` for `rockylinux`.
- If `test_install` is `false` (default), the installation test steps
  are skipped. They are steps of `build-package`, so no separate
  checks appear in the PR checks list.
- Artifact name convention: `{artifact_prefix}-{target_os}{target_os_version}`,
  e.g. `Package-ubuntu22.04` or `Package-rockylinux9`.
- The `upload-pkgs-to-release` action expects the artifact name to follow
  this convention — ensure `artifact_prefix` matches between workflows.
