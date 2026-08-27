import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as glob from '@actions/glob';
import { DefaultArtifactClient } from '@actions/artifact';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function post() {
  try {
    // Restore state from main step
    const containerName = core.getState('container_name') || 'regress';
    const targetOs = core.getState('target_os');
    const targetOsVersion = core.getState('target_os_version');
    const dumpDb = core.getState('dump_db');
    const version = core.getState('version');
    const logName = core.getState('log_name') || 'regression';

    // 1. Collect logs via docker cp
    await collectLogs(containerName, logName);

    // 2. Collect SQL dump if requested
    if (dumpDb) {
      const artifactId = await collectSqlDump(containerName, targetOs, targetOsVersion, version);
      if (artifactId) {
        core.setOutput('artifact-id', artifactId);
      }
    }
  } catch (error) {
    core.setFailed(`Post step failed: ${error.message}`);
  }
}

/**
 Collect logs using docker cp, based on the original collect-logs action parameters.
*/
async function collectLogs(containerName, logName) {
  const logDir = 'logs';
  await io.mkdirP(logDir);

  // Verify that the container exists (even if exited)
  let workdir = '/';
  try {
    const { stdout } = await exec.getExecOutput('docker', ['inspect', '--format', '{{.Config.WorkingDir}}', containerName]);
    if (stdout.trim()) workdir = stdout.trim();
  } catch {
    core.warning(`Container "${containerName}" not found – skipping log collection.`);
    return;
  }

  // Log search parameters (identical to the original composite action)
  const params = [
    { path: 'gpAdminLogs', type: 'd', name: 'gpAdminLogs' },
    { path: 'gpdb_src/src/test', type: 'd', name: 'results' },
    { path: 'gpdb_src/src/test', type: 'f', name: 'regression.diffs' },
    { path: 'gpdb_src/gpAux/gpdemo/datadirs', type: 'd', name: 'log' },
    { path: 'gpdb_src/gpAux/gpdemo/datadirs', type: 'd', name: 'pg_log' }
  ];

  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'logs-'));

  try {
    for (const param of params) {
      const src = path.posix.join(workdir, param.path);
      const dst = path.join(tmpdir, src);
      await io.mkdirP(path.dirname(dst));

      // Copy from container using docker cp (ignores missing paths)
      try {
        await exec.exec('docker', ['cp', `${containerName}:${src}`, path.dirname(dst)]);
      } catch {
        continue; // path does not exist in container
      }

      // Glob for matching files/directories
      const pattern = param.type === 'd' ? `${dst}/**/${param.name}` : `${dst}/**/${param.name}`;
      const globber = await glob.create(pattern);
      const files = await globber.glob();

      if (files.length === 0) continue;

      // Sanitize archive name
      const safeSuffix = param.name.replace(/["\\:<>|*?\r\n]/g, '').replace(/^\.+/, '').replace(/\.+$/, '');
      const archivePath = path.join(logDir, `${logName}_${safeSuffix}.tar`);

      for (const file of files) {
        await exec.exec('tar', [
          '--absolute-names',
          '-rvf', archivePath,
          '--transform', `s|^${tmpdir}||`,
          '-C', '/', file
        ]);
      }
    }
  } finally {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  }

  // Upload logs artifact using @actions/artifact v6 API
  const artifactClient = new DefaultArtifactClient();
  try {
    await artifactClient.uploadArtifact(logName, [logDir], logDir);
  } catch (e) {
    core.warning(`Failed to upload logs artifact: ${e.message}`);
  }
}

/**
 Collect and upload the SQL dump if the dump_db flag was set.
 Returns the artifact ID, or null if not collected.
*/
async function collectSqlDump(containerName, targetOs, targetOsVersion, version) {
  const dumpFile = 'dump.sql';
  const tarFile = `${targetOs}${targetOsVersion || ''}_postgres_sqldump.tar`;

  try {
    await exec.exec('docker', ['cp', `${containerName}:/home/gpadmin/sqldump/dump.sql`, dumpFile]);
  } catch (e) {
    core.warning(`Could not copy SQL dump: ${e.message}`);
    return null;
  }

  await exec.exec('tar', ['-rf', tarFile, dumpFile]);
  fs.unlinkSync(dumpFile);

  const artifactName = `sqldump_ggdb${version || ''}_${targetOs}${targetOsVersion || ''}`;
  const artifactClient = new DefaultArtifactClient();
  
  try {
    // v6 API returns { id, size } instead of { artifactId }
    const uploadResult = await artifactClient.uploadArtifact(artifactName, [tarFile], '.');
    return uploadResult?.id || null;
  } catch (e) {
    core.warning(`Failed to upload SQL dump: ${e.message}`);
    return null;
  }
}

post();
