# Restore and Load Docker Image Action

Restores a Docker image tarball from cache (or pulls from GHCR) and loads it into Docker.

## Usage

```yaml
- name: Restore and load Docker image
  uses: greengagedb/greengage-ci/.github/actions/restore-load-image@main # Strongly recommended use current caller workflow tag!
  with:
    version: '6' # or '7'
    target_os: 'ubuntu'
    target_os_version: '22.04' # optional
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/restore-load-image/action.yml@v19`

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `version` | Version derived from tag (e.g., 6 or 7) | Yes | - |
| `target_os` | Target OS (e.g., ubuntu, centos) | Yes | - |
| `target_os_version` | Target OS version (e.g., 22.04) | No | `''` |

## What it does

1. **Try pull from GHCR** - Attempts to pull the image from GitHub Container Registry
2. **Restore from cache** - If pull fails, restores the image tarball from GitHub Actions cache
3. **Load Docker image** - Loads the image into Docker and cleans up the tarball

## When to use this

**Use in CI workflows that need pre-built Docker images** - This action provides a fallback mechanism:

- Primary: Pull from GHCR (faster, no cache overhead)
- Fallback: Restore from cache (ensures availability if GHCR is unavailable)

## Design rationale

This dual-mechanism approach was chosen to handle **pull requests from fork repositories**:

- **Fork PRs** have no access to GHCR (GitHub Container Registry)
- **Fork PRs** can use GitHub Actions cache for passing images through the pipeline
- **For the upstream repository** the caching mechanism is redundant — GHCR works directly

This composite action provides a unified solution:

- **Primary**: Pull from GHCR (fast, no cache overhead) — works for upstream/own repo
- **Fallback**: Restore from cache — works for fork PRs where GHCR is unavailable

This avoids GHCR access issues for fork PRs while keeping the workflow simple and efficient for the main repository.
