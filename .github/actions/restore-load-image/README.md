# Restore and Load Docker Image Action

Pulls the Docker images from GHCR (or restores the developer image tarball from cache) and loads them into Docker.

## Usage

```yaml
- name: Restore and load Docker image
  uses: greengagedb/greengage-ci/.github/actions/restore-load-image@CI-6587
  with:
    version: '6' # or '7'
    target_os: 'ubuntu'
    target_os_version: '22.04'
```

With optional `ci/` folder extraction:

```yaml
- name: Restore and load Docker image
  uses: greengagedb/greengage-ci/.github/actions/restore-load-image@CI-6587
  with:
    version: '7'
    target_os: 'ubuntu'
    target_os_version: '24.04'
    extract_ci: ci
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/restore-load-image/action.yml@CI-6587`

## Inputs

Input               | Description                                               | Required | Default
------------------- | --------------------------------------------------------- | -------- | -------
`version`           | Version derived from tag (e.g., 6 or 7)                   | Yes      | -
`target_os`         | Target OS (e.g., ubuntu, rockylinux)                      | Yes      | -
`target_os_version` | Target OS version (e.g., 22.04, 24.04, 9)                 | Yes      | -
`save_tar`          | Save tar file after load (set to any value to keep)       | No       | `''`
`extract_ci`        | Folder to extract from the image's `gpdb_src` (e.g. `ci`) | No       | `''`

## Outputs

This action doesn't declare formal `outputs`, but exports the resolved image references as environment variables available to subsequent steps in the same job:

Variable          | Description
----------------- | -----------------------------------------------------------
`IMAGE_BASE`      | Full resolved reference of the base image (`ghcr.io/{repo}/base_ggdb{version}_{target_os}{target_os_version}:{sha}`, lowercased).
`IMAGE_DEVELOPER` | Full resolved reference of the developer image (`ghcr.io/{repo}/ggdb{version}_{target_os}{target_os_version}:{sha}`, lowercased) that was pulled or loaded.

The action always exports both variables. The base image is on the runner only if the pull from GHCR succeeded (see [What it does](#what-it-does)).

Real-world example — used by the `pg_upgrade` test job to derive a name for the built pg_upgrade image and to pin it to the exact restored image:

```yaml
- name: Restore & Load SHA image
  uses: greengagedb/greengage-ci/.github/actions/restore-load-image@CI-6587
  with:
    version: 7
    target_os: ubuntu
    target_os_version: 22.04
    extract_ci: ci

- name: Define PG_UPGRADE_IMAGE name from IMAGE_DEVELOPER
  run: echo "PG_UPGRADE_IMAGE=${IMAGE_DEVELOPER/:/_pgupgrade:}" >> $GITHUB_ENV

- name: Build ${{ env.PG_UPGRADE_IMAGE }}
  uses: docker/build-push-action@v7
  with:
    context: .
    push: false
    file: ci/Dockerfile.pg_upgrade
    tags: ${{ env.PG_UPGRADE_IMAGE }}
    build-args: GGDB7_IMAGE=${{ env.IMAGE_DEVELOPER }}
```

## What it does

1. **Determine image names** - Resolves the references of the base image and the developer image and exports them as `IMAGE_BASE` and `IMAGE_DEVELOPER`
2. **Try pull from GHCR** - Attempts to pull both images from GitHub Container Registry:
   - The base image: a failed pull is ignored
   - The developer image: a failed pull starts the fallback in the next steps
   - If `save_tar` is set, the developer image is also saved to a tarball
3. **Restore from cache** - If the pull of the developer image fails, restores its tarball from GitHub Actions cache
4. **Load Docker image** - Loads the developer image into Docker; removes tarball unless `save_tar` is set
5. **Extract CI folder** *(optional, if `extract_ci` is set)* - Creates a temporary container from the developer image, copies `/home/gpadmin/gpdb_src/{extract_ci}/` out to `./{extract_ci}/` on the runner, and removes the temporary container

The cache has the developer image only. The layers of the base image are part of the developer image, so the base image is not saved. After the fallback, the layers of the base image are on the runner, but the base image has no tag, and `IMAGE_BASE` refers to an image that is not loaded.

## When to use this

**Use in CI workflows that need pre-built Docker images** - This action provides a fallback mechanism:

- Primary: Pull from GHCR (faster, no cache overhead)
- Fallback: Restore from cache (ensures availability if GHCR is unavailable)

**Use `extract_ci` when a downstream step needs files from the image's `gpdb_src` tree** (e.g. `ci/` scripts) **but the job doesn't otherwise check out the repository** — this avoids adding a redundant `actions/checkout` just to get files that already exist inside the restored image.

**Use `IMAGE_BASE` when a step needs the base image itself**, for example to retag it. The upload workflow does this.

## Design rationale

This dual-mechanism approach was chosen to handle **pull requests from fork repositories**:

- **Fork PRs** have no access to GHCR (GitHub Container Registry)
- **Fork PRs** can use GitHub Actions cache for passing images through the pipeline
- **For the upstream repository** the caching mechanism is redundant — GHCR works directly

This composite action provides a unified solution:

- **Primary**: Pull from GHCR (fast, no cache overhead) — works for upstream/own repo
- **Fallback**: Restore from cache — works for fork PRs where GHCR is unavailable

This avoids GHCR access issues for fork PRs while keeping the workflow simple and efficient for the main repository.

The base image is not part of the fallback. Only the jobs that publish images need it, and they run for the upstream repository, where GHCR works.

`extract_ci` was added alongside the pg_upgrade test job: that job restores a prebuilt image but does not check out `gpdb_src` itself, so it needs a way to pull just the `ci/` scripts directory out of the image rather than requiring a full git checkout of code it already has access to.
