# Haul Notifications Service - Deployment Guide

## Overview

This document provides deployment and testing instructions for the notifications service vertical slice.

## Architecture Summary

- **Orchestrator Lambda**: Consumes EventBridge events, resolves recipients, writes to inbox, enqueues to channels
- **Email Channel Lambda**: Sends emails via Amazon Pinpoint (OPERATIONAL)
- **Push Channel Lambda**: Non-operational placeholder (Phase 2)
- **SMS Channel Lambda**: Non-operational placeholder (Phase 3)

## Prerequisites

### 1. Amazon Pinpoint Email Configuration (Required)

Before deploying, ensure:

1. SES domain identity is verified in AWS (managed in central Terraform)
2. SES is out of sandbox for production environments (Pinpoint email channel is constrained by SES sandbox restrictions)
3. Update `env.{stage}.json` with:
   ```json
   {
     "PINPOINT_EMAIL_FROM_ADDRESS": "notifications@yourdomain.com"
   }
   ```

**Note**: SES is the underlying transport layer for Pinpoint email delivery. This service integrates with Pinpoint only.

### 2. DynamoDB Tables (Required)

The following tables must exist (created via central Terraform):
- `NotificationPreference-{stage}`
- `NotificationInbox-{stage}`
- `DeviceEndpoint-{stage}`

### 3. EventBridge Ingress (Required)

EventBridge rules, targets, and Lambda permissions are managed in central Terraform and assumed to be functional.

## Deployment

```bash
# Install dependencies
npm install

# Deploy to dev
serverless deploy --stage dev

# Deploy to stage
serverless deploy --stage stage

# Deploy to main (production)
serverless deploy --stage main
```

The Pinpoint Application ID is automatically created via CloudFormation and injected into Lambda environment variables at deployment time by Serverless Framework.

## Testing

### 1. Test Event Ingress Schema Validation

**Note**: Direct invocation is for schema validation only and does not reflect production ingress behavior. Production events arrive via EventBridge.

Create a test event file `test-event.json`:

```json
{
  "version": "0",
  "id": "test-123",
  "detail-type": "haul.job.posted",
  "source": "haul.jobs",
  "time": "2026-01-04T12:00:00Z",
  "region": "us-west-2",
  "detail": {
    "event_id": "evt_test_123",
    "event_type": "haul.job.posted",
    "occurred_at": "2026-01-04T12:00:00Z",
    "actor": {
      "type": "user",
      "id": "USER#test123"
    },
    "recipients": {
      "mode": "explicit",
      "user_ids": ["USER#test456"]
    },
    "entity": {
      "type": "job",
      "id": "JOB#test789"
    },
    "context": {
      "job_id": "JOB#test789",
      "job_url": "https://haul.app/jobs/test789",
      "posted_at": "2026-01-04T12:00:00Z"
    }
  }
}
```

Invoke the orchestrator directly:

```bash
serverless invoke --function notificationsOrchestrator --path test-event.json --stage dev
```

### 2. Check CloudWatch Logs

```bash
# View orchestrator logs
serverless logs --function notificationsOrchestrator --stage dev --tail

# View email channel logs
serverless logs --function emailChannelHandler --stage dev --tail
```

### 3. Verify SQS Queue Messages

```bash
# Check Email queue
aws sqs get-queue-url --queue-name haul-notifications-email-dev

# Receive messages (without deleting)
aws sqs receive-message \
  --queue-url https://sqs.us-west-2.amazonaws.com/ACCOUNT_ID/haul-notifications-email-dev \
  --max-number-of-messages 10
```

### 4. Check DynamoDB NotificationInbox

```bash
aws dynamodb query \
  --table-name NotificationInbox-dev \
  --key-condition-expression "user_id = :user_id" \
  --expression-attribute-values '{":user_id":{"S":"USER#test456"}}'
```

## Current Limitations

### Resolver Stubs

All resolvers currently return empty arrays. Production implementation requires:

1. **Job Posted Resolver**: Query OpenSearch for providers in service area
2. **Job Canceled Resolver**: Query Bid table for active bidders
3. **Job Closed Resolver**: Query Job table for customer
4. **Bid Created Resolver**: Query Bid + Job tables for customer
5. **Booking Created Resolver**: Query Booking table for provider

**Resolvers perform LOOKUP ONLY**: They return user_ids. The orchestrator handles preferences and delivery.

### Contact Resolution

The email channel has a stubbed `resolveUserEmail()` function that returns null.

**ARCHITECTURAL BOUNDARY**: The notifications service MUST NOT query User identity tables directly.

Production implementation requires integration with an identity/profile service or denormalized contact cache.

### Template System

Email templates are hardcoded in the handler. This is intentional for V1. Do not introduce template engines, S3 storage, or versioning systems unless explicitly required.

## Monitoring

### CloudWatch Alarms (Recommended)

Set up alarms for:
- SQS DLQ message count > 0
- Lambda error rate > 1%
- Pinpoint send failures
- NotificationInbox write failures

### Metrics to Track

- Notifications orchestrated per minute
- Emails sent per minute
- Email delivery success rate
- Average time from event to email sent
- SQS queue depth

## Troubleshooting

### Email Not Sending

1. Verify Pinpoint email channel is enabled
2. Check Pinpoint FROM address is verified via SES
3. Check SES is out of sandbox (Pinpoint email channel is constrained by SES sandbox - sandbox allows verified recipients only)
4. Review IAM permissions for Pinpoint
5. Check CloudWatch logs for errors

### No Recipients Resolved

1. Verify resolver is registered in `resolvers/registry.js`
2. Implement actual recipient lookup logic in resolver
3. Check resolver logs for errors

**Remember**: Resolvers perform lookup only. They MUST NOT evaluate preferences or perform delivery.

### Messages Stuck in DLQ

1. Check CloudWatch logs for Lambda errors
2. Verify message format matches expected schema
3. Check IAM permissions for DynamoDB/Pinpoint
4. Manually inspect DLQ message content

### Contact Resolution Failing

If `resolveUserEmail()` returns null:
1. This is expected in V1 (stub implementation)
2. Messages are marked as terminal failures and not retried
3. Implement integration with identity/profile service to resolve contacts
4. DO NOT query User tables directly from this service

## Next Steps

### Phase 2: Push Notifications

1. Enable Pinpoint APNS/FCM channels in `resources/pinpoint.yml`
2. Implement device endpoint registration (separate service)
3. Update `functions/channels/push/push_handlers.js` to send via Pinpoint
4. Test push delivery end-to-end

Push channel infrastructure exists only to preserve architectural shape and must not be considered active.

### Phase 3: SMS Notifications

1. Complete AWS 10DLC registration
2. Enable Pinpoint SMS channel in `resources/pinpoint.yml`
3. Update `functions/channels/sms/sms_handlers.js` to send via Pinpoint
4. Test SMS delivery

SMS channel infrastructure exists only to preserve architectural shape and must not be considered active.

## Architecture Compliance

This service strictly follows the canonical architecture:

✅ Pinpoint is the ONLY outbound messaging system  
✅ EventBridge ingress managed centrally  
✅ Async fan-out via SQS  
✅ Channel isolation  
✅ Resolver-based recipient resolution (lookup only)  
✅ Always writes to NotificationInbox  
✅ No direct User table queries  
✅ notification_id is service-generated  
✅ event_id is foreign reference only  
