// Sends every hardware key event of the app to JavaScript, and swallows the
// ones registered hotkeys handle (see setConsumeRules) before UIKit or AppKit
// deliver them to responders such as text fields.
//
// iOS, iPadOS, Mac Catalyst, visionOS: -[UIApplication sendEvent:] is wrapped
// to read UIPressesEvent presses (iOS 13.4+), before any responder.
// macOS (react-native-macos): a local NSEvent monitor reads keyDown, keyUp,
// and flagsChanged events of the main window.

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#if TARGET_OS_OSX
#import <AppKit/AppKit.h>
#else
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#endif

static NSString *const TanStackHotkeysKeyEvent = @"TanStackHotkeysKey";
static NSString *const TanStackHotkeysBlurEvent = @"TanStackHotkeysBlur";

// Modifier bits shared with JavaScript (src/keys/types.ts)
static const NSInteger TanStackHotkeysControl = 1;
static const NSInteger TanStackHotkeysAlt = 2;
static const NSInteger TanStackHotkeysShift = 4;
static const NSInteger TanStackHotkeysMeta = 8;

// UIKeyModifierFlags and NSEventModifierFlags share these values
static const NSUInteger TanStackHotkeysFlagShift = 1 << 17;
static const NSUInteger TanStackHotkeysFlagControl = 1 << 18;
static const NSUInteger TanStackHotkeysFlagOption = 1 << 19;
static const NSUInteger TanStackHotkeysFlagCommand = 1 << 20;

static NSInteger TanStackHotkeysModifiers(NSUInteger flags)
{
  return ((flags & TanStackHotkeysFlagControl) ? TanStackHotkeysControl : 0) |
      ((flags & TanStackHotkeysFlagOption) ? TanStackHotkeysAlt : 0) |
      ((flags & TanStackHotkeysFlagShift) ? TanStackHotkeysShift : 0) |
      ((flags & TanStackHotkeysFlagCommand) ? TanStackHotkeysMeta : 0);
}

static NSArray<NSString *> *TanStackHotkeysChars(NSString *characters, NSString *ignoringModifiers)
{
  NSMutableArray<NSString *> *chars = [NSMutableArray arrayWithCapacity:2];
  if (characters.length > 0) {
    [chars addObject:characters.lowercaseString];
  }
  if (ignoringModifiers.length > 0) {
    [chars addObject:ignoringModifiers.lowercaseString];
  }
  return chars;
}

/// Key codes whose keydown was swallowed, so their keyup is too. Shared by
/// module instances so a JavaScript reload mid-press keeps it. Main thread only.
static NSMutableSet<NSNumber *> *TanStackHotkeysConsumedKeys(void)
{
  static NSMutableSet<NSNumber *> *keys;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    keys = [NSMutableSet new];
  });
  return keys;
}

/// A keydown to swallow, as JavaScript computed it from registered hotkeys.
@interface TanStackHotkeysRule : NSObject
@property (nonatomic, copy) NSSet<NSNumber *> *keyCodes;
@property (nonatomic, copy) NSSet<NSString *> *chars;
@property (nonatomic) NSInteger modifiers;
@property (nonatomic) BOOL shiftOptional;
@property (nonatomic) BOOL skipInText;
@end

@implementation TanStackHotkeysRule

- (BOOL)matchesKeyCode:(NSInteger)keyCode
                 chars:(NSArray<NSString *> *)chars
             modifiers:(NSInteger)modifiers
           textFocused:(BOOL)textFocused
{
  if (self.skipInText && textFocused) {
    return NO;
  }
  NSInteger ignored = self.shiftOptional ? ~TanStackHotkeysShift : ~0;
  if ((self.modifiers & ignored) != (modifiers & ignored)) {
    return NO;
  }
  if ([self.keyCodes containsObject:@(keyCode)]) {
    return YES;
  }
  for (NSString *character in chars) {
    if ([self.chars containsObject:character]) {
      return YES;
    }
  }
  return NO;
}

@end

@interface TanStackHotkeys : RCTEventEmitter <RCTBridgeModule>
+ (void)installHook;
- (void)blur;
#if TARGET_OS_OSX
- (BOOL)handleEvent:(NSEvent *)event;
#else
- (BOOL)handlePresses:(UIPressesEvent *)event API_AVAILABLE(ios(13.4));
#endif
@end

/// The module instance events go to; replaced when JavaScript reloads.
static __weak TanStackHotkeys *TanStackHotkeysActive;

@implementation TanStackHotkeys {
  BOOL _hasListeners;
  NSArray<TanStackHotkeysRule *> *_rules;
#if !TARGET_OS_OSX
  /// Presses already handled, with their phase and decision, so a press UIKit
  /// sends again gets the same decision without being reported twice.
  NSMapTable<UIPress *, NSNumber *> *_handledPresses;
#endif
}

