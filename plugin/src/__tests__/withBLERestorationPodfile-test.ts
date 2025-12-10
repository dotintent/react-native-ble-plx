import { injectRestorationPodLine } from '../withBLERestorationPodfile'

const SAMPLE_PODFILE = `require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '13.0'

target 'AwesomeApp' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath]
  )

  target 'AwesomeAppTests' do
    inherit! :complete
  end
end

post_install do |installer|
  react_native_post_install(installer)
end
`

describe('withBLERestorationPodfile', () => {
  it('injects the Restoration subspec pod line before post_install', () => {
    const result = injectRestorationPodLine(SAMPLE_PODFILE, 'react-native-ble-plx')

    expect(result).toContain("pod 'react-native-ble-plx/Restoration', :path => File.join(File.dirname(__FILE__), '../node_modules/react-native-ble-plx')")
    const insertionIndex = result.indexOf("pod 'react-native-ble-plx/Restoration'")
    const postInstallIndex = result.indexOf('post_install')
    expect(insertionIndex).toBeGreaterThan(0)
    expect(insertionIndex).toBeLessThan(postInstallIndex)
  })

  it('strips npm scope for pod name', () => {
    const result = injectRestorationPodLine(SAMPLE_PODFILE, '@scope/react-native-ble-plx')
    expect(result).toContain("pod 'react-native-ble-plx/Restoration', :path => File.join(File.dirname(__FILE__), '../node_modules/@scope/react-native-ble-plx')")
  })

  it('is idempotent', () => {
    const initial = injectRestorationPodLine(SAMPLE_PODFILE, 'react-native-ble-plx')
    const again = injectRestorationPodLine(initial, 'react-native-ble-plx')
    expect(again.match(/react-native-ble-plx\/Restoration/g)?.length).toBe(1)
  })
})
jest.mock('expo/config', () => ({
  getNameFromConfig: () => ({ appName: 'App', webName: 'App' }),
  getConfig: () => ({ exp: { name: 'App', slug: 'app', web: {}, ios: {}, android: {} } })
}))
