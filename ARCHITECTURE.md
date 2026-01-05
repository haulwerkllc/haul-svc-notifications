# Haul Notifications — System & Architecture Context

This document defines the **canonical architecture, infrastructure boundaries, and code structure** for the `haul-svc-notifications` service.

It is intended to be used as **context for AI coding assistants** (Copilot, Claude 4.5, etc.) so that generated code aligns with Haul’s infrastructure, patterns, and constraints.

This document is authoritative.

---

## Purpose

`haul-svc-notifications` is a **discrete, event-driven serverless service** responsible for **all outbound notifications** across Haul.

It consumes **domain events via EventBridge**, evaluates notification policy and user preferences, and delivers messages asynchronously via:

- Email  
- Push notifications  
- SMS (future)

Other services:
- **MUST NOT** send notifications directly  
- **MUST NOT** integrate with Pinpoint, SES, or SMS providers  
- **MUST** only emit domain events  

---

## Terraform & Infrastructure Ownership

### High-level rule

- **Shared, long-lived state** → defined in **central Haul Terraform**
- **Execution, wiring, and delivery infrastructure** → defined **inside this service**

There is **no KMS usage** in this setup.  
All DynamoDB tables use **default AWS-managed encryption at rest**.

---

## Central Terraform (Haul Infrastructure)

Defined in the main Haul Terraform repo using:

/modules  
/environments/{env}/main.tf  

### Resources owned centrally

- DynamoDB tables  
  - NotificationPreference-{env}  
  - NotificationInbox-{env}  
  - DeviceEndpoint-{env}  

These are long-lived resources shared across services and stored as environmental variables:

in serverless.yml: 

`provider.environment.NOTIFICATION_PREFERENCE_TABLE_NAME`
`provider.environment.NOTIFICATION_INBOX_TABLE_NAME`
`provider.environment.DEVICE_ENDPOINT_TABLE_NAME`

Always reference this first before creating discrete env variables in lambdas.

---

## Notifications Service Terraform (Service-local)

This service owns:

- EventBridge rules  
- SQS queues + DLQs  
- Lambda functions  
- IAM execution roles  
- SES identities  
- Pinpoint application + channels  
- CloudWatch alarms  

Shared DynamoDB tables are read via env variables defined in serverless.yml

---

## Event Ingress Model

All inbound traffic arrives via EventBridge on the default bus.

Producer services publish domain events only and require:

events:PutEvents

They do not know how notifications are delivered.

---

## Runtime Architecture (Async Fan-out)

EventBridge  
→ Notifications Orchestrator  
→ Preference & Policy Engine  
→ Channel Planner  
→ SQS fan-out per channel  
→ Channel-specific Lambda senders  

Each channel is isolated and independently scalable.

---

## Canonical Serverless Service Structure

haul-svc-notifications/
- serverless.yml
- functions/
  - orchestrator/
    - handler.js
    - serverless.yml
    - resolvers/
      - job_posted_resolver.js
      - job_canceled.resolver.js
      - bid_created.resolver.js
      - booking_created.resolver.js
      ...
  - channels/
    - email/
      - email_handlers.js
      - serverless.yml
    - push/
      - push_handlers.js
      - serverless.yml
    - sms/
      - sms_handlers.js
      - serverless.yml
- resources/
  - eventbridge.yml
  - sqs.yml
  - iam.yml
  - ses.yml
  - pinpoint.yml
- middleware/
- utils/
- package.json

## Resolvers

Note the inclusion of the /functions/orchestrator/resolvers directory, which contains lookup and additional logic required to determine recipients. 

Each resolver: 

- Accepts the validated canonical ingress schema
- Returns a list of resolved recipient user_ids (and optionally metadata)

## Orchestrator flow

```
const resolver = resolverRegistry[event.event_type]

if (!resolver) {
  log.warn("No resolver for event type", event.event_type)
  return
}

const recipients = await resolver.resolve(event)

for (const user of recipients) {
  const prefs = await loadNotificationPreferences(user.user_id)
  routeToChannels(user, prefs, event)
}
```

