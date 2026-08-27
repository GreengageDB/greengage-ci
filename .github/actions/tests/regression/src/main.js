import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function run() {
  try {
    const image = core.getInput('image', { required: true });
    const targetOs = core.getInput('target_os', { required: true });
    const targetOsVersion = core.getInput('target_os_version') || '';
    const optimizer = core.getInput('optimizer', { required: true });
    const dumpDb = core.getInput('dump_db') || '';
    const version = core.getInput('version') || '';

    // Save state for the post step
    core.saveState('dump_db', dumpDb);
    core.saveState('target_os', targetOs);
    core.saveState('target_os_version', targetOsVersion);
    core.saveState('version', version);
    core.saveState('container_name', 'regress');
    core.saveState('log_name', 'regression');

    // Build the make command with optimizer flag
    const optimizerFlag = optimizer === 'orca' ? 'on' : 'off';
    const makeTestCommand = `-k PGOPTIONS='-c optimizer=${optimizerFlag}' installcheck-world`;

    const dockerArgs = [
      'run',
      '--name', 'regress',
      '-e', 'CI',
      '-e', 'TEST_OS',
      '-e', 'DUMP_DB',
      '-e', 'MAKE_TEST_COMMAND',
      '--sysctl', 'kernel.sem=500 1024000 200 4096',
      image.toLowerCase(),
      '/bin/bash', '/home/gpadmin/gpdb_src/concourse/scripts/ic_gpdb.bash'
    ];

    await exec.exec('docker', dockerArgs, {
      env: {
        ...process.env,
        CI: 'true',
        TEST_OS: targetOs,
        DUMP_DB: dumpDb,
        MAKE_TEST_COMMAND: makeTestCommand,
      },
      stdio: 'inherit'
    });
  } catch (error) {
    core.setFailed(error.message);
    throw error; // Ensure post step still runs
  }
}

run();
