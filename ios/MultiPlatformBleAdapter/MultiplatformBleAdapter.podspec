Pod::Spec.new do |spec|
  spec.name         = "MultiplatformBleAdapter"
  spec.version      = "0.2.0"
  spec.summary      = "An adapter for RxBluetoothKit that exposes consist API to crossplatform libraries"

  spec.description  = <<-DESC
  An adapter for RxBluetoothKit that exposes consist API to crossplatform libraries 
                  DESC

  spec.homepage     = "https://github.com/Polidea/MultiPlatformBleAdapter"
  spec.license      = "Apache License, Version 2.0."
  spec.author             = { "Michał Tuszyński" => "srgtuszy@gmail.com", "Kamil Natonek" => "kamil.natonek@withintent.com" }
  spec.social_media_url   = "https://withintent.com"

  spec.platforms = { :ios => '11.0', :tvos => '11.0' }

  spec.swift_versions = ['4.0', '4.2', '5.0']
  spec.source       = { :git => "https://github.com/dotintent/MultiPlatformBleAdapter.git", :tag => "#{spec.version}" }

  spec.source_files  = "iOS/classes/**/*.{h,m,swift}", "iOS/RxBluetoothKit/**/*.{h,m,swift}", "iOS/RxSwift/**/*.{h,m,swift}"
  spec.exclude_files = 'android/**/*'

  spec.frameworks   = 'CoreBluetooth'

  spec.requires_arc = true

end
