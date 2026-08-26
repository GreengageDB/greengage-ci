# Collect Logs Action

Collects logs from a Docker container after test execution. This action is designed to run **after test steps** to gather diagnostic logs even when tests fail or are interrupted.

## Usage

```yaml
- name: Collect logs
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187
```

With optional parameters:

```yaml
- name: Collect logs
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187
  with:
    log_dir: '/tmp/logs'
    params: |
      gpAdminLogs d gpAdminLogs
      gpdb_src/gpAux/gpdemo/datadirs/ d pg_log
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/collect-logs/action.yml@CI-6187

## Inputs

Input | Description | Required | Default
----- | ----------- | -------- | -------
`log_dir` | Directory on the runner host where log archives are stored | No | `/tmp/logs`
`log_path_prefix` | Prefix for archive with logs. Defaults to `<job_id>_logs` if not set | No | *(empty, resolves to job id)*
`params` | Params used for find util, paths are relative to container's WORKDIR | No | see below

Default `params`:

```text
gpAdminLogs d gpAdminLogs
gpdb_src/src/test d results
gpdb_src/src/test f regression.diffs
gpdb_src/gpAux/gpdemo/datadirs d log
gpdb_src/gpAux/gpdemo/datadirs d pg_log
```

## What it does

1. **Determine WORKDIR** - Resolves the container's `WORKDIR` via `docker inspect`, used as the base for relative paths in `params`
2. **Copy target paths** - Uses `docker cp` to pull matching paths from the container filesystem into a temporary directory on the runner host, without starting or execing into the container. Works the same way regardless of whether the container is running or stopped
3. **Package logs** - Runs `find`/`tar` on the runner host to create archives for each log type with prefix `{log_path_prefix}_{name}.tar` (defaults to `{job_id}_logs` if `log_path_prefix` is not set)
4. **Set permissions** - Ensures logs are readable (`chmod -R a+rwX {log_dir}`)

## When to use this

**Use in CI workflows after test execution steps** - This action should be called as a separate step **immediately after** your test step with `if: always()` to ensure logs are collected even when tests fail or are interrupted.

Example pattern:

```yaml
- name: Run tests
  uses: greengagedb/greengage-ci/.github/actions/tests/regression@CI-6187
  with:
    image: ${{ env.IMAGE }}
    optimizer: ${{ matrix.optimizer }}
    target_os: ${{ inputs.target_os }}

- name: Collect logs
  if: always()
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@CI-6187
  with:
    log_path_prefix: "regression_ggdb${{ inputs.version }}_${{ inputs.target_os }}${{ inputs.target_os_version }}_${{ matrix.optimizer }}"

- name: Upload artifacts
  if: always()
  uses: actions/upload-artifact@v7
  with:
    name: logs-${{ matrix.optimizer }}
    path: /tmp/logs
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
- **Consistent pattern**: All test workflows follow the same structure

This approach ensures diagnostic logs are always available for troubleshooting, even when tests fail catastrophically or are cancelled.

## Container discovery

The action iterates over **all** containers on the Docker host (`docker ps -a`) and attempts to collect logs from each of them — there's no way to target a single specific container by name.
