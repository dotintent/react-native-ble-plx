var childProcess = require('child_process');

if (process.platform === 'darwin') {
  var result = childProcess.spawnSync('./build_ios_frameworks.sh', [], {
    shell: 'bash',
    stdio: 'inherit',
  });

  process.exit(result.status);
}
