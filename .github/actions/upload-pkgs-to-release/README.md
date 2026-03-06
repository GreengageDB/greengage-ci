# Upload Packages to GitHub Release

This composite GitHub Action creates or updates a GitHub release and uploads packages with standardized names. It waits for the package generation workflow to complete before restoring artifacts from cache and uploading them to the release.

## Actual version

- `greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release@v25`

## Purpose

The action performs the following operations:

1. **Wait for package generation workflow completion** - Polls the specified workflow until it completes successfully for the current commit and tag
2. **Restore packages from cache** - Retrieves built packages using commit SHA-based cache key
3. **Create release if needed** - Optionally creates the GitHub release if it doesn't exist
4. **Upload packages** - Renames packages to fixed pattern and uploads to release with optional overwrite

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `artifact_name` | no | `Packages` | Artifact name for download and cache key prefix |
| `package_name` | no | repo name | Base package name for uploaded files (defaults to repository name) |
| `release_name` | no | current tag | Target release name (defaults to current tag) |
| `version` | no | empty | Version string to append to package name |
| `extensions` | no | `deb ddeb rpm` | Space-separated list of package file extensions |
| `create_force` | no | empty | Force create the release if not exists |
| `clobber` | no | `false` | Overwrite existing assets if they exist |
| `ci_wait_timeout` | no | `14400` | Timeout in seconds to wait for CI workflow (4 hours) |
| `ci_poll_interval` | no | `60` | Poll interval in seconds to check CI workflow status (1 minute) |
| `workflow_for_waiting` | no | `Greengage CI` | Package generation workflow name to wait for completion |

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
        uses: greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release@v25
        with:
          version: ${{ matrix.version }}
          extensions: ${{ matrix.extensions }}
          artifact_name: ${{ matrix.artifact_name }}
```

## How It Works

### 1. Wait for Package Generation Workflow

The action polls the package generation workflow (`Greengage CI` by default) and waits for completion:

- Filters workflow runs by:
  - **Commit SHA** - must match current commit
  - **Event type** - must be `push`
  - **Branch/tag** - must match release tag
- Monitors status until:
  - **Success** - proceeds with cache restoration
  - **Failure** - exits with error and link to failed run
  - **Timeout** - exits after `ci_wait_timeout` seconds

### 2. Restore Artifacts from Cache

Restores packages using cache key format: `{artifact_name}-{commit_sha}`

If cache miss occurs, the action provides instructions to re-run the CI workflow:
```
ERROR: Cache missed but last build succeeded. No artifacts found for tag: '<tag>'
Please go to <CI_WORKFLOW_URL> and click 'Re-run all jobs' to rebuild cache
```

### 3. Create Release (Optional)

When `create_force` is specified, creates the release with:
- Title: `Release <RELEASE_NAME>`
- Notes: Package name, version, commit SHA, and workflow run number

### 4. Upload Packages

For each extension in `extensions`:
1. Finds the matching file in the artifact directory
2. Validates exactly one file exists per extension
3. Renames to: `{PACKAGE_NAME}{VERSION}.{EXT}`
4. Uploads to release with `gh release upload`
5. Applies `--clobber` flag if enabled

## Requirements

- **Docker**: Not required
- **Permissions**:
  - `contents: write` - for release creation and upload
  - `actions: read` - for workflow status checking
- **GitHub CLI**: Available in runner environment
- **Cache**: GitHub Actions cache must be enabled

## Error Handling

| Scenario | Action | Recovery |
|----------|--------|----------|
| Package building workflow not found within timeout | Exit with timeout error | Check workflow name/trigger conditions |
| Package building workflow failed | Exit with failure details and run URL | Fix build issues and restart |
| Cache miss after successful build | Provide rebuild instructions with CI run URL | Click 'Re-run all jobs' on build workflow |
| Release doesn't exist and `create_force` not set | Skip upload | Set `create_force: true` or create release manually |
| Multiple files with same extension found | Exit with error | Ensure only one file per extension exists |
| No files with expected extension found | Exit with error | Check build output and extensions list |

## Outputs

The action does not produce explicit outputs. Side effects include:

- GitHub release created or updated
- Packages uploaded to release
- `CI_WORKFLOW_URL` environment variable set after successful wait

## Notes

- **Workflow Names**: Ensure `workflow_for_waiting` matches the exact name of your package building workflow
- **Permissions**: Requires `GH_TOKEN` with `actions:read` and `contents:write` scopes
- **Concurrency**: Consider using concurrency groups to prevent race conditions
- **Package Validation**: Expects exactly one file per extension; fails if count differs
- **Upload Failures**: If `clobber` is false and asset exists, upload is skipped for that extension

For further details, refer to the action definition in `.github/actions/upload-pkgs-to-release/action.yaml`.
