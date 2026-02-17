# Greengage Reusable Resource Groups Tests Workflow

This workflow runs resource groups test suites for the Greengage project using QEMU virtualization. It is designed to be called from a parent CI pipeline, enabling users to execute automated resource groups tests with flexible version and operating system configurations.

## Actual version

- `greengagedb/greengage-ci/.github/workflows/greengage-reusable-tests-resgroup.yml@v22`

## Purpose

The workflow executes resource groups tests using a Docker image built for the given Greengage version and target operating system. It runs tests for different optimizers (ORCA and Postgres) depending on the Greengage version:

- **Greengage v7**: Tests both `orca` and `postgres` optimizers
- **Greengage v6**: Tests only `postgres` optimizer

The workflow generates test artifacts and uploads them to GitHub Actions artifacts for analysis.

## Version Support

- **Greengage v7**: Fully supported with this new QEMU-based workflow
- **Greengage v6**: Use the legacy Lima-based workflow instead (v3). NOT WORKING with this workflow

> **Note**: This workflow is optimized for Greengage v7. For Greengage v6 testing, please use the previous Lima-based workflow implementation (v3).

## Technical Implementation

The workflow uses QEMU virtualization with the following features:

- Ubuntu 22.04 cloud image as the base VM
- KVM acceleration for improved performance
- VirtIO 9p filesystem sharing for host-guest communication
- Cloud-init for automated VM setup
- Docker container execution within the VM
- Cgroups v1 support for resource group testing

## Usage

To integrate this workflow into your pipeline:

1. Add a job in your parent workflow that calls this reusable workflow
2. Provide the required and optional inputs as described below
3. Ensure the necessary permissions and secrets are configured

### Inputs

| Name                | Description                                      | Required | Type   | Default |
|---------------------|--------------------------------------------------|----------|--------|---------|
| `version`           | Greengage version (e.g., `6` or `7`)             | Yes      | String | -       |
| `target_os`         | Target operating system (e.g., `ubuntu`, `centos`, `rockylinux`) | Yes | String | - |
| `target_os_version` | Target OS version (e.g., `22`, `7`, `8`)         | No       | String | `''`    |
| `python3`           | Python3 build argument (ignored)                 | No       | String | `''`    |

### Secrets

| Name          | Description                         | Required |
|---------------|-------------------------------------|----------|
| `ghcr_token`  | GitHub token for GHCR access        | Yes      |

### Requirements

- **Permissions**: The job requires:
  - `contents: read` - Access repository contents
  - `packages: read` - Pull Docker images from GHCR
  - `actions: write` - Upload artifacts and manage cache
- **Secrets**: Provide a `GITHUB_TOKEN` with sufficient permissions as the `ghcr_token` secret
- **Docker Image**: Ensure a Docker image exists in GHCR matching the format `ghcr.io/<repo>/ggdb<version>_<target_os><target_os_version>:<sha>`
- **Runner Requirements**: Ubuntu runner with KVM support and sufficient resources (4 CPUs, 8GB RAM for VM)

### Environment Variables

The workflow automatically configures the following environment variables based on inputs:

- `STATEMENT_MEM`: `125MB` for v7, `250MB` for v6
- `TEST_OS`: Target operating system
- `OPTIMIZER`: `on` for ORCA, `off` for Postgres

### Examples

#### Single Job Example

```yaml
  jobs:
    resgroup-tests:
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-resgroup-tests.yml@v22
      with:
        version: 7
        target_os: ubuntu
        target_os_version: ''
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- Matrix

  ```yaml
  jobs:
    resgroup-tests:
      strategy:
        fail-fast: true
        matrix:
          target_os: [ubuntu]
      permissions:
        contents: read
        packages: read
        actions: write
      uses: greengagedb/greengage-ci/.github/workflows/greengage-reusable-resgroup-tests.yml@v22
      with:
        version: 7
        target_os: ${{ matrix.target_os }}
      secrets:
        ghcr_token: ${{ secrets.GITHUB_TOKEN }}
  ```

## Artifacts

The workflow uploads test artifacts for each optimizer configuration:

- **Artifact Name**: `resgroup_ggdb<version>_<target_os><target_os_version>_optimizer_<optimizer>`
- **Content**: Test logs and results from the VM execution
- **Retention**: 7 days
- **Path**: All files from `vm-home/logs/` directory

## Caching

The workflow implements intelligent caching to improve performance:

- **Ubuntu Cloud Image**: Cached with key `ubuntu-22.04-image`
- **Docker Images**: Cached and restored based on SHA with key `<IMAGE_NAME>_<SHA>`

## Error Handling

- **Fail-fast**: Disabled by default to allow all matrix combinations to complete
- **Exit Codes**: VM execution exit codes are properly propagated to the workflow
- **Cleanup**: Automatic QEMU process cleanup on workflow completion or failure
- **Permissions**: Automatic permission normalization for artifact collection

## Troubleshooting

### Common Issues

1. **KVM Not Available**: Ensure the runner supports KVM virtualization
2. **Insufficient Resources**: VM requires 4 CPUs and 8GB RAM
3. **Image Not Found**: Verify the Docker image exists in GHCR with the correct tag
4. **Permission Errors**: Ensure `ghcr_token` has package read permissions

### Debug Information

Check the following if tests fail:

- VM startup logs in the workflow output
- Uploaded artifact logs for detailed test execution
- QEMU process status and cleanup messages
- Docker image loading and container creation logs

## Migration from Lima

If migrating from the Lima-based workflow:

- Update workflow calls to use this new reusable workflow
- Verify input parameter compatibility
- Update artifact processing if needed
- **Ensure your test script writes exit codes to `.exitcode` file** checked by the pipeline
- **Verify the directory containing this file is properly mounted to the VM** (see workflow code)
- Test thoroughly with your specific configurations

### Exit Code Requirements

Your test script must write the exit code to a `.exitcode` file that the workflow can access:

```bash
echo ${EXIT_CODE:-1} > /logs/.exitcode
exit $EXIT_CODE
```

In this example, the `logs` directory in Docker is properly mounted to the VM's `$PWD/logs` directory, which is shared with the host system via VirtIO 9p filesystem.

For Greengage v6 projects, continue using the Lima-based workflow until migration is complete.

## Notes

- The workflow automatically extracts the test script from the Docker image instead of using Git checkout
- Cloud-init is used for automated VM provisioning and test execution
- The VM automatically shuts down after test completion
- All test execution happens within the isolated VM environment
- VirtIO drivers are used for optimal I/O performance
