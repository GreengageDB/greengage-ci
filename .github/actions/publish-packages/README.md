# Publish packages to S3 action

This action publishes GreengageDB/pxf and GreengageDB/greengage packages to an S3-backed repository.

## Purpose

This action is intended to be used in a scheduled workflow. It checks for new releases in GreengageDB/pxf and GreengageDB/greengage and uploads newly built packages to an S3-backed repository.

## Prerequisites

Configure the following repository secrets:

### Secrets

Name                    | Description                                                                                                | Required
----------------------- | ---------------------------------------------------------------------------------------------------------- | --------
`gh_token`              | GitHub token with permission to read Actions artifacts and repository contents from the source repository. | Yes
`ghcr_login`            | GitHub login for GHCR access                                                                               | Yes
`ghcr_password`         | GitHub Personal Access Token (PAT) for GHCR access                                                         | Yes
`aws_endpoint_url`      | S3 bucket endpoint URL                                                                                     | Yes
`aws_access_key_id`     | S3 bucket access key ID                                                                                    | Yes
`aws_secret_access_key` | S3 bucket secret access key                                                                                | Yes
`gpg_private_key`       | GPG private key to sign repository                                                                         | Yes

## Usage

```yaml
env:
    GREENGAGE_REPO: GreengageDB/greengage

  jobs:
    publish-greengage:
      needs: check-releases
      if: needs.check-releases.outputs.greengage_tag != ''
      runs-on: ubuntu-24.04

      steps:
        - name: Publish Greengage ${{ needs.check-releases.outputs.greengage_tag }}
          uses: GreengageDB/greengage-ci/.github/actions/publish-packages@v34
          with:
            source_repo:           ${{ env.GREENGAGE_REPO }}
            release_tag:           ${{ needs.check-releases.outputs.greengage_tag }}
            ci_workflow:           'Greengage CI'
            artifact_name:         'deb-packages'
            s3_prefix:             'ubuntu/22.04/x86_64'
            gh_token:              ${{ github.token }}
            aws_bucket:            ${{ secrets.BUCKET }}
            aws_access_key_id:     ${{ secrets.AWS_ACCESS_KEY_ID }}
            aws_secret_access_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            ghcr_login:            ${{ secrets.GHCR_LOGIN }}
            ghcr_password:         ${{ secrets.GHCR_PASSWORD }}
            gpg_private_key:       ${{ secrets.GPG_PRIVATE_KEY }}
```

With optional parameters:

```yaml
env:
    GREENGAGE_REPO: GreengageDB/greengage

  jobs:
    publish-greengage:
      permissions:
        contents: read
        actions: read
      needs: check-releases
      if: needs.check-releases.outputs.greengage_tag != ''
      runs-on: ubuntu-24.04

      steps:
        - name: Publish Greengage ${{ needs.check-releases.outputs.greengage_tag }}
          uses: GreengageDB/greengage-ci/.github/actions/publish-packages@v34
          with:
            source_repo:           ${{ env.GREENGAGE_REPO }}
            release_tag:           ${{ needs.check-releases.outputs.greengage_tag }}
            ci_workflow:           'Greengage CI'
            artifact_name:         'deb-packages'
            s3_prefix:             'ubuntu/22.04/x86_64'
            repomanager_image:     'ghcr.io/<repo>/<package>:<tag>'
            apt_codename:          'jammy'
            apt_component:         'contrib'
            gh_token:              ${{ github.token }}
            aws_bucket:            ${{ secrets.BUCKET }}
            aws_endpoint_url:      ${{ secrets.AWS_ENDPOINT_URL }}
            aws_access_key_id:     ${{ secrets.AWS_ACCESS_KEY_ID }}
            aws_secret_access_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            ghcr_login:            ${{ secrets.GHCR_LOGIN }}
            ghcr_password:         ${{ secrets.GHCR_PASSWORD }}
            gpg_private_key:       ${{ secrets.GPG_PRIVATE_KEY }}
```

## Actual version

- `GreengageDB/greengage-ci/.github/actions/greengage-reusable-publish-package.yml@v34`

### Inputs

Name                    | Description                                                                                    | Required | Type   | Default
----------------------- | ---------------------------------------------------------------------------------------------- | -------- | ------ | -------------------------------------------------------
`source_repo`           | Source GitHub repository (org/repo) (e.g., `GreengageDB/greengage`)                            | Yes      | String | -
`release_tag`           | Release tag found in the previous step (e.g., `6.30.1`)                                        | Yes      | String | -
`ci_workflow`           | Workflow name in the source repo (e.g. "Greengage CI")                                         | Yes      | String | -
`artifact_name`         | Artifact name in the source repo workflow which contains packages (e.g. "deb-packages")        | Yes      | String | -
`s3_prefix`             | S3 bucket prefix for uploading packages (e.g. `ubuntu/22.04/x86_64`)                           | Yes      | String | -
`repomanager_image`     | Repomanager container image name (e.g 'ghcr.io/greengagedb/repomanager-ng-tool-x86_64:latest') | No       | String | `ghcr.io/greengagedb/repomanager-ng-tool-x86_64:latest`
`gh_token`              | GitHub token to access the source repo                                                         | Yes      | String | -
`aws_bucket`            | S3 bucket name                                                                                 | Yes      | String | -
`aws_endpoint_url`      | S3 bucket endpoint URL (e.g. `https://storage.googleapis.com`)                                 | Yes      | String | -
`aws_access_key_id`     | S3 bucket access key ID                                                                        | Yes      | String | -
`aws_secret_access_key` | S3 bucket secret access key                                                                    | Yes      | String | -
`gpg_private_key`       | GPG private key to sign repository                                                             | Yes      | String | -
`apt_codename`          | Distribution codename used in the repository path (e.g. `bookworm`,`bullseye`,`jammy`)         | No       | String | greengagedb
`apt_component`         | Repository component/section name (e.g. `main`, `contrib`)                                     | No       | String | main
`ghcr_login`            | GitHub container registry login                                                                | Yes      | String | -
`ghcr_password`         | GitHub Personal Access Token (PAT)                                                             | Yes      | String | -
`download_dir`          | Local directory for downloaded packages                                                        | No       | String | downloaded-packages

### Outputs

Name        | Description
----------- | -------------------------------------------------------
`published` | `"true"` if packages were uploaded, otherwise `"false"`

## What it does

1. Downloads artifacts with packages from the source repo workflow.
2. Checks if the packages already exist in the repository.
3. Imports the GPG private key for repository signing.
4. Uploads packages to the repository using the repomanager tool.
