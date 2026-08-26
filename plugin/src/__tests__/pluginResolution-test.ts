describe('config plugin package resolution', () => {
  it('loads without a direct @expo/config-plugins dependency', () => {
    jest.resetModules()
    jest.doMock('expo/config-plugins', () => ({
      AndroidConfig: {
        Permissions: {
          withPermissions: (config: unknown) => config
        }
      },
      WarningAggregator: {
        addWarningIOS: jest.fn()
      },
      createRunOncePlugin: (plugin: unknown) => plugin,
      withAndroidManifest: (config: unknown) => config,
      withInfoPlist: (config: unknown) => config
    }))
    jest.doMock('@expo/config-plugins', () => {
      throw new Error('The plugin must resolve config APIs through expo/config-plugins')
    })

    let plugin: ((config: Record<string, unknown>) => Record<string, unknown>) | undefined

    jest.isolateModules(() => {
      plugin = require('../withBLE').default
    })

    const config = { name: 'test', slug: 'test' }
    expect(plugin?.(config)).toBe(config)
  })

  it('declares Expo as an optional peer dependency', () => {
    const packageJson = require('../../../package.json') as {
      peerDependencies?: Record<string, string>
      peerDependenciesMeta?: Record<string, { optional?: boolean }>
    }

    expect(packageJson.peerDependencies?.expo).toBe('>=51.0.0')
    expect(packageJson.peerDependenciesMeta?.expo?.optional).toBe(true)
  })
})
