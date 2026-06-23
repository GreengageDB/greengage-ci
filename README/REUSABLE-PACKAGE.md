# Greengage Reusable Package Workflow

This workflow builds Debian (.deb) packages for the Greengage project
and optionally tests their installation in a Docker environment.
It is designed to be called from a parent CI pipeline.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v45`

## Purpose

- **`build-deb`**: Builds Debian packages for the specified Greengage
  version and target OS, uploads them as a GitHub Actions artifact.
- **`test-docker`**: Tests installation of the generated packages in a
  Docker container (if `test_docker` is provided).

### Algorithm

1. **Build Debian Packages** (`build-deb`):

   - Restores and loads the builder Docker image from cache or GHCR
     using the [`restore-load-image`](.github/actions/restore-load-image/action.yml) action.
   - Runs the builder image to compile Debian packages via
     `make -C gpdb_src/gpAux pkg-deb`.
   - Uploads generated packages as artifact named
     `{artifact_prefix}-{target_os}{target_os_version}`
     (e.g. `deb-packages-ubuntu22.04`).

2. **Test Installation in Docker** (`test-docker`, if `test_docker` is provided):

   - Uses the [`tests/install/deb`](.github/actions/tests/install/deb/action.yml) action.
   - Downloads the artifact, runs the specified Docker image, adds the
     Greengage apt repository, and installs the packages.

3. **Failure Conditions**:

   - If `target_os` is not `ubuntu`, the `build-deb` job is skipped.
   - If the builder image cannot be restored or loaded, the job exits with an error.
   - If the Debian package build fails, the job exits with an error.

## Inputs

| Name                | Description                                                                 | Required | Default        |
|---------------------|-----------------------------------------------------------------------------|----------|----------------|
| `version`           | Greengage version (e.g., `6` or `7`)                                        | yes      | —              |
| `target_os`         | Target operating system (e.g., `ubuntu`)                                    | yes      | —              |
| `target_os_version` | Target OS version (e.g., `24.04`). Defaults to `22.04` if empty.            | no       | `''`           |
| `artifact_prefix`   | Artifact name prefix. Full name: `{prefix}-{target_os}{target_os_version}`. | no       | `deb-packages` |
| `test_docker`       | Docker image for install test (e.g., `ubuntu:22.04`). Skipped if empty.     | no       | `''`           |

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
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v45
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
    permissions:
      contents: read
      packages: write
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v45
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
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-package.yml@v45
    with:
      version:         6
      target_os:       ubuntu
      artifact_prefix: deb-packages-greengage6
    secrets:
      ghcr_token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

- The `build-deb` job is skipped if `target_os` is not `ubuntu`.
- If `test_docker` is empty, the test job is skipped.
- Artifact name convention: `{artifact_prefix}-{target_os}{target_os_version}`,
  e.g. `deb-packages-ubuntu22.04` or `deb-packages-greengage6-ubuntu22.04`.
- The `upload-pkgs-to-release` action expects the artifact name to follow
  this convention — ensure `artifact_prefix` matches between workflows.
