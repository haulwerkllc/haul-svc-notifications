# Haul Notifications Service - Quick Reference

## Key Files

| File | Purpose |
|------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Authoritative architecture and design constraints |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment guide and troubleshooting |

## Event Flow

```
EventBridge Event
    ↓
Orchestrator Lambda
    ├─→ Validate schema (utils/schema.js)
    ├─→ Resolve recipients (resolvers/{event}_resolver.js) [LOOKUP ONLY]
    ├─→ Load preferences (DynamoDB: NotificationPreference)
    ├─→ Write to inbox (DynamoDB: NotificationInbox) [generates notification_id]
    └─→ Enqueue to channels (SQS)
         ↓
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
  Email     Push     SMS    (Future)
  Lambda    Lambda   Lambda
    ↓        (Stub)   (Stub)
  Pinpoint
```

## Quick Commands

```bash
# Deploy
serverless deploy --stage dev

# Invoke orchestrator with test event
serverless invoke --function notificationsOrchestrator \
  --path test-event.json --stage dev

# View logs
serverless logs --function notificationsOrchestrator --stage dev --tail
serverless logs --function emailChannelHandler --stage dev --tail

# Check SQS queue
aws sqs receive-message \
  --queue-url $(aws sqs get-queue-url --queue-name haul-notifications-email-dev --query 'QueueUrl' --output text) \
  --max-number-of-messages 10

# Check DynamoDB inbox
aws dynamodb query \
  --table-name NotificationInbox-dev \
  --key-condition-expression "user_id = :uid" \
  --expression-attribute-values '{":uid":{"S":"USER#test456"}}'
```

## Event Schema Quick Reference

```json
{
  "detail": {
    "event_id": "evt_123",
    "event_type": "haul.job.posted",
    "occurred_at": "2026-01-04T12:00:00Z",
    "actor": {
      "type": "user",
      "id": "USER#123"
    },
    "recipients": {
      "mode": "explicit|service_area",
      "user_ids": ["USER#abc"],
      "service_area_ids": ["AREA#la-west"]
    },
    "entity": {
      "type": "job|bid|booking",
      "id": "JOB#123"
    },
    "context": {
      "job_id": "...",
      "job_url": "..."
    }
  }
}
```

## Supported Event Types

- ✅ `haul.job.posted` - New job alert
- ✅ `haul.job.canceled` - Job cancellation
- ✅ `haul.job.closed` - Bidding closed
- ✅ `haul.bid.created` - New bid received
- ✅ `haul.booking.created` - Booking confirmed

## Channel Status

| Channel | Status | Phase |
|---------|--------|-------|
| Email | ✅ Operational | Phase 1 (Current) |
| Push | ⏸️ Architectural shape only (not active) | Phase 2 |
| SMS | ⏸️ Architectural shape only (not active) | Phase 3 (requires 10DLC) |

## Critical TODOs for Production

### Blocks Email Delivery
- [ ] Implement `resolveUserEmail()` - integrate with identity service
- [ ] Implement resolvers with actual lookup logic
- [ ] EventBridge ingress configured (central Terraform)

### High Priority
- [ ] Implement all resolver logic (OpenSearch + DynamoDB queries)
- [ ] Set up CloudWatch alarms
- [ ] Configure bounce/complaint webhooks

### Future
- [ ] Enable push notifications (Phase 2)
- [ ] Enable SMS notifications (Phase 3)

## Environment Variables

Environment variables are injected via Serverless Framework at deployment time (not read dynamically at runtime).

### Provider-Level (Shared)
- `NOTIFICATION_PREFERENCE_TABLE_NAME` - User preferences
- `NOTIFICATION_INBOX_TABLE_NAME` - Notification history
- `DEVICE_ENDPOINT_TABLE_NAME` - Push device endpoints
- `PINPOINT_EMAIL_FROM_ADDRESS` - Email FROM address
- `PINPOINT_APP_ID` - Pinpoint application ID (injected via CloudFormation ref)

### Function-Level (Auto-configured)
- `EMAIL_QUEUE_URL` - Email channel SQS queue
- `PUSH_QUEUE_URL` - Push channel SQS queue
- `SMS_QUEUE_URL` - SMS channel SQS queue

## DynamoDB Tables (Central Terraform)

### NotificationPreference-{stage}
```
Partition Key: user_id (String)
Attributes:
  - email_enabled (Boolean)
  - push_enabled (Boolean)
  - sms_enabled (Boolean)
```

### NotificationInbox-{stage}
```
Partition Key: user_id (String)
Sort Key: notification_id (String) [service-generated]
Attributes:
  - event_id (String) [foreign reference to domain event]
  - event_type (String)
  - entity_type (String)
  - entity_id (String)
  - occurred_at (String - ISO 8601)
  - created_at (String - ISO 8601)
  - channels (List)
  - delivery_status (Map)
  - read (Boolean)
  - context (Map)
```

### DeviceEndpoint-{stage}
```
Partition Key: user_id (String)
Sort Key: endpoint_id (String)
Attributes:
  - platform (String - APNS|FCM)
  - device_token (String)
  - enabled (Boolean)
```

## Resources Created

### SQS Queues
- `haul-notifications-email-{stage}`
- `haul-notifications-email-dlq-{stage}`
- `haul-notifications-push-{stage}` (non-operational)
- `haul-notifications-push-dlq-{stage}` (non-operational)
- `haul-notifications-sms-{stage}` (non-operational)
- `haul-notifications-sms-dlq-{stage}` (non-operational)

### Pinpoint
- `haul-notifications-{stage}` - Application
- Email channel (enabled)
- Push channels (commented out - Phase 2)
- SMS channel (commented out - Phase 3)

### IAM Policies
- `haul-notifications-orchestrator-sqs-{stage}`
- `haul-notifications-email-pinpoint-{stage}`

### Lambda Functions
- `haul-svc-notifications-orchestrator-{stage}`
- `haul-svc-notifications-email-channel-{stage}`
- `haul-svc-notifications-push-channel-{stage}` (non-operational)
- `haul-svc-notifications-sms-channel-{stage}` (non-operational)

## Troubleshooting

### "No resolver for event type"
→ Add resolver to `functions/orchestrator/resolvers/` and register in `registry.js`

### "No recipients"
→ Resolver returned empty array. Implement actual lookup logic in resolver.
→ Remember: Resolvers perform LOOKUP ONLY. No preferences, no delivery.

### "Email not sent"
→ Check `resolveUserEmail()` returns valid email
→ Verify Pinpoint email channel enabled
→ Verify FROM address via SES (internal to Pinpoint)

### "Schema validation failed"
→ Check EventBridge event matches canonical schema in `utils/schema.js`

### Messages in DLQ
→ Check CloudWatch logs for Lambda errors
→ Verify IAM permissions

## Architectural Boundaries

### ✅ CORRECT
- Pinpoint is the only outbound messaging system
- EventBridge ingress managed centrally (central Terraform)
- Resolvers perform lookup only, return user_ids
- Orchestrator handles preferences and delivery
- notification_id is service-generated
- event_id is foreign reference only
- Push/SMS channels are non-operational placeholders

### ❌ VIOLATIONS
- Do NOT integrate with SES directly
- Do NOT query User identity tables
- Do NOT define EventBridge rules in this service
- Do NOT add template engines without explicit requirement
- Do NOT make resolvers evaluate preferences or perform delivery
- Do NOT activate Push/SMS channels until Phase 2/3
