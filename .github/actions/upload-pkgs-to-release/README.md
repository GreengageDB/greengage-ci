# Upload Packages to GitHub Release

This composite GitHub Action uploads package files (e.g., `.deb`, `.ddeb`, `.rpm`)
to a GitHub release. It ensures fixed package names, creates a release only if it
does not already exist, and safely uploads files with replacement if necessary.

## Inputs

| Name           | Required | Default        | Description |
|----------------|----------|----------------|-------------|
| `ghcr_token`   | yes      | —              | Token with repository permissions (GITHUB_TOKEN or personal token) |
| `artifact_path`| no       | `deb-packages` | Path where artifacts are downloaded |
| `package_name` | no       | repository name| Base package name to use for uploaded files |
| `version`      | no       | empty          | Version string appended to package name |
| `extensions`   | no       | `deb ddeb`     | Space-separated list of package file extensions |

## Usage

```yaml
jobs:
  upload-pkgs-to-release:
    if: startsWith(github.ref, 'refs/tags/')
    needs: [build-deb, test-docker]
    runs-on: ubuntu-latest
    steps:
      - name: Upload packages
        uses: greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release@main
        with:
          ghcr_token: ${{ secrets.GHCR_TOKEN }}
          package_name: greengage
          version: 6
          extensions: "deb ddeb rpm"
```

## Behavior

* Downloads artifacts from a previous job into `artifact_path`
* Determines the release name from `GITHUB_REF`:
  * Uses tag name if the workflow was triggered by a tag
  * Uses branch name if not a tag
* Creates a GitHub release only if it does not already exist
* Moves exactly one file per extension to a fixed name `${PACKAGE_NAME}${VERSION}.$ext`
* Uploads files to the release, replacing existing files with `--clobber`
* Supports multiple file extensions (e.g., `.deb`, `.ddeb`, `.rpm`)
