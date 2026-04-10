# Push Notification Implementation Reference

This document captures the non-obvious behaviour, constraints, and fixes discovered while getting end-to-end push notifications working across `haul-svc-notifications`, `haul-svc-core`, and the Expo driver/customer apps. Read this before implementing any new push notification.

---

## 1. iOS APNs payload — `RawContent` is required

### Problem
Pinpoint's `APNSMessage.Data` field **does not reliably reach the app** when the notification is a visible (alert) push. AWS merges `Data` into the APNs `userInfo` dictionary, but only when the push is a silent/background notification. For foreground/background alert notifications the Data fields are silently dropped.

### Rule
For iOS, always use `APNSMessage.RawContent` and construct the full APNs JSON payload yourself.

### Correct payload shape (`push_handlers.js`)
```javascript
APNSMessage: {
  RawContent: JSON.stringify({
    aps: {
      alert: { title: subject, body: pushBody },
      sound: 'default',
    },
    body: {                  // custom data MUST be nested under "body"
      event_type: '...',
      entity_type: '...',
      entity_id:   '...',
    },
  }),
},
```

Android (`GCMMessage`) is unaffected — `Data` works correctly there and requires no change.

---

## 2. `expo-notifications` iOS deserialisation — the `"body"` key

### Problem
Even with `RawContent`, custom data placed at the **root level** of the APNs JSON payload does not appear in `notification.request.content.data` on the JS side. The value will be `null`.

### Root cause
`expo-notifications` native iOS code (`EXNotificationSerializer.m`) deserialises the APNs `userInfo` dictionary as follows:

```objc
+ (NSDictionary *)serializedNotificationData:(UNNotificationRequest *)request
{
  BOOL isRemote = [request.trigger isKindOfClass:[UNPushNotificationTrigger class]];
  return isRemote ? request.content.userInfo[@"body"] : request.content.userInfo;
}
```

For remote push notifications it reads **only** `userInfo["body"]`. Anything at the root is ignored.

### Rule
All custom payload fields (`event_type`, `entity_type`, `entity_id`, etc.) must be nested under the `"body"` key inside `RawContent`. See the payload shape in §1 above.

---

## 3. Separate Pinpoint apps for driver vs customer

Two Pinpoint applications exist — one per mobile app. The correct app is selected at send time by reading `device.app` on the `DeviceEndpoint` record.

```javascript
// push_handlers.js
const pinpointAppId =
  device.app === 'driver'
    ? process.env.PINPOINT_DRIVER_APP_ID
    : process.env.PINPOINT_APP_ID;
```

Both Pinpoint apps are provisioned via the central `modules/messaging` Terraform module. SSM parameters:

- `/haul/{env}/pinpoint/app_id` — customer app
- `/haul/{env}/pinpoint/driver_app_id` — driver app

`haul-svc-core`'s `syncPinpointEndpoint` util reads `device.app` and resolves the correct app ID when registering device tokens.

---

## 4. Client — double-push from dual notification handlers

### Problem
The driver app `(auth)/_layout.tsx` uses two mechanisms to handle notification taps:

1. `Notifications.addNotificationResponseReceivedListener` — fires for taps while the app is running (foreground/background).
2. `Notifications.useLastNotificationResponse` hook — fires for cold-start (app was killed when tapped), but **also updates reactively** when any tap occurs at runtime.

Both fire for the same tap, so `router.push` is called twice, producing two identical screens on the stack. The user has to press back twice to exit the detail screen.

### Fix (`(auth)/_layout.tsx`)
Mark the notification ID as handled **inside the listener** before `useLastNotificationResponse`'s `useEffect` runs:

```typescript
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handledNotificationId.current = response.notification.request.identifier; // ← mark first
    routeToJobFromNotification(
      response.notification.request.content.data as Record<string, unknown>,
    );
  });
  return () => subscription.remove();
}, []);
```

The existing guard in the `useLastNotificationResponse` effect then skips the duplicate:

```typescript
useEffect(() => {
  if (!lastNotificationResponse) return;
  const id = lastNotificationResponse.notification.request.identifier;
  if (handledNotificationId.current === id) return; // ← skips if already handled
  handledNotificationId.current = id;
  routeToJobFromNotification(...);
}, [lastNotificationResponse]);
```

---

## 5. Deep-link destination screen — `useFocusEffect` required

### Problem
Screens navigated to directly from a push notification may already exist in the navigation stack (e.g. user previously visited the screen, then backgrounded the app). A plain `useEffect` with a dependency on `jobId` will not re-fetch if the screen is already mounted — it sees no change.

### Rule
Any screen that can be reached via a push notification deep link must use `useFocusEffect` for its data fetch, not `useEffect`. This guarantees the fetch runs every time the screen gains focus, regardless of whether it is freshly mounted or already on the stack.

```typescript
useFocusEffect(
  useCallback(() => {
    if (fetchedJobIdRef.current === jobId) return; // deduplicate for same ID
    fetchedJobIdRef.current = jobId;
    // fetch data...
  }, [jobId]),
);
```

