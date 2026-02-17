# Maximize Disk Space Action

Frees up disk space on GitHub Actions runners by removing unused tools and relocating Docker storage.

## Usage

```yaml
- name: Maximize disk space
  uses: greengagedb/greengage-ci/.github/actions/maximize-disk-space@main # Strongly recommended use current caller workflow tag!
```

**Recommendation:** Use the current caller workflow tag for stability.

## Actual version

- `greengagedb/greengage-ci/.github/actions/maximize-disk-space/action.yml@v19`

## What it does

1. **Reports initial disk usage** - Shows space on `/` and `/mnt` before cleanup
2. **Moves Docker storage** - Relocates Docker to `/mnt/docker` (uses `mv-docker` action)
3. **Removes unused tools** - Deletes:
   - Java VMs (`/usr/lib/jvm`)
   - Haskell toolchain (`/usr/local/.ghcup`)
   - Android SDK (`/usr/local/lib/android`)
   - PowerShell (`/usr/local/share/powershell`)
   - .NET SDK (`/usr/share/dotnet`)
   - Swift (`/usr/share/swift`)
4. **Reports final disk usage** - Shows space after cleanup
