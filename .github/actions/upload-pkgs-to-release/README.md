# Upload Packages to GitHub Release

This composite GitHub Action orchestrates the package release process by coordinating between the **package building workflow** and **release publishing workflow**. It ensures packages are only uploaded to releases after successful completion of the package generation process.

## Workflow Coordination Model

### Sequence of Operations

1. **Wait for Package Building Workflow Completion**
   - Polls the specified package generation workflow (`Greengage CI` by default)
   - Verifies the workflow completed successfully for the exact commit and tag
   - Provides configurable timeout (default: 4 hours) and polling interval (default: 60 seconds)

2. **Restore Built Packages from Cache**
   - Retrieves packages from GitHub Actions cache using commit SHA as key
   - Cache key format: `{artifact_name}-{commit_sha}`

3. **Create Release if Needed**
   - Creates GitHub release when `create_force` is specified and release doesn't exist
   - Includes build metadata (commit SHA, workflow run ID) in release notes

4. **Upload Packages with Standardized Names**
   - Renames packages to fixed pattern: `${PACKAGE_NAME}${VERSION}.${EXT}`
   - Uploads to release with optional overwrite (`clobber` flag)

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `artifact_name` | no | `Packages` | Cache key prefix for artifact restoration |
| `package_name` | no | repo name | Base package name for uploaded files |
| `release_name` | no | current tag | Target release name (defaults to tag) |
| `version` | no | empty | Version suffix for package names |
| `extensions` | no | `deb ddeb rpm` | Space-separated package extensions |
| `create_force` | no | empty | Force release creation if missing |
| `clobber` | no | `false` | Overwrite existing release assets |
| `ci_wait_timeout` | no | `14400` | Timeout in seconds to wait for CI workflow (4 hours) |
| `ci_poll_interval` | no | `60` | Poll interval in seconds to check CI workflow status |
| `workflow_for_waiting` | no | `Greengage CI` | **Name of the package building workflow** to wait for completion |

## Key Features

- **Workflow Coordination**: Ensures package building completes successfully before release upload
- **Build Status Verification**: Uses GitHub CLI to confirm successful build for specific commit/tag
- **Cache-based Artifact Transfer**: Reliable package transfer between workflows via GitHub Actions cache
- **Configurable Timeouts**: Adjustable wait times for CI workflow completion
- **Manual Recovery Flow**: Clear instructions when cache restoration fails

## Usage Example

```yaml
name: Greengage release
on:
  release:
    types: [released]
jobs:
  upload-to-release:
    strategy:
      fail-fast: false
      matrix:
        include:
        - version: 6
          extensions: deb ddeb
          artifact_name: deb-packages
    runs-on: ubuntu-latest
    permissions:
      contents: write
      actions: read
    steps:
      - name: Upload packages to release
        uses: greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release@v10
        with:
          version: ${{ matrix.version }}
          extensions: ${{ matrix.extensions }}
          artifact_name: ${{ matrix.artifact_name }}
```

## How It Works: Wait for Package Building

The action waits for the **package generation workflow** to complete before proceeding:

1. **Identifies the correct workflow run** by filtering on:
   - Commit SHA (same as current release)
   - Event type (`push`)
   - Branch/tag name (release tag)

2. **Monitors workflow status** until:
   - **Success**: Proceeds with cache restoration and upload
   - **Failure**: Exits with error and link to failed run
   - **Timeout**: Exits after specified wait time

3. **Requires specific permissions**:
   - `contents: write` for release operations
   - GitHub token with access to workflow run information

## Error Handling

| Scenario | Action | Recovery |
|----------|--------|----------|
| Package building workflow not found within timeout | Exit with timeout error | Check workflow name/trigger conditions |
| Package building workflow failed | Exit with failure details | Fix build issues and restart |
| Cache miss after successful build | Provide rebuild instructions with link to CI run | Manually trigger "Re-run all jobs" on build workflow |
| Release doesn't exist and `create_force` not set | Skip upload | Set `create_force: true` or create release manually |

## Package Building Workflow Requirements

For this action to work correctly, the package building workflow must:

1. **Use the same commit SHA** as the release workflow
2. **Be triggered by push events** to the release tag
3. **Store artifacts in cache** with key format: `{artifact_name}-{commit_sha}`
4. **Complete successfully** before the release workflow proceeds

## Technical Implementation

- **GitHub CLI Filtering**: Uses `gh run list --jq` with precise filtering to find the correct workflow run
- **Cache Key Strategy**: Commit-based keys ensure artifact consistency
- **Package Validation**: Verifies exactly one file per extension before upload
- **Release Metadata**: Includes build provenance in release notes

## Notes

- **Workflow Names**: Ensure `workflow_for_waiting` matches the exact name of your package building workflow
- **Permissions**: Requires `GH_TOKEN` with `actions:read` and `contents:write` scopes
- **Concurrency**: Consider using concurrency groups to prevent race conditions between workflows
- **Cache Expiration**: GitHub Actions cache has retention policies; consider artifact fallback for long-term storage