---

## 6. Driver-facing job fetch requires a company-scoped endpoint

### Problem
The existing `GET /jobs/{jobId}` endpoint in `haul-svc-jobs` is owner-scoped: it checks `job.owner_user_id === userId` and returns `403` for drivers. It also returns unredacted pickup addresses, which drivers must not see before booking.

### Rule
Driver and dispatcher clients must use `GET /companies/{companyId}/jobs/{jobId}` (`getAvailableJobById` in `company-handlers.js`). This endpoint:

- Requires any company role (`requireCompanyRole('ALL')`)
- Only returns jobs with status `OPEN_FOR_BIDS` or `INSTANT_BOOK`
- Redacts pickup stop addresses and offsets coordinates (same logic as `getAvailableJobs`)
- Generates pre-signed image URLs

Never reuse the owner-scoped endpoint for driver clients.

---

---

## 7. Communication Notifications — sender avatar on the left (like iMessage)

iOS 15+ supports "Communication Notifications" that render the sender's profile photo as an avatar on the **left side** of the banner, identical to iMessage. This requires a Notification Service Extension (NSE) and the `Intents` framework. The implementation is spread across the backend, the Expo config plugin, and both mobile apps.

### What NOT to do

Using `UNNotificationAttachment` in the NSE puts the image as a **thumbnail on the right side** of the banner — this is the wrong API for an avatar. The correct API is `INSendMessageIntent` + `content.updating(from: intent)`.

| API | Image position |
|---|---|
| `UNNotificationAttachment` | Right side (media preview thumbnail) |
| `INSendMessageIntent` + `content.updating(from:)` | Left side (sender avatar, like iMessage) |

### End-to-end data flow

```
haul-app / haul-driver-app
  sendMessage() → POST /threads/{id}/messages
    body: { body, sender_given_name, sender_profile_photo_key }
        ↓
haul-svc-messaging (threads/handlers.js)
  stores sender_profile_photo_key on the DynamoDB message item
  emitNotificationEvent() → EventBridge haul.message.created
    context.sender_profile_photo_key = <S3 key>
        ↓
haul-svc-notifications orchestrator (handler.js)
  constructMessageCreatedNotification():
    sender_profile_photo_url = MEDIA_BASE_URL + '/' + sender_profile_photo_key
  enqueueToChannel('push') → SQS PushChannelQueue
    message.data.sender_profile_photo_url = <full URL>
        ↓
haul-svc-notifications push_handlers.js
  APNSMessage.RawContent:
    aps.mutable-content = 1          ← triggers NSE before display
    body.sender_profile_photo_url    ← NSE reads this
        ↓
iOS Notification Service Extension (NotificationService.swift)
  downloads avatar from sender_profile_photo_url
  INPerson(displayName: title, image: INImage(imageData: data))
  INSendMessageIntent(sender: person, conversationIdentifier: thread_id)
  content.updating(from: intent)     ← produces left-side avatar
```

### APNs payload shape for message notifications

`mutable-content: 1` is required to invoke the NSE. `sender_profile_photo_url` must be inside the `"body"` key (see §2 — `expo-notifications` only reads `userInfo["body"]`).

```javascript
// push_handlers.js
APNSMessage: {
  RawContent: JSON.stringify({
    aps: {
      alert: { title: subject, body: pushBody },
      sound: 'default',
      'mutable-content': 1,              // required — triggers NSE
    },
    body: {
      event_type: 'haul.message.created',
      entity_type, entity_id,
      booking_number,
      sender_profile_photo_url,          // full HTTPS URL — NSE downloads this
    },
  }),
},
```

### Notification Service Extension (Swift)

The NSE lives at `ios/NotificationService/NotificationService.swift`, generated by the Expo config plugin on every prebuild. Key logic:

```swift
import UserNotifications
import Intents

// 1. Guard: only process haul.message.created with a photo URL
guard
  let bodyDict = userInfo["body"] as? [String: Any],
  let eventType = bodyDict["event_type"] as? String,
  eventType == "haul.message.created",
  let urlString = bodyDict["sender_profile_photo_url"] as? String,
  !urlString.isEmpty,
  let url = URL(string: urlString)
else {
  contentHandler(bestAttemptContent)
  return
}

// 2. Download avatar, build intent
URLSession.shared.dataTask(with: url) { data, _, error in
  // conversationId drives notification grouping
  let conversationId = (bodyDict["thread_id"] as? String) ?? "haul-messages"
  bestAttemptContent.threadIdentifier = conversationId   // grouping fallback

  let sender = INPerson(
    personHandle: INPersonHandle(value: nil, type: .unknown),
    nameComponents: nil,
    displayName: bestAttemptContent.title,               // sender name from aps.alert.title
    image: INImage(imageData: data!),
    contactIdentifier: nil, customIdentifier: nil
  )
  let intent = INSendMessageIntent(
    recipients: nil, outgoingMessageType: .outgoingMessageText,
    content: bestAttemptContent.body,
    speakableGroupName: nil,
    conversationIdentifier: conversationId,
    serviceName: nil, sender: sender, attachments: nil
  )

  // 3. Donate + update content → left-side avatar
  let interaction = INInteraction(intent: intent, response: nil)
  interaction.direction = .incoming
  interaction.donate(completion: nil)

  if let updated = try? bestAttemptContent.updating(from: intent) {
    contentHandler(updated)
  } else {
    contentHandler(bestAttemptContent)   // fallback: plain notification
  }
}.resume()
```

