# Upload Packages to GitHub Release

This composite GitHub Action manages package deployment through cache-based artifact
restoration, automatic build recovery, and sequential workflow execution. It uploads
package files (`.deb`, `.ddeb`, `.rpm`) to GitHub releases with fixed naming patterns.

## Core Algorithm

### Normal Flow (Cache Available)

1. **Restore artifacts** from cache using commit SHA as key
2. **Check release** existence and create if `create_force` specified
3. **Rename packages** to fixed pattern: `${PACKAGE_NAME}${VERSION}.${EXT}`
4. **Upload to release** with optional overwrite (`clobber` flag)

### Cache Miss Scenarios

#### A. No Previous Build or Previous Build Successful

- **Trigger** new build workflow for the tag
- **Queue** new release workflow for sequential execution  
- **Fail** current workflow → User manually restarts after build completes

#### B. Previous Build Failed

- **Log error** with build status (`failure`, `cancelled`, `timed_out`)
- **Fail** workflow → Requires manual intervention to fix build issues

### Concurrency & Sequencing

- **Shared concurrency group** prevents parallel execution of build/release workflows
- **FIFO queuing** ensures proper order: Build → Release → Upload
- **Deadlock prevention** through workflow termination and re-queuing

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
- **Build auto-recovery**: Detects missing artifacts and triggers rebuilds
- **Safe concurrency**: Prevents race conditions through shared execution groups
- **Failure protection**: Avoids infinite loops by checking build history
- **Idempotent uploads**: Optional file overwriting with `clobber` flag

## Error Recovery States

| Condition | Action | Outcome |
|-----------|--------|---------|
| Cache found | Upload packages | Success |
| No previous build | Trigger build + queue release | Manual restart needed |
| Previous successful build | Trigger rebuild + queue release | Auto-retry after build |
| Previous failed build | Error message + fail | Manual fix required |

## Notes

- Requires `contents: write` permission for release operations
- Uses shared concurrency groups for workflow sequencing
- Expects exactly one file per extension in cache/artifact directory
- Release notes include commit SHA and workflow run ID for traceability
- Compatible with both tag push and release events
