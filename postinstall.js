var childProcess = require('child_process');

if (process.platform === 'darwin') {
  childProcess.spawn('./build_ios_frameworks.sh', [], {
    shell: 'bash',
    stdio: 'inherit',
  });
}