### Expo config plugin (`plugins/withNotificationServiceExtension.js`)

Both `haul-app` and `haul-driver-app` carry an identical copy of this plugin. It:

1. Writes `NotificationService.swift` and `NotificationService-Info.plist` to `ios/NotificationService/` during prebuild.
2. Creates the NSE target in the Xcode project (`app_extension`, bundle ID `<mainBundleId>.NotificationService`).
3. Links `Intents.framework` to the NSE target (required for `INSendMessageIntent` / `INPerson`).
4. Applies build settings to **every `XCBuildConfiguration`** belonging to the NSE target.

#### Critical: match build configurations by UUID, not by `PRODUCT_NAME`

`addTarget()` sets `PRODUCT_BUNDLE_IDENTIFIER` at the native target level. The individual Debug/Release `XCBuildConfiguration` objects often do **not** have `PRODUCT_NAME` or `PRODUCT_BUNDLE_IDENTIFIER` in their own `buildSettings` — they inherit from the target. Any approach that iterates `pbxXCBuildConfigurationSection()` and filters by `PRODUCT_NAME` will silently match nothing, leaving the bundle ID unset and causing:

```
error: Embedded binary's bundle identifier is not prefixed with
       the parent app's bundle identifier.
```

**Fix:** trace configurations by UUID from the target's `buildConfigurationList`:

```javascript
function applyNSEBuildSettings(xcodeProject, targetUuid, bundleId) {
  const target = xcodeProject.pbxNativeTargetSection()[targetUuid];
  const configList = xcodeProject.pbxXCConfigurationListSection()[target.buildConfigurationList];
  const allConfigs = xcodeProject.pbxXCBuildConfigurationSection();

  for (const configRef of configList.buildConfigurations) {
    const uuid = typeof configRef === 'object' ? configRef.value : configRef;
    const bc = allConfigs[uuid];
    bc.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}.${NSE_TARGET_NAME}"`;
    // ... other settings
  }
}
```

Both call sites — fresh-target path (`target.uuid`) and existing-target re-run path (`existingUuid`) — pass the target UUID.

### Required iOS capabilities

#### Main app (`app.config.ts` → `ios.entitlements`)

```typescript
ios: {
  entitlements: {
    'com.apple.developer.siri': true,
  },
  infoPlist: {
    NSUserActivityTypes: ['INSendMessageIntent'],
  },
}
```

Both are required. `com.apple.developer.siri` tells iOS this app can produce communication notifications. `NSUserActivityTypes` declares which intent types the app handles.

#### NSE target — NO Siri entitlement

The NSE does **not** need `com.apple.developer.siri`. It only uses `Intents` framework data types (`INPerson`, `INSendMessageIntent`), not privileged Siri API calls.

Adding `com.apple.developer.siri` to the NSE causes automatic signing to fail because Xcode tries to provision the NSE's App ID with the Siri capability, which must be manually registered in the Apple Developer portal and cannot be created by `-allowProvisioningUpdates`.

**Rule:** Siri entitlement on main app only. NSE signs with no additional entitlements.

### Testing checklist

- Send a message from one account to another
- App in background or killed — notification should show sender name + avatar on the left
- App in foreground — notification appears per `iosDisplayInForeground: true` setting in expo-notifications
- User without a profile photo — notification delivers without avatar (fallback path in NSE)
- Thread grouping — multiple messages from the same thread stack under one notification group

---

## Checklist for new push notifications

When adding a new push notification type:

- [ ] Server: `RawContent` used for iOS; custom data nested under `"body"` key
- [ ] Server: `GCMMessage.Data` used for Android (unchanged pattern)
- [ ] Server: correct Pinpoint app ID selected via `device.app`
- [ ] Client: notification handler in `(auth)/_layout.tsx` marks ID before calling `routeToJobFromNotification` (already handled)
- [ ] Client: destination screen uses `useFocusEffect` for data fetching
- [ ] Client: destination screen has an error state with retry (never spin indefinitely)
- [ ] API: destination screen calls an appropriately scoped endpoint (company-scoped for drivers, not owner-scoped)

When adding or modifying **message push notifications** specifically:

- [ ] `aps.mutable-content: 1` set in APNs payload to trigger NSE
- [ ] `body.sender_profile_photo_url` included (full URL, not S3 key)
- [ ] NSE falls back gracefully to plain notification if image download fails
- [ ] Main app has `com.apple.developer.siri` entitlement and `NSUserActivityTypes: ['INSendMessageIntent']` — NSE does NOT get the Siri entitlement
- [ ] After any plugin change: `npx expo prebuild --clean --platform ios` before rebuilding
