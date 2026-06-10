# Greengage Reusable Native Deb Build Workflow

This workflow builds a Debian (.deb) package natively on the runner and optionally tests its installation in a Docker environment.
It is designed to be called from a parent CI pipeline for projects that build `.deb` packages directly on the host (without a builder Docker image).

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-deb-native.yml@CI-5788`

## Purpose

The workflow performs the following tasks:

- `build-deb`: Builds a Debian package natively on the runner and uploads it as an artifact.
- `test-install`: Tests installation of the generated Debian package in a Docker container (if specified).

### Algorithm

1. **Build Debian Package** (`build-deb`):

   - Checks out the repository at the specified depth.
   - Optionally installs the specified Go version and exports `GOPATH`.
   - Installs packaging tools (`build-essential`, `debhelper`, `devscripts`) and any extra apt packages.
   - Runs the build command from the repository root.
   - Uploads generated `.deb` files as the specified artifact.

2. **Test Installation in Docker** (`test-install`, if `test_docker` is provided):

   - Uses the [`tests/install/deb`](.github/actions/tests/install/deb/action.yml) composite action.
   - Downloads the artifact, runs the specified Docker image, optionally adds the Greengage apt repository, and installs the package.

3. **Failure Conditions**:

   - If the build command fails, the `build-deb` job exits with an error.
   - If package installation inside the container fails, the `test-install` job exits with an error.

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow.
2. Provide the required and optional inputs as described below.
3. Ensure the necessary permissions and secrets are configured.

### Inputs

| Name                   | Description                                                                 | Required | Type    | Default                          |
|------------------------|-----------------------------------------------------------------------------|----------|---------|----------------------------------|
| `artifact_name`        | Name for the uploaded `.deb` artifact                                       | Yes      | String  | -                                |
| `runner`               | GitHub Actions runner image (e.g., `ubuntu-24.04`)                          | No       | String  | `ubuntu-24.04`                   |
| `fetch_depth`          | git fetch depth passed to `actions/checkout`                                | No       | Number  | `0`                              |
| `build_command`        | Command to build the `.deb` package, run from the repository root           | No       | String  | `dpkg-buildpackage -us -uc -b`   |
| `go_version`           | Go version to install (e.g., `1.20`). Leave empty for non-Go projects       | No       | String  | `''`                             |
| `extra_apt_packages`   | Space-separated list of extra apt packages to install before build          | No       | String  | `''`                             |
| `test_docker`          | Docker image for install test (e.g., `ubuntu:24.04`). Skip if empty         | No       | String  | `''`                             |
| `add_greengage_repo`   | Add the Greengage apt repository before installing the package              | No       | Boolean | `false`                          |
| `greengage_repo_url`   | Base URL of the Greengage apt repository                                    | No       | String  | `https://greengagedb.org`        |
| `pre_install_commands` | Shell commands to run inside the container before package installation      | No       | String  | `''`                             |
| `verify_commands`      | Shell commands to run inside the container after package installation       | No       | String  | `''`                             |

### Requirements

- **Permissions**: The job requires `contents: read` and `actions: write` permissions.

### Examples

#### Simple Go project

```yaml
jobs:
  build:
    permissions:
      contents: read
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-deb-native.yml@CI-5788
    with:
      artifact_name: gpbackup-deb
      go_version: '1.21'
      test_docker: ubuntu:22.04
      verify_commands: dpkg -l gpbackup*
```

#### With Greengage dependency

```yaml
jobs:
  build:
    permissions:
      contents: read
      actions: write
    uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-deb-native.yml@CI-5788
    with:
      artifact_name: gpbackup-s3-plugin-deb
      go_version: '1.21'
      test_docker: ubuntu:22.04
      add_greengage_repo: true
      verify_commands: dpkg -l gpbackup*
```

### Notes

- If `test_docker` is empty, the `test-install` job is skipped.
- `add_greengage_repo` is required when the package `Depends` on `greengage6` or `greengage7`.
- For further details, refer to the workflow file in the `.github/workflows/` directory.
