require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "react-native-ble-plx"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "17.0" }
  s.source       = { :git => "https://github.com/dotintent/react-native-ble-plx.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.exclude_files = ["ios/BlePlx-Bridging-Header.h", "ios/Tests/**/*", "ios/BlePlx.xcodeproj/**/*"]
  s.swift_version = "5.9"

  s.frameworks = "CoreBluetooth"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
  }

  install_modules_dependencies(s)    
end