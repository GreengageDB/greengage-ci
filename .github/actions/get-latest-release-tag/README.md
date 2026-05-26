# Get latest release tag

This action retrieves the latest release tag for the specified repository.

## Purpose

This action is intended to be used in scheduled synchronization workflows to detect newly published releases.

## Prerequisites

Configure the following repository secrets:

### Secrets

Name       | Description                                                               | Required
---------- | ------------------------------------------------------------------------- | --------
`gh_token` | GitHub token with permission to read releases from the source repository. | Yes

## Usage

```yaml
steps:
      - name: Get latest greengage release tag
        id: greengage
        uses: GreengageDB/greengage-ci/.github/actions/get-latest-release-tag@v34
        with:
          source_repo: ${{ env.GREENGAGE_REPO }}
          gh_token: ${{ github.token }}
```

## Actual version

- `GreengageDB/greengage-ci/.github/actions/get-latest-release-tag@v34`

### Inputs

Name          | Description                                                              | Required | Type   | Default
------------- | ------------------------------------------------------------------------ | -------- | ------ | -------
`source_repo` | Source GitHub repository (org/repo) (e.g., `GreengageDB/greengage`)      | Yes      | String | -
`gh_token`    | GitHub token with permission to read releases from the source repository | Yes      | String | -

### Outputs

Name  | Description
----- | ----------------------
`tag` | the latest release tag
