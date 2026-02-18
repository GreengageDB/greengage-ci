# Collect Logs Action

Collects logs from a Docker container after test execution. This action is designed to run **after test steps** to gather diagnostic logs even when tests fail or are interrupted.

## Usage

```yaml
- name: Collect logs
  uses: greengagedb/greengage-ci/.github/actions/collect-logs@feat/collect-logs # Strongly recommended use current caller workflow tag!
  with:
    container_name: 'ggdb6_ubuntu22.04_test_postgres'
    log_prefix: 'postgres'
    target_os: 'ubuntu'
    log_dir: '/mnt/logs'  # optional, default: /mnt/logs
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/collect-logs/action.yml@v16`

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `container_name` | Name of the Docker container to collect logs from | Yes | - |
| `log_prefix` | Prefix for log file names (e.g., optimizer name) | Yes | - |
| `target_os` | Target OS for log file naming | Yes | - |
| `log_dir` | Directory to mount for logs collection | No | `/mnt/logs` |

## What it does

1. **Start container** - Starts the Docker container if it's stopped (ignores errors)
2. **Collect logs** - Executes commands inside the container to gather:
   - `gpAdminLogs`
   - `results` directory
   - `regression.diffs`
   - `log` directory
   - `pg_log` directory
3. **Package logs** - Creates tar archives for each log type
4. **Set permissions** - Ensures logs are readable (`chmod -R a+rwX`)

## When to use this

**Use in CI workflows after test execution steps** - This action should be called as a separate step **immediately after** your test step with `if: always()` to ensure logs are collected even when tests fail or are interrupted.

Example pattern:

```yaml
- name: Run tests
  uses: ./.github/actions/tests/regression@v16
  with:
    image: ${{ env.IMAGE }}
    optimizer: ${{ matrix.optimizer }}

- name: Collect logs
  if: always()
  uses: ./.github/actions/collect-logs@feat/collect-logs
  with:
    container_name: ${{ env.CONT_NAME }}
    log_prefix: ${{ matrix.optimizer }}
    target_os: ${{ inputs.target_os }}

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
