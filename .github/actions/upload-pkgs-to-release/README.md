# Upload Packages to GitHub Release

This composite GitHub Action uploads package files (e.g. `.deb`,`.ddeb`,`.rpm`)
to an existing GitHub release. It ensures fixed package names, optionally creates
releases, and safely uploads files with replacement if necessary.

## Inputs

| Name            | Required | Default         | Description |
|-----------------|----------|-----------------|-------------|
| `artifact_name` | no       | `Packages`      | Artifact name to download from previous jobs |
| `package_name`  | no       | repository name | Base package name for uploaded files (derived from repo name if empty) |
| `release_name`  | no       | current tag     | Target release name (defaults to tag from `GITHUB_REF`) |
| `version`       | no       | empty           | Version string appended to package name (e.g., `6` makes `packagename6.deb`) |
| `extensions`    | no       | `deb ddeb rpm`  | Space-separated list of package file extensions to process |
| `create_force`  | no       | empty           | Set to force release creation if it doesn't exist |

## Usage

```yaml
jobs:
  upload-pkgs-to-release:
    if: startsWith(github.ref, 'refs/tags/')
    needs: [build-deb, test-docker]
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Required for creating/updating releases
    steps:
      - name: Upload packages
        uses: greengagedb/greengage-ci/.github/actions/upload-pkgs-to-release@main
        with:
          package_name: greengage
          version: 6
          extensions: "deb ddeb"
```

**Important**: Ensure your workflow has the `contents: write` permission as
shown above.

## Behavior

* **Downloads artifacts** from a previous job into the `artifact_name` directory
* **Determines release name** from `GITHUB_REF` tag or `release_name` input
* **Creates a GitHub release** only if `create_force` is set and release doesn't exist
* **Checks release existence** before attempting upload
* **Renames files** to fixed naming pattern: exactly one file per extension is
  renamed to `${PACKAGE_NAME}${VERSION}.$ext`
* **Uploads files** to the release only if it exists, replacing existing files with `--clobber`
* **Supports multiple file extensions** (e.g., `.deb`, `.ddeb`, `.rpm`)

## Example Result

For a repository named `myapp`, with `package_name: myapp` and `version: 1.2`,
the uploaded files will be named:

* `myapp1.2.deb`
* `myapp1.2.ddeb`
* `myapp1.2.rpm`

## Notes

* The action uses the GitHub CLI (`gh`) internally, which authenticates
  automatically using `github.token`
* By default, the action **does not create releases** - they must exist beforehand
* Set `create_force: true` to enable automatic release creation
* The upload step **skips automatically** if the target release doesn't exist
* The action expects exactly **one file per extension** in the artifact directory
* Release notes include commit SHA and workflow run number for traceability
* Works with both tag push events and release events (where `GITHUB_REF` contains the tag)
