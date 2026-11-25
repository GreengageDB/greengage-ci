# Download Artifact with Retry Action

Downloads workflow artifact(s) and retries once if the first attempt fails.

## Usage

Download one artifact by name:

```yaml
- name: Download deb artifact
  uses: greengagedb/greengage-ci/.github/actions/download-artifact-retry@CI-6618
  with:
    name: 'Package-ubuntu22.04'   # REQUIRED (or pattern)
    path: 'deb-packages'          # Optional (default: .)
    retry-delay: '10'             # Optional (default)
```

Download several artifacts by pattern:

```yaml
- name: Download feature artifacts
  uses: greengagedb/greengage-ci/.github/actions/download-artifact-retry@CI-6618
  with:
    pattern: 'behave_*_results'   # REQUIRED (or name)
    merge-multiple: 'true'        # Optional (default: false)
    path: 'artifacts'             # Optional (default: .)
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/download-artifact-retry/action.yml@CI-6618`

## Inputs

Input            | Description                                                | Required | Default
---------------- | ---------------------------------------------------------- | -------- | -------
`name`           | Name of the artifact to download                           | No*      | `''`
`pattern`        | Glob pattern of artifact names (used instead of `name`)    | No*      | `''`
`merge-multiple` | Merge all matched artifacts into one directory             | No       | `false`
`path`           | Destination path                                           | No       | `.`
`retry-delay`    | Seconds to wait before the retry                           | No       | `10`

\* Set `name` or `pattern`. If both are empty, the action downloads all artifacts of the run.

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

The first attempt uses `continue-on-error: true`, so the failed first attempt does not
stop the job.

## Limitations

The retry works when `name` is used: `download-artifact` fails if the named artifact
is not found. With `pattern`, a missing match is not an error. The action downloads
zero artifacts and succeeds, so the retry is not triggered. Use `pattern` only when the
artifacts were uploaded by earlier jobs (`needs`), where the delay is not a problem.
