# Restore and Load Docker Image Action

Restores a Docker image tarball from cache (or pulls from GHCR) and loads it into Docker.

## Usage

```yaml
- name: Restore and load Docker image
  uses: greengagedb/greengage-ci/.github/actions/restore-load-image@v52
  with:
    version: '6' # or '7'
    target_os: 'ubuntu'
    target_os_version: '22.04'
```

With optional `ci/` folder extraction:

```yaml
- name: Restore and load Docker image
  uses: greengagedb/greengage-ci/.github/actions/restore-load-image@v52
  with:
    version: '7'
    target_os: 'ubuntu'
    target_os_version: '24.04'
    extract_ci: ci
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/restore-load-image/action.yml@v52`

## Inputs

Input               | Description                                               | Required | Default
------------------- | --------------------------------------------------------- | -------- | -------
`version`           | Version derived from tag (e.g., 6 or 7)                   | Yes      | -
`target_os`         | Target OS (e.g., ubuntu, centos)                          | Yes      | -
`target_os_version` | Target OS version (e.g., 22.04)                           | Yes      | -
`save_tar`          | Save tar file after load (set to any value to keep)       | No       | `''`
`extract_ci`        | Folder to extract from the image's `gpdb_src` (e.g. `ci`) | No       | `''`

## Outputs

This action doesn't declare formal `outputs`, but exports the resolved image reference as an environment variable available to subsequent steps in the same job:

Variable               | Description
---------------------- | -----------------------------------------------------------
`RESTORE_LOAD_IMAGE`   | Full resolved image reference (`ghcr.io/{repo}/ggdb{version}_{target_os}{target_os_version}:{sha}`, lowercased) that was pulled or loaded.

Real-world example — used by the `pg_upgrade` test job to derive a name for the built pg_upgrade image and to pin it to the exact restored image:

```yaml
- name: Restore & Load SHA image
  uses: greengagedb/greengage-ci/.github/actions/restore-load-image@v52
  with:
    version: 7
    target_os: ubuntu
    target_os_version: 22.04
    extract_ci: ci

- name: Define PG_UPGRADE_IMAGE name from RESTORE_LOAD_IMAGE
  run: echo "PG_UPGRADE_IMAGE=${RESTORE_LOAD_IMAGE/:/_pgupgrade:}" >> $GITHUB_ENV

- name: Build ${{ env.PG_UPGRADE_IMAGE }}
  uses: docker/build-push-action@v7
  with:
    context: .
    push: false
    file: ci/Dockerfile.pg_upgrade
    tags: ${{ env.PG_UPGRADE_IMAGE }}
    build-args: GGDB7_IMAGE=${{ env.RESTORE_LOAD_IMAGE }}
```

## What it does

1. **Determine image name** - Resolves the target image reference and exports it as `RESTORE_LOAD_IMAGE`
2. **Try pull from GHCR** - Attempts to pull the image from GitHub Container Registry
3. **Restore from cache** - If pull fails, restores the image tarball from GitHub Actions cache
4. **Load Docker image** - Loads the image into Docker; removes tarball unless `save_tar` is set
5. **Extract CI folder** *(optional, if `extract_ci` is set)* - Creates a temporary container from the loaded image, copies `/home/gpadmin/gpdb_src/{extract_ci}/` out to `./{extract_ci}/` on the runner, and removes the temporary container

## When to use this

**Use in CI workflows that need pre-built Docker images** - This action provides a fallback mechanism:

- Primary: Pull from GHCR (faster, no cache overhead)
- Fallback: Restore from cache (ensures availability if GHCR is unavailable)

**Use `extract_ci` when a downstream step needs files from the image's `gpdb_src` tree** (e.g. `ci/` scripts) **but the job doesn't otherwise check out the repository** — this avoids adding a redundant `actions/checkout` just to get files that already exist inside the restored image.

## Design rationale

This dual-mechanism approach was chosen to handle **pull requests from fork repositories**:

- **Fork PRs** have no access to GHCR (GitHub Container Registry)
- **Fork PRs** can use GitHub Actions cache for passing images through the pipeline
- **For the upstream repository** the caching mechanism is redundant — GHCR works directly

This composite action provides a unified solution:

- **Primary**: Pull from GHCR (fast, no cache overhead) — works for upstream/own repo
- **Fallback**: Restore from cache — works for fork PRs where GHCR is unavailable

This avoids GHCR access issues for fork PRs while keeping the workflow simple and efficient for the main repository.

`extract_ci` was added alongside the pg_upgrade test job: that job restores a prebuilt image but does not check out `gpdb_src` itself, so it needs a way to pull just the `ci/` scripts directory out of the image rather than requiring a full git checkout of code it already has access to.
