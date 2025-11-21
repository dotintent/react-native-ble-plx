import { withPodfile, type ConfigPlugin } from '@expo/config-plugins'

const POD_LINE_TEMPLATE = (pkgName: string) =>
  `  pod '${pkgName}/Restoration', :path => File.join(File.dirname(__FILE__), '../node_modules/${pkgName}')\n`

// Pure helper for easier testing
export function injectRestorationPodLine(podfile: string, pkgName: string): string {
  if (!podfile || podfile.includes(`${pkgName}/Restoration`)) {
    return podfile
  }

  const podLine = POD_LINE_TEMPLATE(pkgName)
  const marker = 'post_install do |installer|'
  const idx = podfile.indexOf(marker)

  if (idx !== -1) {
    podfile = podfile.slice(0, idx) + podLine + '\n' + podfile.slice(idx)
  } else {
    podfile += '\n' + podLine
  }

  return podfile.replace('../node_modules/${pkgName}', `../node_modules/${pkgName}`)
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
