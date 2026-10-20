#!/usr/bin/env bash
# Type-checks ios/TanStackHotkeys.m with clang for iOS, Mac Catalyst, and
# macOS, without Xcode. Needs SDK headers and React Native headers laid out
# as CocoaPods would (a directory containing React/, RCTDeprecation/, and for
# macOS RCTUIKit/), for example:
#
#   IOS_SDK=…/iPhoneOS16.5.sdk MAC_SDK=…/MacOSX11.3.sdk \
#   RN_HEADERS=/tmp/rnheaders RNM_HEADERS=/tmp/rnmheaders scripts/check-objc.sh
#
# On a Mac, building the example app in Xcode is the better check.
set -euo pipefail
cd "$(dirname "$0")/.."
flags=(-x objective-c -fsyntax-only -fobjc-arc -fblocks -Wall -Wextra -Werror
  -Wno-unused-parameter -Wunguarded-availability)
clang "${flags[@]}" -target arm64-apple-ios13.4 -isysroot "$IOS_SDK" \
  -I "$RN_HEADERS" ios/TanStackHotkeys.m && echo "iOS: ok"
clang "${flags[@]}" -target arm64-apple-ios14.0-macabi -isysroot "$MAC_SDK" \
  -iframework "$MAC_SDK/System/iOSSupport/System/Library/Frameworks" \
  -I "$RN_HEADERS" ios/TanStackHotkeys.m && echo "Mac Catalyst: ok"
clang "${flags[@]}" -target x86_64-apple-macos10.15 -isysroot "$MAC_SDK" \
  -I "$RNM_HEADERS" ios/TanStackHotkeys.m && echo "macOS: ok"
