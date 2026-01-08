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

## Critical Data Model Context

### CompanyRole Table Structure

The `CompanyRole` table defines user membership and permissions within a company.

**CRITICAL:** Each `CompanyRole` item represents a single user's membership in a company and contains a `roles` field that defines **ALL assigned roles** for that user within that company.

```javascript
// CompanyRole item structure
{
  id: "uuid",
  company_id: "uuid",
  user_id: "uuid",
  roles: ["OWNER", "ADMIN"],  // ALL roles assigned to this user in this company
  status: "ACTIVE" | "INACTIVE",
  created_at: "ISO-8601",
  updated_at: "ISO-8601"
}
```

**Valid role values:** `OWNER`, `ADMIN`, `DISPATCHER`, `DRIVER`

**DynamoDB Type Handling:** The `roles` field may be returned as:
- A JavaScript `Set` (when stored as DynamoDB String Set `SS`)
- A JavaScript `Array` (when stored as DynamoDB List `L`)
- A single string value (edge case)

**When querying for users with specific roles:**
```javascript
// CORRECT: Normalize roles and check for target roles
const userRoles = record.roles instanceof Set
  ? Array.from(record.roles)
  : (Array.isArray(record.roles) ? record.roles : (record.roles ? [record.roles] : []));

const hasNotifiableRole = userRoles.some(role => 
  ['OWNER', 'ADMIN', 'DISPATCHER'].includes(role)
);

// WRONG: Do not assume a single `role` attribute
// record.role === 'ADMIN'  // ❌ INCORRECT - attribute is `roles` (plural)

// WRONG: Do not assume roles is always an array
// record.roles.some(...)  // ❌ May fail if roles is a Set
```

### Shared Helper: resolveUsersByCompanyRole

Location: `utils/company-role-lookup.js`

**ALWAYS use this helper when resolving company users for notifications.** It handles:
- Normalizing `roles` field (Set, Array, or single value)
- Querying by `companyId-index` GSI
- Deduplicating users across multiple companies
- Filtering by ACTIVE status

```javascript
const { resolveUsersByCompanyRole } = require('../../../utils/company-role-lookup');

// Simple usage - returns [{ user_id: 'xxx' }, ...]
const recipients = await resolveUsersByCompanyRole({
  companyIds: ['company-1', 'company-2'],  // Array or single string
  eligibleRoles: ['OWNER', 'ADMIN', 'DISPATCHER'],
  includeMetadata: false,  // Optional, default false
  logPrefix: 'MyResolver'  // Optional, for log context
});

// With metadata - returns [{ user_id, metadata: { company_id, roles, primary_role } }, ...]
const recipients = await resolveUsersByCompanyRole({
  companyIds: 'single-company-id',
  eligibleRoles: ['OWNER', 'ADMIN'],
  includeMetadata: true
});
```

**Do NOT reimplement this logic in individual resolvers.**

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

### EventBridge Routing Rule

A single EventBridge rule defined in central Terraform routes **all** `haul.*` events to the notifications orchestrator:

```
rule_name = "notifications-${var.env}"
```

This rule uses a wildcard pattern to match all events with a `detail-type` starting with `haul.`. No additional EventBridge rules are required when adding new event types — simply implement a resolver in the orchestrator.

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

### Resolver Contract

**Resolvers MUST:**
- Return `user_id` for each recipient
- Optionally return `metadata` describing the recipient's relationship to the event
- Log resolution start, missing data, and final recipient count
- Return `[]` on failure (never throw)

**Resolvers MUST NOT:**
- Select templates
- Choose delivery channels
- Perform delivery
- Load notification preferences
- Bypass the orchestrator

**Resolver Return Format:**
```javascript
[
  {
    user_id: "uuid",
    metadata: {
      recipient_type: "customer" | "driver" | "provider",
      // Additional context as needed
    }
  }
]
```

**Metadata Usage:**
- The `metadata` field allows resolvers to describe the recipient's relationship to the event
- The orchestrator uses this metadata to select appropriate templates, tone, and copy
- Common `recipient_type` values: `customer`, `driver`, `provider`
- Resolvers MUST NOT make presentation decisions — only describe the relationship

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

