require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-tanstack-hotkeys"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.source       = { :git => package["repository"]["url"], :tag => "v#{s.version}" }

  # iOS covers iPadOS and Mac Catalyst; macOS is react-native-macos
  s.ios.deployment_target = "13.4"
  s.osx.deployment_target = "10.15"
  s.visionos.deployment_target = "1.0"
  s.ios.frameworks = "UIKit"
  s.osx.frameworks = "AppKit"

  s.source_files = "ios/**/*.{h,m}"

  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
