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

## Checklist for new push notifications

When adding a new push notification type:

- [ ] Server: `RawContent` used for iOS; custom data nested under `"body"` key
- [ ] Server: `GCMMessage.Data` used for Android (unchanged pattern)
- [ ] Server: correct Pinpoint app ID selected via `device.app`
- [ ] Client: notification handler in `(auth)/_layout.tsx` marks ID before calling `routeToJobFromNotification` (already handled)
- [ ] Client: destination screen uses `useFocusEffect` for data fetching
- [ ] Client: destination screen has an error state with retry (never spin indefinitely)
- [ ] API: destination screen calls an appropriately scoped endpoint (company-scoped for drivers, not owner-scoped)