---

## Function Responsibilities

### Orchestrator
- Consumes EventBridge events
- Resolves recipients
- Applies preferences and policy
- Enqueues per-channel messages
- Writes inbox/audit records

### Channel Lambdas
- Consume SQS messages
- Render templates
- Send via SES or Pinpoint
- Update delivery status

They never resolve recipients or preferences.

---

## Channel Enablement

- Phase 1: Email only
- Phase 2: Push enabled
- Phase 3: SMS enabled (after 10DLC)

No refactor required between phases.

---

## Security

- Default AWS-managed encryption
- No KMS
- Least-privilege IAM per Lambda

---

## Notification service namespaces

## All

The following will be the reserved namespaces: 

- `haul.bid.*`
- `haul.booking.*`
- `haul.job.*`
- `haul.company.*`
- `haul.user.*`
- `haul.payment.*`

## Bids

- `haul.bid.created` → customer
- `haul.bid.updated` → customer (only if materially changed)

## Booking

`haul.booking.created` → provider
`haul.booking.assigned` → customer
`haul.booking.in_progress` → customer (push/SMS candidate)
`haul.booking.pending_confirmation` → customer + crew
`haul.booking.completed` → customer + provider
`haul.booking.canceled` → both

## Job

- `haul.job.posted` → providers in service area
- `haul.job.canceled` → providers with active bids
- `haul.job.closed` → customer (bidding closed, select bid)

## Company

[TBD]

## User

[TBD]

## Payments

[TBD]

---

## Canonical EventBridge envelope (explicit)

- All domain data MUST be inside `detail`.
- The orchestrator MUST NOT read from the top-level envelope except for routing.
- The EventBridge `detail-type` value MUST match `detail.event_type`.

Example:

```json
{
  "source": "haul.jobs",
  "detail-type": "haul.job.posted",
  "detail": { /* notification payload */ }
}

---

## Canonical notification ingress schema (detail)

- This schema is the single source of truth for notification ingress.
- Claude MUST NOT invent additional required fields.

```
{
  "event_id": "evt_123",
  "event_type": "haul.job.posted",
  "occurred_at": "ISO-8601 timestamp",

  "actor": {
    "type": "user | system",
    "id": "USER#123 | SYSTEM"
  },

  "recipients": {
    "mode": "service_area | explicit",
    "service_area_ids": ["AREA#la-west"],
    "user_ids": ["USER#abc"]
  },

  "entity": {
    "type": "job | bid | booking",
    "id": "JOB#123"
  },

  "context": {
    "freeform_template_data": true
  }
}
```

---

## OpenSearch Access (Service Area Queries)

OpenSearch may be queried for recipient resolution (e.g., service-area matching).

Requirements:

- `haul-svc-notifications` **MUST** have a mapped IAM role to the OpenSearch domain
  - This mapping may require manual setup and is a common source of issues
- Lambdas that access OpenSearch **MUST** be deployed within the OpenSearch VPC:

```yaml
vpc:
  subnetIds: ${self:custom.env.OPENSEARCH_VPC_SUBNET_IDS, ''}
  securityGroupIds:
    - ${self:custom.env.OPENSEARCH_VPC_SECURITY_GROUP_ID, ''}
```

- OpenSearch client MUST use AWS SigV4 authentication
- Ensure opensearch permission: `es:ESHttpGet`
- OpenSearch permissions MUST be read-only: `es:ESHttpGet`

OpenSearch is treated as a read-only lookup / cache, not a source of truth.

---

## Guidance for AI Assistants

- Follow the directory structure exactly
- Keep all execution async
- Do not bypass the orchestrator
- Do not hardcode resource names
- Use provider-level env variables for shared resources
- Keep Lambdas small and single-purpose
- Do not introduce KMS or synchronous APIs unless explicitly instructed