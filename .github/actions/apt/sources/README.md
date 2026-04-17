# apt/sources

Composite action. Generates `apt/sources.list` with Azure Ubuntu mirrors.

## Inputs

| Input        | Required | Default | Description                     |
|--------------|----------|---------|---------------------------------|
| `os_version` | yes      | —       | Ubuntu version (`22.04`, `24.04`) |

## Usage

```yaml
- uses: ./.github/actions/apt/sources
  with:
    os_version: '22.04'
```

## Output

Creates `apt/sources.list` with `main`, `restricted`, `universe`, `multiverse` components
for `release`, `updates`, `backports`, and `security` pockets.
