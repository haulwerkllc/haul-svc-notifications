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
- Do not send notifications directly  
- Do not integrate with Pinpoint, SES, or SMS providers  
- Only emit domain events  

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


## Guidance for accessing OpenSearch for Queries (e.g., service areas)

- Ensure `haul-svc-notifications` has mapped role to OS instance (helpful with troubleshooting as this is done manually)
- Ensure lambdas calling OpenSearch instance are configured within opensearch VPC:

  ```
  vpc:
      subnetIds: ${self:custom.env.OPENSEARCH_VPC_SUBNET_IDS, ''}
      securityGroupIds:
        - ${self:custom.env.OPENSEARCH_VPC_SECURITY_GROUP_ID, ''}
  ```

- Instantiate OpenSearch client with AWS SigV4 authentication (can be placed in utils directory)
- Ensure opensearch permission: `es:ESHttpGet`

---

## Guidance for AI Assistants

- Follow structure exactly
- Keep everything async
- Do not bypass orchestrator
- Do not hardcode resource names
- Load shared resources from SSM
- Keep Lambdas small and focused
