# Test Deb Package Installation Action

Tests Debian package installation inside a Docker container.

## Usage

```yaml
- name: Test deb package installation
  uses: greengagedb/greengage-ci/.github/actions/tests/install/deb@v45
  with:
    test_docker: 'ubuntu:22.04'                   # REQUIRED
    artifact_name: 'deb-packages-ubuntu22.04'     # REQUIRED
    add_greengage_repo: 'true'                    # Optional (default)
    greengage_repo_url: 'https://greengagedb.org' # Optional (default)
    pre_install_commands: ''                      # Optional (default)
    verify_commands: |                            # Optional (recommended)
      dpkg -l sigar gpbackup 2>/dev/null || true
      dpkg -l greengage*
    summary: 'true'                               # Optional (default)
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/tests/install/deb/action.yml@v25`

## Inputs

Input                  | Description                                           | Required | Default
---------------------- | ----------------------------------------------------- | -------- | -------
`test_docker`          | Docker image to test installation in                  | Yes      | -
`artifact_name`        | Name of the deb artifact to download                  | Yes      | -
`add_greengage_repo`   | Add Greengage apt repository before install           | No       | `true`
`greengage_repo_url`   | Base URL of the Greengage apt repository              | No       | `https://greengagedb.org`
`pre_install_commands` | Shell commands to run before `apt-get install`        | No       | `''`
`verify_commands`      | Shell commands to run after install to verify result  | No       | `''`
`summary`              | Write installed package info to GHA job summary       | No       | `true`

## What it does

1. **Download artifact** — downloads deb packages from the current workflow run artifacts
2. **Import GPG key** — fetches the Greengage GPG key on the runner and bind-mounts it into the container
3. **Add repository** (if `add_greengage_repo: true`) — adds the Greengage apt repository;
   OS version is detected automatically from `/etc/os-release`
4. **Pre-install commands** — runs arbitrary commands before installation (e.g., environment setup)
5. **Install packages** — installs all `.deb` files from the artifact via `apt-get install`
6. **Verify** — runs verification commands to confirm successful installation
7. **Summary** (if `summary: true`) — uploads installation logs as a workflow artifact
   and writes a job summary with per-package details: all single-line fields in a table,
   multiline fields (e.g. `Description`, `Conffiles`) in collapsible blocks

## Design rationale

The GPG key is fetched on the runner and bind-mounted into the container rather than fetched inside it.
This avoids depending on `curl` being present in the base image and works around TLS verification issues in minimal images such as `ubuntu:20.04`.
