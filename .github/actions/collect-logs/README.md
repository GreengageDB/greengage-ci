# Collect Logs Action

Collects logs from a Docker container after test execution. This action is designed to run **after test steps** to gather diagnostic logs even when tests fail or are interrupted.

## Usage

```yaml
- name: Collect logs
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@v26
```

With optional parameters:

```yaml
- name: Collect logs
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@v26
  with:
    log_dir: '/mnt/logs'
    params: |
      ./ d gpAdminLogs
      gpdb_src/gpAux/gpdemo/datadirs/ d pg_log
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/collect-logs/action.yml@v26

## Inputs

Input             | Description                                      | Required | Default
----------------- | ------------------------------------------------ | -------- | -----------
`log_dir`         | Directory where logs are stored inside container | No       | `/logs`
`log_path_prefix` | Prefix for archive with logs                     | No       | `ggdb_test`
`params`          | Params used for find util                        | No       | ./ d gpAdminLogs<br>gpdb_src/src/test/ d results<br>gpdb_src/src/test/ f regression.diffs<br>gpdb_src/gpAux/gpdemo/datadirs/ d log<br>gpdb_src/gpAux/gpdemo/datadirs/ d pg_log

## What it does

1. **Start container** - Starts the Docker container if it's stopped (ignores errors)
2. **Collect logs** - Executes commands inside the container to gather:

  - `gpAdminLogs`
  - `results` directory
  - `regression.diffs`
  - `log` directory
  - `pg_log` directory

3. **Package logs** - Creates tar archives for each log type with prefix `{log_path_prefix}_{name}.tar`

4. **Set permissions** - Ensures logs are readable (`chmod -R a+rwX {log_dir}`)

## When to use this

**Use in CI workflows after test execution steps** - This action should be called as a separate step **immediately after** your test step with `if: always()` to ensure logs are collected even when tests fail or are interrupted.

Example pattern:

```yaml
- name: Run tests
  uses: greengagedb/greengage-ci/.github/actions/tests/regression@v26
  with:
    image: ${{ env.IMAGE }}
    optimizer: ${{ matrix.optimizer }}
    target_os: ${{ inputs.target_os }}

- name: Collect logs
  if: always()
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@v26
  with:
    log_path_prefix: "regression_ggdb${{ inputs.version }}_${{ inputs.target_os }}${{ inputs.target_os_version }}_${{ matrix.optimizer }}"

- name: Upload artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: logs-${{ matrix.optimizer }}
    path: /mnt/logs
```

## Design rationale

This action was created to solve the problem of **lost logs when test steps are interrupted**:

### The Problem

When log collection logic is embedded **inside** a test composite action (within the same Docker run or script), an interruption or failure in the test step prevents log collection entirely. The logs are lost because:

- Test step fails before reaching log collection code
- Docker container exits before logs can be extracted
- Step interruption skips remaining commands

### The Solution

By extracting log collection into a **separate composite action** that runs as an independent step:

- **Isolation**: Test execution and log collection are decoupled
- **Reliability**: Using `if: always()` ensures the step runs regardless of test outcome
- **Container persistence**: The container remains available for log extraction even after test failure
- **Consistent pattern**: All test workflows follow the same structure

This approach ensures diagnostic logs are always available for troubleshooting, even when tests fail catastrophically or are cancelled.

## Container naming

The default container name is `ggdb_test`.

Both the test action and the collect-logs action must use the same `log_name` value to ensure the logs are collected from the correct container. Within a single job (runner), only one test container runs at a time (except behave with docker-compose), so the default name is usually sufficient.
