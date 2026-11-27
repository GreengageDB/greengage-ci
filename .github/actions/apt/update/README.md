# APT Update

A composite action that prepares APT on a GitHub-hosted Ubuntu runner.

The action detects the cloud provider.
It sets the APT mirror of the cloud provider.
Then it updates the APT package index.

## Purpose

The standard Ubuntu mirrors `archive.ubuntu.com` and `security.ubuntu.com` are not reachable from the runner network.
The action solves this problem.
It maps the standard mirror names to a mirror that the runner can reach.
It also puts the mirror of the cloud provider first in the mirror list.

Use this action at the start of a job, before any `apt-get install` command.

## Requirements

- A Linux runner with Ubuntu.
- The tools `bash`, `curl`, `host`, `awk`, and `sudo`. GitHub-hosted runners have them.
- Access from the runner to the instance metadata service of the cloud provider.

The action was tested on GitHub-hosted runners on AWS and Azure.

## Usage

```yaml
jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - name: APT Update
        uses: GreengageDB/greengage-ci/.github/actions/apt/update@<ref>

      - name: Install packages
        run: sudo apt-get install -y <package>
```

Replace `<ref>` with a tag, a branch name, or a full commit SHA.
Use a full commit SHA to pin the version.

In the same repository, use the local path `./.github/actions/apt/update`.

## Inputs and outputs

The action has no inputs and no outputs.

## How it works

The action runs these steps in this order.

1. **Detect cloud provider.**
   The step sends requests to the instance metadata service.
   It checks AWS, Azure, and GCP in this order.
   The first match is the result.
   If no provider matches, the result is `unknown`.

2. **Fix standard APT mirror names.**
   The step resolves `azure.archive.ubuntu.com`.
   Then it adds `archive.ubuntu.com` and `security.ubuntu.com` to `/etc/hosts` with the IP address of the Azure mirror.
   This step does not depend on the cloud provider.
   The step skips if the Azure mirror is not reachable.

3. **Set cloud APT mirror.**
   The step writes the default mirrors to `/etc/apt/apt-mirrors.txt`.
   If a cloud mirror exists and is reachable, the step adds it at the top of the list with `priority:1`.
   Otherwise the default mirrors stay.

4. **APT Update.**
   The step runs `apt-get update` in non-interactive mode.

### Cloud mirrors

| Cloud provider | Cloud mirror                                       |
|----------------|----------------------------------------------------|
| AWS            | `http://<region>.ec2.archive.ubuntu.com/ubuntu/`   |
| Azure          | `http://azure.archive.ubuntu.com/ubuntu/`          |
| GCP            | None. The default mirrors stay.                    |
| Unknown        | None. The default mirrors stay.                    |

The action uses `http`, not `https`.
The mirror names in `/etc/hosts` point to an IP address that has no matching certificate.

The mirror list has this order:

| Priority | Mirror                                    |
|----------|-------------------------------------------|
| 1        | Cloud mirror (if available)               |
| 2        | `http://archive.ubuntu.com/ubuntu/`       |
| 3        | `http://security.ubuntu.com/ubuntu/`      |

## Log output

The action writes the detected cloud provider and the selected mirror to the job log.

```text
Detected cloud: aws
Cloud mirror set: http://us-east-1.ec2.archive.ubuntu.com/ubuntu/
```

The action writes one of these messages when it keeps the default mirrors:

```text
No cloud mirror for: gcp. Keep the default mirrors.
Cloud mirror is not reachable: http://azure.archive.ubuntu.com/ubuntu/
Azure mirror is not reachable. Skip hosts fix.
```

## Security

The action does not print metadata tokens to the log.
The AWS token is only in a shell variable.
The token expires after 60 seconds.

## Limits

- The action works on Linux runners with Ubuntu only.
- Run the action one time in each job.
  Each run adds the host lines to `/etc/hosts` again.
- GCP is detected, but the action sets no cloud mirror for it.

## Tests

The workflow `.github/workflows/check-action-apt-update.yml` tests the action.
It runs when a pull request changes the action or the workflow.
The workflow runs the action on a runner.
The workflow fails if the action fails.
