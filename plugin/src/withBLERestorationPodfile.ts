import { withPodfile, type ConfigPlugin } from '@expo/config-plugins'

// NPM package may be scoped (@scope/pkg) but the CocoaPods spec name is unscoped (pkg).
const toPodName = (pkgName: string) => pkgName.includes('/') ? pkgName.split('/').pop()! : pkgName

// Extract the path used for the existing react-native-ble-plx pod from the Podfile
// This handles monorepos where the path might be '../../../node_modules/...' instead of '../node_modules/...'
function extractExistingPath(podfile: string): string | null {
  // Match patterns like:
  //   pod 'react-native-ble-plx', :path => "../../../node_modules/react-native-ble-plx"
  //   pod 'react-native-ble-plx', :path => File.join(...)
  const patterns = [
    // Direct string path: :path => "..."
    /pod\s+['"]react-native-ble-plx['"]\s*,\s*:path\s*=>\s*["']([^"']+)["']/,
    // File.join pattern: :path => File.join(File.dirname(__FILE__), '...')
    /pod\s+['"]react-native-ble-plx['"]\s*,\s*:path\s*=>\s*File\.join\([^,]+,\s*["']([^"']+)["']\)/
  ]

  for (const pattern of patterns) {
    const match = podfile.match(pattern)
    if (match && match[1]) {
      console.log('[BLEPLX_PODFILE] Found existing path:', match[1])
      return match[1]
    }
  }

  return null
}

// Pure helper for easier testing
export function injectRestorationPodLine(podfile: string, pkgName: string): string {
  console.log('[BLEPLX_PODFILE] injectRestorationPodLine called')
  console.log('[BLEPLX_PODFILE] pkgName:', pkgName)

  const podName = toPodName(pkgName)
  console.log('[BLEPLX_PODFILE] podName (after toPodName):', podName)

  // Check for either the pod name or the full package name to avoid duplicates
  if (!podfile) {
    console.log('[BLEPLX_PODFILE] ✗ Podfile is empty/null - returning unchanged')
    return podfile
  }
  if (podfile.includes(`${podName}/Restoration`)) {
    console.log('[BLEPLX_PODFILE] ✗ Already contains', `${podName}/Restoration`, '- skipping')
    return podfile
  }
  if (podfile.includes(`${pkgName}/Restoration`)) {
    console.log('[BLEPLX_PODFILE] ✗ Already contains', `${pkgName}/Restoration`, '- skipping')
    return podfile
  }

  // Find the path used by the existing react-native-ble-plx pod
  const existingPath = extractExistingPath(podfile)
  if (!existingPath) {
    console.log('[BLEPLX_PODFILE] ✗ Could not find existing react-native-ble-plx pod path - cannot inject Restoration')
    return podfile
  }

  // Use the same path for the Restoration subspec
  const podLine = `  pod '${podName}/Restoration', :path => "${existingPath}"\n`
  console.log('[BLEPLX_PODFILE] Generated pod line:', podLine.trim())

  const marker = 'post_install do |installer|'
  const idx = podfile.indexOf(marker)

  if (idx !== -1) {
    console.log('[BLEPLX_PODFILE] ✓ Found post_install marker at index', idx, '- inserting before it')
    podfile = podfile.slice(0, idx) + podLine + '\n' + podfile.slice(idx)
  } else {
    console.log('[BLEPLX_PODFILE] ✗ No post_install marker found - appending to end')
    podfile += '\n' + podLine
  }

  console.log('[BLEPLX_PODFILE] ✓ Successfully injected Restoration pod line')
  return podfile
}

export const withBLERestorationPodfile: ConfigPlugin<{ pkgName: string }> = (config, { pkgName }) =>
  withPodfile(config, config => {
    const raw = (config.modResults as any)?.contents ?? (config.modResults as unknown as string)
    const updated = injectRestorationPodLine(raw, pkgName)

    if ((config.modResults as any)?.contents !== undefined) {
      (config.modResults as any).contents = updated
    } else {
      config.modResults = updated as any
    }

    return config
  })