## Email templates

Email templates are built programmatically in `/functions/channels/email/templates.js` using brand-compliant HTML.

### Design Principles

Per `brand-guidelines.md`:
- Calm, competent, quietly confident
- Short sentences, active voice
- No exclamation points or emojis in core flows
- Color is functional, not expressive
- Practical and respectful of users' time

### Template Types

**Service Provider Templates**
- Primary color (light theme): #171717
- Logo: Black Haul wordmark (`haul_wordmark_icon_black.svg`)
- Used for: job notifications, booking assignments, etc.

**Consumer Templates**  
- Primary color (light theme): #3a4a63
- Logo: Charcoal Blue Haul wordmark (`haul_wordmark_icon_blue_char.svg`)
- Used for: bid updates, booking confirmations, etc.

### Template Structure

Each template includes:
1. **Header** - Haul logo (single use per email)
2. **Body** - Event-specific content with structured details
3. **CTA** - Single primary action button
4. **Footer** - Why they received it, preference link, support contact

### Template Return Format

All email template functions MUST return an object with three properties:

```javascript
{
  subject: string,  // Email subject line
  html: string,     // HTML version of email body
  text: string      // Plain text version of email body
}
```

**Requirements:**
- The `text` field is required by Amazon SES and must mirror the HTML content
- Plain text should include all key information, links, and footer content
- Use line breaks (`\n`) and simple formatting for readability
- Both HTML and text versions should convey the same information

### Available Assets

All assets are hosted at `https://cdn.haulwerk.com/images/`

- Must conform to design guidelines in `.gpt-agents/designer.yaml`
- Primary colors for service provider facing emails: 
  - If LIGHT theme: #171717
  - If DARK theme: #f9fafb
- Primary colors for consumer facing emails: 
  - If LIGHT theme: #3a4a63
  - If DARK theme: #f9fafb  
- Email templates may use the following assets exist across all environments:

### Charcoal Blue Haul Icon
- For use in CONSUMER facing emails
- For use in LIGHT THEME email templates
- Single Haul square brand icon
- Does not contain wordmark treatment for "haul"
- Square aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_icon_blue_char.svg`

### Charcoal White Haul Icon
- For use in CONSUMER facing emails
- For use in DARK THEME email templates
- Single Haul square brand icon
- Does not contain wordmark treatment for "haul"
- Square aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_icon_white_char.svg`

### Charcoal Blue Haul Logo
- For use in CONSUMER facing emails
- For use in LIGHT THEME email templates
- Single Haul square brand icon with "haul" wordmark
- Landscape aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_wordmark_icon_blue_char.svg`

### Charcoal White Haul Logo
- For use in CONSUMER facing emails
- For use in LIGHT THEME email templates
- Single Haul square brand icon with "haul" wordmark
- Landscape aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_wordmark_icon_white_char.svg`

### Black Haul Icon
- For use in SERVICE PROVIDER facing emails
- For use in LIGHT THEME email templates
- Single Haul square brand icon
- Does not contain wordmark treatment for "haul"
- Square aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_icon_black.svg`

### White Haul Icon
- For use in SERVICE PROVIDER facing emails
- For use in LIGHT THEME email templates
- Single Haul square brand icon
- Does not contain wordmark treatment for "haul"
- Square aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_icon_white.svg`

### Black Haul Logo
- For use in CONSUMER facing emails
- For use in LIGHT THEME email templates
- Single Haul square brand icon with "haul" wordmark
- Landscape aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_wordmark_icon_black.svg`

### White Haul Logo
- For use in CONSUMER facing emails
- For use in LIGHT THEME email templates
- Single Haul square brand icon with "haul" wordmark
- Landscape aspect ratio
- URI: `https://cdn.haulwerk.com/images/haul_wordmark_icon_white.svg`

---

## Guidance for AI Assistants

- Follow the directory structure exactly
- Keep all execution async
- Do not bypass the orchestrator
- Do not hardcode resource names
- Use provider-level env variables for shared resources
- Keep Lambdas small and single-purpose
- Do not introduce KMS or synchronous APIs unless explicitly instructed