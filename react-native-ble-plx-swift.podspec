require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = "react-native-ble-plx-swift"
  s.version      = package['version']
  s.summary      = "React Native Bluetooth Low Energy library - Swift static library"

  s.authors      = { "Przemysław Lenart" => "przemek.lenart@gmail.com" }
  s.homepage     = "https://github.com/Polidea/react-native-ble-plx#readme"
  s.license      = "Apache License 2.0"
  s.platform     = :ios, "8.0"

  s.source       = { :git => "https://github.com/Polidea/react-native-ble-plx.git" }
  s.source_files  = "ios/**/*.{swift}"
  s.pod_target_xcconfig = { 'SWIFT_VERSION' => '4.1' }
end