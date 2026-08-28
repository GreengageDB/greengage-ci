# Collect Logs Action

Collects logs from a Docker container after test execution and uploads them as a workflow artifact.
This action is designed to run **after test steps** to gather diagnostic logs even when tests fail or are interrupted.

## Usage

```yaml
- name: Collect logs
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187-no-docker-cp
```

With optional parameters:

```yaml
- name: Collect logs
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187-no-docker-cp
  with:
    name: my_test_logs
    params: |
      gpAdminLogs d gpAdminLogs
      gpdb_src/gpAux/gpdemo/datadirs d pg_log
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/collect-logs/action.yml@CI-6187-no-docker-cp

## Inputs

Input | Description | Required | Default
--- | --- | --- | ---
`name` | Artifact name. Defaults to the job id if not set | No | *(empty, resolves to job id)*
`docker_host` | Docker host string (e.g., ssh://qemu-vm) | No | *(empty)*
`params` | Params used for find util | No | see below

Default `params`:

```text
gpAdminLogs d gpAdminLogs
gpdb_src/src/test d results
gpdb_src/src/test f regression.diffs
gpdb_src/gpAux/gpdemo/datadirs d log
gpdb_src/gpAux/gpdemo/datadirs d pg_log
```

Each line in `params` is `<path> <type> <name>`:

- `path` is relative to the container's `WORKDIR` (*or **absolute** if it **starts with `/`***);
- `type` is `d` for directory or `f` for file;
- `name` is searched via `find -name` (globs supported).

## What it does

1. **Discover containers** - Iterates over all containers on the Docker host (`docker ps -a`)
2. **Determine WORKDIR** - Resolves each container's `WORKDIR` via `docker inspect`, used as the base for relative paths in `params`
3. **Copy target paths** - Uses `docker cp` to pull matching paths from the container filesystem into a temporary directory on the runner host, without starting or execing into the container. Works the same way regardless of whether the container is running or stopped
4. **Package logs** - Runs `find`/`tar` on the runner host to create an archive for each `params` entry, named `{name}_{entry_name}.tar`
5. **Upload artifact** - Uploads the collected archives as a workflow artifact named `name` (or the job id, if not set)

## When to use this

**Use in CI workflows after test execution steps** - This action should be called as a separate step **immediately after** your test step with `if: always()` to ensure logs are collected even when tests fail or are interrupted. It uploads the artifact itself, so no separate `actions/upload-artifact` step is needed.

Real examples from this repo:

```yaml
# .github/workflows/greengage-reusable-tests-jit.yml
- name: Collect logs ${{ github.job }} ${{ matrix.optimizer }}
  if: always()
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187-no-docker-cp
  with:
    name: jit_ggdb${{ inputs.version }}_${{ inputs.target_os }}${{ inputs.target_os_version }}_${{ matrix.optimizer }}
```

```yaml
# .github/workflows/greengage-reusable-tests-orca.yml
- name: Collect logs ${{ github.job }}
  if: always()
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187-no-docker-cp
  with:
    name: ${{ github.job }}_ggdb${{ inputs.version }}_${{ inputs.target_os }}${{ inputs.target_os_version }}
    params: |
      gpAdminLogs d gpAdminLogs
      gpdb_src/src/backend/gporca/build/Testing d Temporary
```

```yaml
# .github/workflows/greengage-reusable-tests-regression.yml
- name: Collect regression logs
  if: always()
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187-no-docker-cp
  with:
    name: regression_logs_ggdb${{ inputs.version }}_${{ inputs.target_os }}${{ inputs.target_os_version }}_${{ matrix.optimizer }}
    params: |
        /tmp/coverage-data d coverage-data
        gpAdminLogs d gpAdminLogs
        gpdb_src/src/test d results
        gpdb_src/src/test f regression.diffs
        gpdb_src/gpAux/gpdemo/datadirs d log
        gpdb_src/gpAux/gpdemo/datadirs d pg_log
```

```yaml
# .github/workflows/greengage-reusable-tests-resgroup.yml
- name: Collect logs
  if: always()
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187-no-docker-cp
  with:
    name: resgroup_${{ env.IMAGE_NAME }}_${{ github.job }}_${{ matrix.optimizer }}
    docker_host: 'ssh://qemu-vm'
```

## Design rationale

This action was created to solve the problem of **lost logs when test steps are interrupted**:

### The Problem

When log collection logic is embedded **inside** a test composite action (within the same Docker run or script), an interruption or failure in the test step prevents log collection entirely. The logs are lost because:

- Test step fails before reaching log collection code
- Docker container exits before logs can be extracted
- Step interruption skips remaining commands

Additionally, collecting logs by starting the container and running commands inside it (`docker start` + `docker exec`) is unsafe for containers with a non-idempotent entrypoint: a startup script may wipe or reinitialize logs on every run, or crash right after start, resulting in incomplete or missing archives.

### The Solution

By extracting log collection into a **separate composite action** that runs as an independent step, and reading files directly from the container filesystem via `docker cp`:

- **Isolation**: Test execution and log collection are decoupled
- **Reliability**: Using `if: always()` ensures the step runs regardless of test outcome
- **No container mutation**: `docker cp` reads files directly from the container filesystem without starting it or running any command inside it, so logs are collected as they were left after the test, and container state or existing entrypoint behavior is never affected
- **Consistent pattern**: All test workflows follow the same structure, without needing a separate upload step kept in sync with what the action collected

This approach ensures diagnostic logs are always available for troubleshooting, even when tests fail catastrophically or are cancelled.

## Container discovery

The action iterates over **all** containers on the Docker host (`docker ps -a`) and attempts to collect logs from each of them — there's no way to target a single specific container by name.
