# Fetch SQL Dump Action

Fetches a SQL dump artifact from a previous successful `Greengage SQL Dump` workflow run and extracts it on the runner.

## Usage

```yaml
- name: Fetch SQL dump
  id: sql-dump
  uses: greengagedb/greengage-ci/.github/actions/sql-dump/fetch@v54
  with:
    version: '6'
    target_os: 'ubuntu'
    target_os_version: '24.04'
````

The extracted dump file is available through the `sql_dump` output:

```yaml
- name: Use SQL dump
  run: psql ... < "${{ steps.sql-dump.outputs.sql_dump }}"
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

* `greengagedb/greengage-ci/.github/actions/sql-dump/fetch/action.yml@v54`

## Inputs

| Input               | Description                       | Required | Default             |
| ------------------- | --------------------------------- | -------- | ------------------- |
| `version`           | Greengage version (e.g., 6, 7, 8) | Yes      | -                   |
| `target_os`         | Target OS                         | No       | `ubuntu`            |
| `target_os_version` | Target OS version (e.g., 24.04)   | No       | `'24.04`            |
| `artifact_prefix`   | Prefix of the input artifact name | No       | `sqldump_ggdb`      |
| `archive_suffix`    | Suffix of the output archive name | No       | `_postgres_sqldump` |

`target_os_version` is omitted from the generated OS name when its value is
`22.04`. This preserves the default naming convention for Ubuntu 22.04.

For example:

* `ubuntu` + `''` → `ubuntu`
* `ubuntu` + `22.04` → `ubuntu`
* `ubuntu` + `24.04` → `ubuntu24.04`

The resulting OS name is used to construct both the artifact name and the
archive name.

## Outputs

| Output     | Description                         |
| ---------- | ----------------------------------- |
| `sql_dump` | Path to the extracted SQL dump file |

The output contains the name of the file extracted from the downloaded
archive and can be referenced through the action step ID:

```yaml
${{ steps.sql-dump.outputs.sql_dump }}
```

## What it does

1. **Determine target OS name** - Builds the target OS name from
   `target_os` and `target_os_version`
2. **Determine artifact name** - Builds the SQL dump artifact name from
   `artifact_prefix`, `version`, and the target OS name
3. **Find successful workflow runs** - Queries the `Greengage SQL Dump`
   workflow and gets up to 100 completed successful runs
4. **Find SQL dump artifact** - Tries to download the requested artifact
   from each successful workflow run until it is found
5. **Extract SQL dump** - Extracts the dump archive and captures the name
   of the extracted file
6. **Remove archive** - Removes the downloaded archive after successful
   extraction
7. **Set output** - Exposes the extracted dump filename through the
   `sql_dump` action output

## When to use this

**Use in CI workflows that require a pre-generated SQL dump** — this action
avoids rebuilding the dump as part of the current workflow and reuses the
artifact produced by a previous successful `Greengage SQL Dump` workflow run.

The action is particularly useful for tests such as `gpexpand` that require
a prepared SQL dump but do not need to generate one themselves.

## Design rationale

The SQL dump is generated independently by the `Greengage SQL Dump` workflow.
The fetch action searches successful runs of that workflow and downloads the
first matching artifact it finds.

The action exposes the extracted filename as an output rather than an
environment variable. This keeps the result scoped to the action invocation
and allows callers to explicitly decide how and where the dump path should be
used.

```yaml
- name: Fetch SQL dump
  id: sql-dump
  uses: greengagedb/greengage-ci/.github/actions/sql-dump/fetch@v54
  with:
    version: 6
    target_os: ubuntu
    target_os_version: 24.04

- name: Run test
  run: |
    ./run-test.sh "${{ steps.sql-dump.outputs.sql_dump }}"
```