RCT_EXPORT_MODULE(TanStackHotkeys)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (instancetype)init
{
  if (self = [super init]) {
    _rules = @[];
    TanStackHotkeysActive = self;
    [self.class installHook];
    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
#if TARGET_OS_OSX
    [center addObserver:self
               selector:@selector(blur)
                   name:NSApplicationDidResignActiveNotification
                 object:nil];
    [center addObserver:self selector:@selector(blur) name:NSWindowDidResignKeyNotification object:nil];
#else
    _handledPresses = [NSMapTable weakToStrongObjectsMapTable];
    [center addObserver:self
               selector:@selector(blur)
                   name:UIApplicationWillResignActiveNotification
                 object:nil];
    // iPadOS and Mac Catalyst windows lose focus without the app resigning active
    [center addObserver:self selector:@selector(blur) name:UISceneWillDeactivateNotification object:nil];
    [center addObserver:self selector:@selector(blur) name:UIWindowDidResignKeyNotification object:nil];
#endif
  }
  return self;
}

- (void)invalidate
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
  if (TanStackHotkeysActive == self) {
    TanStackHotkeysActive = nil;
  }
  [super invalidate];
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ TanStackHotkeysKeyEvent, TanStackHotkeysBlurEvent ];
}

- (void)startObserving
{
  _hasListeners = YES;
  TanStackHotkeysActive = self;
}

- (void)stopObserving
{
  _hasListeners = NO;
}

RCT_EXPORT_METHOD(setConsumeRules : (NSArray<NSDictionary *> *)rules)
{
  NSMutableArray<TanStackHotkeysRule *> *parsed = [NSMutableArray arrayWithCapacity:rules.count];
  for (NSDictionary *rule in rules) {
    TanStackHotkeysRule *entry = [TanStackHotkeysRule new];
    entry.keyCodes = [NSSet setWithArray:rule[@"keyCodes"] ?: @[]];
    entry.chars = [NSSet setWithArray:rule[@"chars"] ?: @[]];
    entry.modifiers = [rule[@"modifiers"] integerValue];
    entry.shiftOptional = [rule[@"shiftOptional"] boolValue];
    entry.skipInText = [rule[@"skipInText"] boolValue];
    [parsed addObject:entry];
  }
  _rules = parsed;
}

- (void)blur
{
  [TanStackHotkeysConsumedKeys() removeAllObjects];
  if (_hasListeners) {
    [self sendEventWithName:TanStackHotkeysBlurEvent body:nil];
  }
}

/// Reports a key and returns whether to swallow it. Main thread only.
- (BOOL)handleKeyCode:(NSInteger)keyCode
                 down:(BOOL)down
                 body:(NSDictionary *)body
                chars:(NSArray<NSString *> *)chars
                flags:(NSUInteger)flags
          textFocused:(BOOL)textFocused
            composing:(BOOL)composing
{
  if (_hasListeners) {
    [self sendEventWithName:TanStackHotkeysKeyEvent body:body];
  }
  NSMutableSet<NSNumber *> *consumed = TanStackHotkeysConsumedKeys();
  NSNumber *key = @(keyCode);
  if (!down) {
    BOOL wasConsumed = [consumed containsObject:key];
    [consumed removeObject:key];
    return wasConsumed;
  }
  // Keys that compose text, including Escape cancelling it, belong to the input method
  if (!composing) {
    NSInteger modifiers = TanStackHotkeysModifiers(flags);
    for (TanStackHotkeysRule *rule in _rules) {
      if ([rule matchesKeyCode:keyCode chars:chars modifiers:modifiers textFocused:textFocused]) {
        [consumed addObject:key];
        return YES;
      }
    }
  }
  [consumed removeObject:key];
  return NO;
}

#if TARGET_OS_OSX

+ (void)installHook
{
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    NSEventMask mask = NSEventMaskKeyDown | NSEventMaskKeyUp | NSEventMaskFlagsChanged;
    [NSEvent addLocalMonitorForEventsMatchingMask:mask
                                          handler:^NSEvent *(NSEvent *event) {
                                            TanStackHotkeys *module = TanStackHotkeysActive;
                                            return module && [module handleEvent:event] ? nil : event;
                                          }];
  });
}

- (BOOL)handleEvent:(NSEvent *)event
{
  // Leave alerts, open and save panels, sheets, and other auxiliary windows alone
  if (event.window == nil || event.window != NSApp.mainWindow) {
    return NO;
  }
  NSResponder *responder = event.window.firstResponder;
  BOOL textFocused = [responder isKindOfClass:[NSText class]] ||
      [responder conformsToProtocol:@protocol(NSTextInputClient)];
  BOOL composing = [responder conformsToProtocol:@protocol(NSTextInputClient)] &&
      [(id<NSTextInputClient>)responder hasMarkedText];
  NSUInteger flags = event.modifierFlags;
  if (event.type == NSEventTypeFlagsChanged) {
    // Modifier keys alone are never swallowed, and have no characters
    if (_hasListeners) {
      [self sendEventWithName:TanStackHotkeysKeyEvent
                         body:@{
                           @"type" : @"flagsChanged",
                           @"keyCode" : @(event.keyCode),
                           @"characters" : @"",
                           @"charactersIgnoringModifiers" : @"",
                           @"modifierFlags" : @(flags),
                           @"repeat" : @NO,
                           @"textInputFocused" : @(textFocused),
                           @"isComposing" : @(composing),
                         }];
    }
    return NO;
  }
  BOOL down = event.type == NSEventTypeKeyDown;
  NSString *characters = event.characters ?: @"";
  NSString *ignoringModifiers = event.charactersIgnoringModifiers ?: @"";
  NSDictionary *body = @{
    @"type" : down ? @"keydown" : @"keyup",
    @"keyCode" : @(event.keyCode),
    @"characters" : characters,
    @"charactersIgnoringModifiers" : ignoringModifiers,
    @"modifierFlags" : @(flags),
    @"repeat" : @(down && event.isARepeat),
    @"textInputFocused" : @(textFocused),
    @"isComposing" : @(composing),
  };
  return [self handleKeyCode:event.keyCode
                        down:down
                        body:body
                       chars:TanStackHotkeysChars(characters, ignoringModifiers)
                       flags:flags
                 textFocused:textFocused
                   composing:composing];
}

