var childProcess = require('child_process')

if (process.platform === 'darwin') {
  var carthageVersionProcessResult = childProcess.spawnSync('carthage', ['version'], {
    shell: 'bash',
    stdio: 'pipe'
  })

  if (carthageVersionProcessResult.status != 0) {
    // `carthage` not found (probably)
    console.warn(
      'Warning: Carthage is required to compile frameworks for iOS backend. You can install it with brew: "brew install carthage". After installation go to ./node_modules/react-native-ble-plx and run ./build_ios_frameworks.sh or reinstall node module.'
    )
    process.exit(1)
  }

  const bleClientManagerDirectory = './ios/BleClientManager'
  try {
    process.chdir(bleClientManagerDirectory)
  } catch (err) {
    console.error(`Error: ${bleClientManagerDirectory} directory not found. Cannot proceed with building the library.`)
    process.exit(1)
  }

  spawnSyncProcessAndExitOnError('carthage', ['bootstrap', '--no-build', '--platform "iOS"'])

  // check version of `carthage`
  const carthageVersionString = carthageVersionProcessResult.output[1].toString()
  const majorMinorPatch = carthageVersionString.split('.')
  const major = parseInt(majorMinorPatch[0])
  const minor = parseInt(majorMinorPatch[1])

  const buildParams = ['build', '--no-skip-current', '--platform "iOS"']
  if (major > 0 || minor > 20) {
    // --cache-builds should be available (unless version 1.x.x will remove it)
    buildParams.push('--cache-builds')
  }

  spawnSyncProcessAndExitOnError('carthage', buildParams)

  process.exit(0)
}

function spawnSyncProcessAndExitOnError(command, params) {
  const result = childProcess.spawnSync(command, params, {
    shell: 'bash',
    stdio: 'inherit'
  })

  if (result.status != 0) {
    console.error(`Error: "${command} ${params.join(' ')}"  command failed with status=${result.status}.`)
    process.exit(1)
  }
}
