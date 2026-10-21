# Fetch SQL Dump Action

Fetches a SQL dump artifact from a previous successful `Greengage SQL Dump`
workflow run and extracts it on the runner.

## Usage

```yaml
- name: Fetch SQL dump
  id: sql-dump
  uses: greengagedb/greengage-ci/.github/actions/sql-dump/fetch@v62
  with:
    version: '6'
    target_os: ubuntu
    target_os_version: '24.04'
```

The extracted dump file is available through the `sql_dump` output:

```yaml
- name: Use SQL dump
  run: psql ... < "${{ steps.sql-dump.outputs.sql_dump }}"
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/sql-dump/fetch/action.yml@v62`

## Inputs

Input | Description | Required | Default
--- | --- | --- | ---
`version` | Greengage version (e.g. 6, 7, 8) | Yes | -
`target_os` | Target OS | No | `ubuntu`
`target_os_version` | Target OS version | No | `24.04`
`repo` | Repository containing the SQL dump workflow | No | `GreengageDB/greengage`
`workflow` | Workflow name to search | No | `Greengage SQL Dump`
`artifact_prefix` | Prefix of the SQL dump artifact name | No | `sqldump_ggdb`
`archive_suffix` | Suffix of the SQL dump archive name | No | `_postgres_sqldump`

The target OS name is formed from `target_os` and `target_os_version`. Version
`22.04` is omitted to preserve the existing Ubuntu 22.04 naming convention.

For example:

```text
ubuntu + ''     → ubuntu
ubuntu + 22.04  → ubuntu
ubuntu + 24.04  → ubuntu24.04
```

The resulting OS name is used to construct both the artifact and archive names.

## What it does

1. **Find workflow runs** - Finds up to 100 completed successful runs of the
   configured workflow
2. **Find artifact** - Checks the runs until the requested SQL dump artifact
   is found
3. **Download artifact** - Downloads the matching artifact to the runner
4. **Extract dump** - Extracts the SQL dump archive
5. **Set output** - Sets `sql_dump` to the path of the extracted dump file
6. **Remove archive** - Removes the downloaded archive after extraction

## When to use this

**Use in CI workflows that require a pre-generated SQL dump** - This action
reuses a dump produced by the `Greengage SQL Dump` workflow instead of
generating it again in the current workflow.

It is particularly useful for tests such as `gpexpand` that require a
prepared SQL dump but do not need to generate one themselves.

The action can fetch artifacts from another repository in the GreengageDB
organization. By default, it searches `GreengageDB/greengage`.

## Design rationale

SQL dump generation is separated from workflows that consume the dump. The
`Greengage SQL Dump` workflow generates the dump and stores it as an artifact.
Consumer workflows use this action to find and reuse that artifact.

The action uses the `GITHUB_TOKEN` of the calling workflow:

```yaml
GH_TOKEN: ${{ github.token }}
```

The GreengageDB organization allows this token to read Actions artifacts from
other repositories in the organization. Therefore, the action does not
require a PAT when called from repositories covered by this organization-level
setting.

The `repo` and `workflow` inputs make the source configurable while keeping
`GreengageDB/greengage` and `Greengage SQL Dump` as the defaults.
