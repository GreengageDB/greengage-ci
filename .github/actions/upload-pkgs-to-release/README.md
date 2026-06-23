# Upload Packages to GitHub Release

This composite GitHub Action orchestrates the package release process by coordinating between the **package building workflow** and **release publishing workflow**. It ensures packages are only uploaded to releases after successful completion of the package generation process.

## Actual version

- `greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release/action.yaml@v45`

## Workflow Coordination Model

### Sequence of Operations

1. **Wait for Package Building Workflow Completion**

   - Polls the specified package generation workflow (`Greengage CI` by default)
   - Verifies the workflow completed successfully for the exact commit and tag
   - Provides configurable timeout (default: 4 hours) and polling interval (default: 60 seconds)

2. **Download Built Packages**

   - **Primary**: downloads the artifact `{artifact_prefix}-{target_os}{target_os_version}` from the CI run using `gh run download`
   - **Fallback**: if the artifact is not found, restores from GitHub Actions cache using key `{artifact_prefix}-{target_os}{target_os_version}-{commit_sha}` — preserves backward compatibility with workflows that do not yet produce artifacts

3. **Rename and Upload Packages**

   - Renames each file to include the OS revision suffix before upload:
     `{name}_{version}_{arch}.deb` → `{name}_{version}~{target_os}{target_os_version}_{arch}.deb`
   - Uploads all matching files to the release
   - Optional overwrite with `clobber` flag

## Inputs

Name                   | Required | Default        | Description
---------------------- | -------- | -------------- | ----------------------------------------------------------------
`target_os`            | **yes**  |                | Target OS (e.g. `ubuntu`)
`target_os_version`    | **yes**  |                | Target OS version (e.g. `22.04`, `24.04`)
`artifact_prefix`      | **yes**  |                | Artifact name prefix. Full name: `{prefix}-{target_os}{target_os_version}`. Also used as the local download directory.
`extensions`           | no       | `deb ddeb rpm` | Space-separated list of package file extensions to upload
`clobber`              | no       | empty          | Set to `true` to overwrite existing release assets
`ci_wait_timeout`      | no       | `14400`        | Timeout in seconds to wait for CI workflow (4 hours)
`ci_poll_interval`     | no       | `60`           | Poll interval in seconds to check CI workflow status
`workflow_for_waiting` | no       | `Greengage CI` | **Name of the package building workflow** to wait for completion

## Usage Example

```yaml
name: Greengage PXF Release
on:
  release:
    types: [released]
jobs:
  upload-to-release:
    strategy:
      fail-fast: false
      matrix:
        include:
        - target_os: ubuntu
          target_os_version: 22.04
          extensions:       deb ddeb
          artifact_prefix:  deb-packages-pxf6
        - target_os: ubuntu
          target_os_version: 24.04
          extensions:       deb ddeb
          artifact_prefix:  deb-packages-pxf6
    runs-on: ubuntu-latest
    permissions:
      contents: write
      actions: read
    steps:
      - name: Upload packages to release
        uses: greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release@v45
        with:
          workflow_for_waiting: Greengage PXF CI
          target_os:            ${{ matrix.target_os }}
          target_os_version:    ${{ matrix.target_os_version }}
          extensions:           ${{ matrix.extensions }}
          artifact_prefix:      ${{ matrix.artifact_prefix }}
```

## How It Works: Wait for Package Building

The action waits for the **package generation workflow** to complete before proceeding:

1. **Identifies the correct workflow run** by filtering on:

   - Commit SHA (same as current release)
   - Event type (`push`)
   - Branch/tag name (release tag)

2. **Monitors workflow status** until:

   - **Success**: Proceeds with package download and upload
   - **Failure**: Exits with error and link to failed run
   - **Timeout**: Exits after specified wait time

3. **Requires specific permissions**:

   - `contents: write` for release operations
   - GitHub token with access to workflow run information

## Error Handling

Scenario                                           | Action                                           | Recovery
-------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------
Package building workflow not found within timeout | Exit with timeout error                          | Check workflow name/trigger conditions
Package building workflow failed                   | Exit with failure details                        | Fix build issues and restart
Artifact and cache both missing                    | Exit with error and link to CI run               | Re-run the CI workflow for the same tag

## Package Building Workflow Requirements

For this action to work correctly, the package building workflow must:

1. **Use the same commit SHA** as the release workflow
2. **Be triggered by push events** to the release tag
3. **Upload packages as a GitHub Actions artifact** named `{artifact_prefix}-{target_os}{target_os_version}`
4. **Complete successfully** before the release workflow proceeds

## Notes

- **Artifact naming**: the artifact name must match `{artifact_prefix}-{target_os}{target_os_version}` exactly
- **Cache fallback**: if the CI workflow saves packages to cache with key `{artifact_prefix}-{target_os}{target_os_version}-{sha}`, the action will use it as a fallback automatically
- **Workflow Names**: ensure `workflow_for_waiting` matches the exact name of your package building workflow
- **Permissions**: requires `GH_TOKEN` with `actions:read` and `contents:write` scopes