#else

static IMP TanStackHotkeysOriginalSendEvent;

static void TanStackHotkeysSendEvent(UIApplication *application, SEL selector, UIEvent *event)
{
  TanStackHotkeys *module = TanStackHotkeysActive;
  if (module && event.type == UIEventTypePresses) {
    if (@available(iOS 13.4, tvOS 13.4, *)) {
      if ([module handlePresses:(UIPressesEvent *)event]) {
        return;
      }
    }
  }
  ((void (*)(id, SEL, UIEvent *))TanStackHotkeysOriginalSendEvent)(application, selector, event);
}

+ (void)installHook
{
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    Method method = class_getInstanceMethod([UIApplication class], @selector(sendEvent:));
    TanStackHotkeysOriginalSendEvent = method_setImplementation(method, (IMP)TanStackHotkeysSendEvent);
  });
}

static __weak id TanStackHotkeysFirstResponder;

static id TanStackHotkeysCurrentFirstResponder(void)
{
  TanStackHotkeysFirstResponder = nil;
  [[UIApplication sharedApplication] sendAction:@selector(tanstackHotkeys_findFirstResponder:)
                                             to:nil
                                           from:nil
                                       forEvent:nil];
  return TanStackHotkeysFirstResponder;
}

- (BOOL)handlePresses:(UIPressesEvent *)event
{
  BOOL anyChanged = NO;
  BOOL allSwallowed = YES;
  BOOL checkedFocus = NO;
  BOOL textFocused = NO;
  BOOL composing = NO;
  for (UIPress *press in event.allPresses) {
    UIKey *key = press.key;
    BOOL down;
    switch (press.phase) {
      case UIPressPhaseBegan:
        down = YES;
        break;
      case UIPressPhaseEnded:
      case UIPressPhaseCancelled:
        down = NO;
        break;
      default:
        continue;
    }
    anyChanged = YES;
    if (!key) {
      allSwallowed = NO;
      continue;
    }
    // UIKit may send the same press and phase again: repeat the decision
    NSNumber *handled = [_handledPresses objectForKey:press];
    if (handled && ((handled.integerValue >> 1) == (NSInteger)press.phase)) {
      allSwallowed &= (handled.integerValue & 1);
      continue;
    }
    if (!checkedFocus) {
      id responder = TanStackHotkeysCurrentFirstResponder();
      textFocused = [responder isKindOfClass:[UITextView class]]
          ? ((UITextView *)responder).isEditable
          : [responder conformsToProtocol:@protocol(UIKeyInput)];
      composing = [responder conformsToProtocol:@protocol(UITextInput)] &&
          ((id<UITextInput>)responder).markedTextRange != nil;
      checkedFocus = YES;
    }
    NSString *characters = key.characters ?: @"";
    NSString *ignoringModifiers = key.charactersIgnoringModifiers ?: @"";
    NSDictionary *body = @{
      @"type" : down ? @"keydown" : @"keyup",
      @"keyCode" : @(key.keyCode),
      @"characters" : characters,
      @"charactersIgnoringModifiers" : ignoringModifiers,
      @"modifierFlags" : @(key.modifierFlags),
      @"textInputFocused" : @(textFocused),
      @"isComposing" : @(composing),
    };
    BOOL swallow = [self handleKeyCode:key.keyCode
                                  down:down
                                  body:body
                                 chars:TanStackHotkeysChars(characters, ignoringModifiers)
                                 flags:key.modifierFlags
                           textFocused:textFocused
                             composing:composing];
    [_handledPresses setObject:@(((NSInteger)press.phase << 1) | (swallow ? 1 : 0)) forKey:press];
    allSwallowed &= swallow;
  }
  // Swallow the event only when nothing in it needs to reach the app, such as
  // a modifier released together with a swallowed key
  return anyChanged && allSwallowed;
}

#endif

@end

#if !TARGET_OS_OSX
@implementation UIResponder (TanStackHotkeys)

- (void)tanstackHotkeys_findFirstResponder:(id)sender
{
  TanStackHotkeysFirstResponder = self;
}

@end
#endif
