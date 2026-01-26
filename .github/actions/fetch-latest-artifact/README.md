# Fetch Latest Artifact from Branch

This composite GitHub Action retrieves the most recent artifact from a specified branch's successful workflow run. It supports both full artifact download and selective extraction of specific files or directories.

## Core Functionality

The action performs the following operations:

1. **Locate Latest Successful Run**
   - Queries GitHub API for the most recent successful workflow run in the specified branch
   - Ensures artifact availability by verifying workflow completion status

2. **Download Artifact**
   - Retrieves the named artifact from the identified workflow run
   - Downloads to the current working directory

3. **Optional Selective Extraction**
   - Extracts only specified file or directory if `extract_path` is provided
   - Removes remaining artifact contents, keeping workspace clean

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `branch` | yes | - | Branch to search for artifacts |
| `artifact_name` | yes | - | Name of the artifact to download |
| `extract_path` | no | empty | Specific file or directory to extract from artifact (extracts all if not specified) |

## Key Features

- **Branch-Specific Search**: Targets artifacts from specific branches (main, release branches, feature branches)
- **Latest Run Selection**: Automatically finds the most recent successful workflow run
- **Selective Extraction**: Optionally extract only needed files/directories from large artifacts
- **Clean Workspace**: Removes unwanted artifact contents when using selective extraction
- **Error Handling**: Clear error messages for missing runs or extraction paths

## Usage Examples

### Full Artifact Download

```yaml
- name: Download regression dump
  uses: greengagedb/greengage-ci/.github/actions/fetch-latest-artifact@main
  with:
    branch: main
    artifact_name: regression_ggdb6_ubuntu_optimizer_postgres
```

After execution, the entire artifact contents are available in the current directory.

### Selective File Extraction

```yaml
- name: Extract database dump only
  uses: greengagedb/greengage-ci/.github/actions/fetch-latest-artifact@main
  with:
    branch: 7.x
    artifact_name: regression_ggdb7_ubuntu_optimizer_postgres
    extract_path: sqldump
```

After execution, only the `sqldump` directory is available in the current directory.

### Matrix-Based Multi-Version Download

```yaml
jobs:
  behav-tests:
    strategy:
      matrix:
        include:
          - version: 6
            branch: main
            artifact: regression_ggdb6_ubuntu_optimizer_postgres
          - version: 7
            branch: 7.x
            artifact: regression_ggdb7_ubuntu22_optimizer_postgres
    steps:
      - name: Fetch dump for version ${{ matrix.version }}
        if: inputs.create_force != ''
        uses: greengagedb/greengage-ci/.github/actions/fetch-latest-artifact@main
        with:
          branch: ${{ matrix.branch }}
          artifact_name: ${{ matrix.artifact }}
          extract_path: sqldump/dump.sql
```

## How It Works

### 1. Workflow Run Discovery

The action uses GitHub API to find the latest successful workflow run:

```bash
gh api "/repos/${REPO}/actions/runs" \
  -f branch="${BRANCH}" \
  -f status=success \
  -f per_page=1 \
  --jq '.workflow_runs[0].id'
```

This query:

- Filters runs by branch name
- Only considers successful runs
- Returns the most recent run ID

### 2. Artifact Download

Uses GitHub CLI to download the artifact:

```bash
gh run download "${RUN_ID}" \
  --name "${ARTIFACT_NAME}" \
  --repo "${REPO}"
```

### 3. Selective Extraction (Optional)

When `extract_path` is specified:

1. Verifies the path exists in the downloaded artifact
2. Moves the specified path to a temporary directory
3. Removes all other artifact contents
4. Moves extracted content back to current directory

## Error Handling

| Scenario | Action | Recovery |
|----------|--------|----------|
| No successful runs in branch | Exit with error | Verify branch name and ensure at least one successful run exists |
| Artifact not found in run | Exit with error | Check artifact name spelling and verify artifact was uploaded |
| Extract path not found | Exit with error | Verify path exists in artifact structure |

## Requirements

### Permissions

The action requires the following permissions:

```yaml
permissions:
  actions: read  # Required to query workflow runs and download artifacts
```

### Token

Uses `github.token` which is automatically available in GitHub Actions workflows. No additional token configuration needed for public repositories.

## Technical Implementation

- **GitHub CLI**: Leverages `gh` CLI for reliable API interactions
- **Error Handling**: Uses `set -euo pipefail` for strict error propagation
- **Path Safety**: Validates extraction paths before processing
- **Workspace Management**: Temporary directories for safe file operations

## Notes

- **Artifact Retention**: Respects GitHub's artifact retention policies (default 90 days)
- **Cross-Branch Access**: Can access artifacts from any branch in the same repository
- **Workflow Independence**: Works with artifacts from any workflow that uploaded them
- **Download Location**: Always downloads to current working directory (`$GITHUB_WORKSPACE` or custom `working-directory`)

## Common Use Cases

1. **Regression Test Data**: Download database dumps generated by previous test runs
2. **Build Artifacts**: Retrieve compiled binaries from specific branches
3. **Test Reports**: Fetch test results from integration test runs
4. **Configuration Files**: Download generated configuration from setup workflows
5. **Cross-Workflow Dependencies**: Share data between separate workflow runs
