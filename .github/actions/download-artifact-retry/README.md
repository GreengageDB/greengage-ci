# Download Artifact with Retry Action

Downloads a workflow artifact and retries once if the first attempt fails.

## Usage

```yaml
- name: Download deb artifact
  uses: greengagedb/greengage-ci/.github/actions/download-artifact-retry@v65
  with:
    name: 'Package-ubuntu22.04'   # REQUIRED
    path: 'deb-packages'          # Optional (default: .)
    retry-delay: '10'             # Optional (default)
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/download-artifact-retry/action.yml@v65`

## Inputs

Input         | Description                                  | Required | Default
------------- | -------------------------------------------- | -------- | -------
`name`        | Name of the artifact to download             | Yes      | -
`path`        | Destination path                             | No       | `.`
`retry-delay` | Seconds to wait before the retry             | No       | `10`

## What it does

1. **Download artifact** — runs `actions/download-artifact` with `continue-on-error: true`
2. **Wait** (only if step 1 failed) — pauses for `retry-delay` seconds
3. **Retry download** (only if step 1 failed) — runs `actions/download-artifact` again;
   if this attempt fails, the step fails

## Design rationale

Right after `upload-artifact`, GitHub can take a moment to list the new artifact.
If a later step downloads it too early, `download-artifact` reports that the artifact
does not exist, although the upload was successful. This is a timing problem (race condition)
on the GitHub side, and it is more frequent when GitHub is under high load.

The action retries the download once after a short pause. The retry is not repeated,
so a truly missing artifact is not hidden: if the second attempt also fails, the step fails.

The first attempt uses `continue-on-error: true`, so the failed first attempt appears
in the job log as a warning and does not stop the job.
