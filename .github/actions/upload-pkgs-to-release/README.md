# Upload Packages to GitHub Release

This composite GitHub Action manages package deployment through cache-based artifact restoration and manual build recovery. It uploads package files (`.deb`, `.ddeb`, `.rpm`) to GitHub releases with fixed naming patterns.

## Core Algorithm

### Normal Flow (Cache Available)

1. **Restore artifacts** from cache using commit SHA as key
2. **Check release** existence and create if `create_force` specified
3. **Rename packages** to fixed pattern: `${PACKAGE_NAME}${VERSION}.${EXT}`
4. **Upload to release** with optional overwrite (`clobber` flag)

### Cache Miss Scenarios

#### A. No Previous Build or Previous Build Successful

- **Check** the status of the last build for the tag
- **Provide instructions** for manual build trigger
- **Fail** current workflow → User manually triggers build and restarts release workflow after build completes

#### B. Previous Build Failed

- **Log error** with build status (`failure`, `cancelled`, `timed_out`)
- **Provide link** to the failed run for inspection
- **Fail** workflow → Requires manual intervention to fix build issues

### Concurrency & Sequencing

- **Shared concurrency group** prevents parallel execution of build/release workflows
- **FIFO queuing** ensures proper order: Build → Release → Upload
- **Manual recovery** prevents infinite loops and gives control to the user

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

## Usage Example

```yaml
jobs:
  upload-to-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Required for creating/updating releases
    steps:
      - name: Upload packages
        uses: greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release@main
        with:
          package_name: greengage
          version: 6
          extensions: "deb ddeb"
```

## Key Features

- **Cache-based restoration**: Uses GitHub Actions cache with commit-based keys
- **Manual build recovery**: Provides clear instructions when cache is missing
- **Safe concurrency**: Prevents race conditions through shared execution groups
- **Failure protection**: Avoids infinite loops by checking build history
- **Idempotent uploads**: Optional file overwriting with `clobber` flag

## Error Recovery States

| Condition | Action | Outcome |
|-----------|--------|---------|
| Cache found | Upload packages | Success |
| Cache miss, no previous build | Provide instructions for manual build | Manual intervention required |
| Cache miss, previous successful build | Provide link to previous run and instructions for rebuild | Manual intervention required |
| Cache miss, previous failed build | Provide link to failed run and instructions to fix | Manual intervention required |

## Notes

- Requires `contents: write` permission for release operations
- Uses shared concurrency groups for workflow sequencing
- Expects exactly one file per extension in cache/artifact directory
- Release notes include commit SHA and workflow run ID for traceability
- Compatible with both tag push and release events
- When cache is missing, the action will fail with detailed recovery instructions instead of automatically triggering builds
