# Move Docker Storage Action

Relocates Docker storage from `/var/lib/docker` to `/mnt/docker` to free up space on the root partition.

## Usage

```yaml
- name: Move Docker storage
  uses: greengagedb/greengage-ci/.github/actions/mv-docker@main # Strongly recommended use current caller workflow tag!
```

**Recommendation:** Use the current caller workflow tag for stability.

## What it does

1. **Stops Docker daemon** - Ensures safe relocation
2. **Moves Docker data** - Relocates `/var/lib/docker` → `/mnt/docker`
3. **Restarts Docker daemon** - Starts Docker with new storage location

## When to use this

**Designed for old shared runners** - with two 75GB disks (`/` and `/mnt`).

Modern runners have a single 150GB disk and don't need this action, but **it's safe to use**:

- On new runners, the move happens within the same volume (~1 second)
- Provides backward compatibility across runner generations
- Doesn't break workflows when migrating to newer runners

On old dual-disk runners, moving Docker storage:

- Frees space on `/dev/root` partition and build/use docker images on separate `/dev/sdb1`
- Prevents "no space left on device" errors during image builds
- Balances disk usage across both partitions
