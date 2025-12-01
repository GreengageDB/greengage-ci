# Upload Packages to GitHub Release

This composite GitHub Action uploads package files (e.g. `.deb`,`.ddeb`,`.rpm`)
to a GitHub release. It ensures fixed package names, creates release only if it
does not already exist, and safely uploads files with replacement if necessary.

## Inputs

| Name            | Required | Default             | Description |
|-----------------|----------|---------------------|-------------|
| `artifact_name` | no       | `deb-packages`      | Path where artifacts are downloaded |
| `package_name`  | no       | repository name     | Base package name to use for uploaded files (derived from repo name if empty) |
| `version`       | no       | empty               | Version string appended to package name (e.g., `6` makes `packagename6.deb`) |
| `extensions`    | no       | `deb ddeb`          | Space-separated list of package file extensions to process |

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
          extensions: "deb ddeb rpm"
```

**Important**: Ensure your workflow has the `contents: write` permission as
shown above.

## Behavior

* **Downloads artifacts** from a previous job into the `artifact_name` directory
* **Determines release name** from `GITHUB_REF`:
  * Uses tag name if the workflow was triggered by a tag (e.g., `v1.0.0`)
  * Uses branch name if not a tag (e.g., `main`)
* **Creates a GitHub release** only if it does not already exist
* **Renames files** to fixed naming pattern: exactly one file per extension is
  renamed to `${PACKAGE_NAME}${VERSION}.$ext`
* **Uploads files** to the release, replacing existing files with `--clobber`
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
* If a release already exists, it will not be recreated (only files will be
  uploaded)
* The action expects exactly **one file per extension** in the artifact
  directory
* Release notes include commit SHA and workflow run number for traceability
