# Support Ticketing System — Requirements Document

**Version:** 1.0
**Date:** February 2026
**Status:** Implemented

---

## 1. Overview

The support ticketing system provides a unified support infrastructure integrated directly into the Sensei AI copilot. Rather than a separate support portal, users interact with support through the same Sensei chat interface they use for everything else. Superadmins manage tickets through a dedicated admin page.

### 1.1 Design Principles

- **Chat-first**: Users never leave Sensei to get support. Escalation, ticket creation, and responses all happen through natural conversation.
- **AI-augmented**: Sensei detects frustration, offers escalation proactively, and learns from resolved tickets via a knowledge base.
- **Minimal friction**: No separate login, no support portal, no email threads. Notifications flow back through the same channels.
- **Telemetry-driven**: System errors and failures automatically create tickets without user intervention.

### 1.2 Actors

| Actor | Description |
|-------|-------------|
| **User** | Authenticated platform user. Interacts with support exclusively via Sensei chat and notifications. |
| **Superadmin** | Platform operator (identified by `PLATFORM_SUPERADMIN_EMAIL` env var). Manages all tickets via `/admin/tickets`. |
| **Sensei** | AI copilot. Detects escalation triggers, creates tickets, relays responses, and learns from the knowledge base. |
| **System** | Automated telemetry. Creates tickets from scan failures, billing errors, auth errors, and other system faults. |
| **Public visitor** | Unauthenticated user. Can submit tickets via the `/contact` form only. |

---

## 2. Data Model

### 2.1 SupportTicket

**Firestore collection:** `support_tickets`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ticket ID (prefix: `tkt-`) |
| `userId` | `string?` | Authenticated user's Firebase UID. Null for public contact form submissions. |
| `name` | `string` | Submitter's display name |
| `email` | `string` | Submitter's email address |
| `company` | `string?` | Optional company name |
| `category` | `TicketCategory` | Ticket classification (see below) |
| `subject` | `string` | Brief subject line |
| `message` | `string` | Full ticket description / initial message |
| `source` | `TicketSource` | How the ticket was created (see below) |
| `channel` | `'web' \| 'slack' \| 'whatsapp'` | Channel the user was on when the ticket was created |
| `transcript` | `TranscriptEntry[]?` | Sensei conversation history at time of escalation |
| `status` | `TicketStatus` | Current lifecycle state (see below) |
| `priority` | `TicketPriority` | Urgency level (see below) |
| `assignedTo` | `string?` | Admin user ID (reserved for future multi-admin) |
| `responses` | `TicketResponse[]` | Thread of responses from both admin and user |
| `createdAt` | `string` (ISO 8601) | Ticket creation timestamp |
| `updatedAt` | `string` (ISO 8601) | Last modification timestamp |
| `resolvedAt` | `string?` (ISO 8601) | When ticket was resolved or closed |

#### TicketCategory

| Value | Description |
|-------|-------------|
| `general` | General inquiry |
| `support` | Technical support |
| `sales` | Sales question |
| `enterprise` | Enterprise plan inquiry |
| `billing` | Billing / payment issue |
| `security` | Security concern or vulnerability report |
| `escalation` | Sensei-initiated escalation from chat |

#### TicketSource

| Value | Description |
|-------|-------------|
| `contact_form` | Public `/contact` page submission |
| `sensei_escalation` | Created by Sensei's `escalate_to_human` action |
| `api` | System-generated (telemetry, cron, internal API) |

#### TicketStatus

| Value | Description | Transitions to |
|-------|-------------|----------------|
| `open` | New ticket, awaiting admin attention | `in_progress`, `resolved`, `closed` |
| `in_progress` | Admin is actively working on it | `waiting_on_customer`, `resolved`, `closed` |
| `waiting_on_customer` | Admin responded, awaiting user reply | `open` (when user responds), `resolved`, `closed` |
| `resolved` | Issue resolved | `closed`, `open` (if reopened) |
| `closed` | Ticket closed permanently | Terminal state — user cannot respond |

#### TicketPriority

| Value | Default for |
|-------|-------------|
| `low` | — |
| `normal` | Contact form, telemetry (default) |
| `high` | Sensei escalations, security reports |
| `urgent` | Telemetry with explicit urgent flag |

#### TicketResponse

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique response ID (prefix: `resp-`) |
| `author` | `string` | User ID or admin ID of the responder |
| `authorName` | `string` | Display name of the responder |
| `message` | `string` | Response text |
| `createdAt` | `string` (ISO 8601) | Response timestamp |
| `internal` | `boolean` | If true, only visible to admins (internal note) |

#### TranscriptEntry

| Field | Type | Description |
|-------|------|-------------|
| `role` | `'user' \| 'assistant'` | Who sent the message |
| `text` | `string` | Message content |
| `timestamp` | `string?` | When the message was sent |

### 2.2 KnowledgeEntry

**Firestore collection:** `sensei_knowledge`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique entry ID (prefix: `kb-`) |
| `question` | `string` | The question / pattern this entry answers |
| `answer` | `string` | The canonical answer |
| `category` | `string` | Topic category |
| `keywords` | `string[]` | Search keywords for matching |
| `sourceTicketId` | `string?` | Ticket that originated this entry |
| `createdBy` | `string` | Admin email who created the entry |
| `createdAt` | `string` (ISO 8601) | Creation timestamp |
| `updatedAt` | `string` (ISO 8601) | Last update timestamp |
| `enabled` | `boolean` | Whether Sensei should use this entry |

---

## 3. Ticket Creation Flows

### 3.1 Public Contact Form

**Path:** `/contact`
**Auth:** Not required
**API:** `POST /api/contact`

1. Visitor fills out the contact form: name, email, optional company, category selector (6 options), subject, message.
2. Form submits to `POST /api/contact` with `source: 'contact_form'`.
3. API validates required fields and email format.
4. Ticket created in Firestore with `status: 'open'`, `priority: 'normal'`.
5. Form shows success confirmation to the visitor.

**Category selector options:** General, Technical Support, Sales, Enterprise, Billing, Security.

### 3.2 Sensei Escalation

**Trigger:** User frustration or explicit request in Sensei chat
**Auth:** Required (authenticated user)
**Action:** `escalate_to_human`

1. Sensei detects one of the following escalation triggers:
   - User explicitly asks to talk to a human, support team, or asks to escalate.
   - User expresses strong frustration (e.g., "this is broken", "nothing works", repeated failed attempts).
   - Sensei genuinely cannot help with the issue (billing disputes, account recovery, platform bugs).
   - User has asked the same question 3+ times without resolution.
2. Sensei asks for confirmation: *"Would you like me to escalate this to our support team?"*
3. On confirmation, Sensei sets `actionType: 'escalate_to_human'` with:
   - `ticketSubject` — Brief subject line summarizing the issue.
   - `ticketSummary` — AI-generated 2-3 sentence summary including what was tried.
4. Server-side executor (`executeEscalateToHuman`) creates the ticket:
   - Builds transcript from conversation history.
   - Sets `source: 'sensei_escalation'`, `category: 'escalation'`, `priority: 'high'`.
   - Stores full Sensei transcript on the ticket.
5. Two notifications dispatched:
   - **To user:** `support_ticket_created` — "Your issue has been escalated to our support team."
   - **To superadmin:** `support_ticket_new` — "New escalation from [userName]" with AI summary.
6. Sensei confirms to user: *"I've created a support ticket. Our team will review the conversation and get back to you."*

### 3.3 Telemetry (Automated)

**Trigger:** System errors detected in code
**Auth:** Server-side only (no user interaction)
**Function:** `createTelemetryTicket(options)`

1. Error handlers in the application call `createTelemetryTicket()` when they catch failures.
2. Currently wired into:
   - Scan failures (`src/app/api/scans/route.ts`) — fires when a scan's tool runner throws.
3. Ticket created with `source: 'api'`, `priority` based on severity.
4. Notifications dispatched:
   - **To superadmin:** `support_ticket_new` with category prefix (e.g., `[scan_failure] Scan failed: scn-abc123`).
   - **To affected user** (if `userId` provided): `support_ticket_created` — "We noticed an issue and our team is looking into it."

**Telemetry categories:** `scan_failure`, `billing_error`, `auth_error`, `api_error`, `system_error`.

### 3.4 Admin API

**API:** `POST /api/admin/tickets`
**Auth:** Admin API key (`x-admin-api-key` header) or superadmin session

System-generated tickets for internal use. Accepts arbitrary ticket data with defaults for `name: 'System'` and `email: 'system@bugrit.com'`.

---

## 4. User-Facing Features

### 4.1 Ticket Awareness in Sensei

When a user has open tickets, Sensei is made aware through context injection:

1. On every chat message, the client fetches `GET /api/tickets?status=active`.
2. Active tickets (status: open, in_progress, or waiting_on_customer) are included in Sensei's context.
3. Sensei's system prompt includes the ticket list with the last admin response.
4. If the user mentions a ticket or wants to reply, Sensei uses the `reply_to_ticket` action.

**Context format sent to Sensei:**
```
Open support tickets:
  - [tkt-abc123] "Can't access scan results" (waiting_on_customer) — Last response from Admin: "Could you try clearing your cache..."
```

### 4.2 Responding to Tickets via Sensei

**Action:** `reply_to_ticket`
**API:** `POST /api/tickets/[ticketId]/respond`

1. User says something like "tell support I tried that and it still doesn't work."
2. Sensei extracts the response message and ticket ID from context.
3. Sets `actionType: 'reply_to_ticket'` with `ticketId` and `ticketReply`.
4. Client-side handler calls `POST /api/tickets/[ticketId]/respond`.
5. API validates:
   - User owns the ticket (`userId` match).
   - Ticket is not closed.
   - Message is non-empty and under 5000 characters.
6. Response added to ticket, status set back to `open`.
7. Superadmin notified via `support_ticket_new` notification.
8. Sensei confirms: *"Your response has been sent to the support team."*

### 4.3 Receiving Admin Responses

1. Admin responds to a ticket via `/admin/tickets`.
2. If the response is not an internal note:
   - Ticket status set to `waiting_on_customer`.
   - Notification created for user: `support_response` type.
   - Notification title: "Support team responded to your ticket."
   - Notification includes admin's response preview and link.
3. User sees notification in Sensei's notification area.
4. Next time user chats with Sensei, the ticket with admin's response is in context.
5. User can reply naturally through Sensei chat.

### 4.4 Ticket Visibility

- Users can only see their own tickets (`userId` filter on all queries).
- Internal notes (admin-only) are filtered out from user-facing API responses.
- Closed tickets are excluded from Sensei context (only active tickets shown).
- Users cannot reopen closed tickets through Sensei.

---

## 5. Admin Features

### 5.1 Tickets Dashboard

**Path:** `/admin/tickets`
**Auth:** Superadmin only
**Navigation:** "Support Tickets" link in dashboard nav (both mobile sidebar and desktop dropdown), with ticket icon.

#### Layout
- **Left panel (1/3):** Ticket list with status filter tabs.
- **Right panel (2/3):** Selected ticket detail view.

#### Ticket List
- Status filter tabs: Open, In Progress, Waiting on Customer, Resolved, Closed.
- Each ticket shows: subject, submitter name, source badge, status, priority indicator, response count.
- Ordered by creation date (newest first).
- Max 50 tickets per query.

#### Ticket Detail View
- **Header:** Subject, status badge, priority, creation date.
- **Original message:** Full ticket description.
- **Sensei transcript** (if source is `sensei_escalation`): Collapsible section showing the full conversation that led to escalation.
- **Response thread:** Chronological list of all responses.
  - Admin responses: Standard styling.
  - User responses: Highlighted in blue.
  - Internal notes: Highlighted in yellow, marked as "Internal Note".
- **Save to KB button:** On each admin response, a button to save the Q&A to the Sensei knowledge base.
- **Reply form:** Text area with "Internal note" checkbox toggle.
- **Status actions:** "In Progress", "Resolve", "Close" buttons.

### 5.2 Responding to Tickets

**API:** `POST /api/admin/tickets/[ticketId]`

1. Admin types response and optionally marks it as an internal note.
2. Response added to ticket's `responses` array.
3. If NOT internal:
   - Ticket status set to `waiting_on_customer`.
   - User notification created: `support_response` type with response preview.
4. If internal:
   - No status change.
   - No user notification.
   - Only visible to admins in the response thread.

### 5.3 Status Management

**API:** `PATCH /api/admin/tickets/[ticketId]`

| Action | Sets status to | Side effects |
|--------|---------------|--------------|
| "In Progress" | `in_progress` | — |
| "Resolve" | `resolved` | Sets `resolvedAt` timestamp |
| "Close" | `closed` | Sets `resolvedAt` timestamp |

### 5.4 Knowledge Base Management

**Save to KB** converts an admin response into a reusable knowledge base entry:

1. Admin clicks "Save to KB" on a specific response.
2. A form pre-fills with:
   - `question`: The original ticket subject.
   - `answer`: The admin's response text.
   - `sourceTicketId`: Link back to the originating ticket.
3. Admin can edit and submit.
4. Entry saved to `sensei_knowledge` collection with `enabled: true`.
5. On subsequent chat sessions, `loadKnowledgeBase()` loads enabled entries and injects them into Sensei's system prompt.

**Knowledge Base API:** `GET /POST /api/admin/knowledge`
- GET: Lists up to 200 enabled entries (superadmin only).
- POST: Creates new entry with question, answer, category, keywords (superadmin only).

### 5.5 Knowledge Base in Sensei

At query time, Sensei loads the knowledge base:

1. `loadKnowledgeBase()` queries `sensei_knowledge` where `enabled == true`, ordered by `createdAt DESC`, limit 50.
2. Entries formatted as Q&A pairs and appended to the system prompt under a "Knowledge Base" section.
3. Sensei uses these entries to answer common questions without requiring escalation.

This creates a feedback loop: escalated tickets -> admin responses -> saved to KB -> Sensei learns -> fewer future escalations.

---

## 6. Notification Events

### 6.1 Support-Related Events

| Event Type | Recipient | Trigger | Severity | Transactional |
|-----------|-----------|---------|----------|---------------|
| `support_ticket_created` | User | Ticket created on their behalf (escalation or telemetry) | `info` | Yes |
| `support_ticket_new` | Superadmin | New ticket received or user responded | `warning` / `info` | No |
| `support_response` | User | Admin responded to their ticket (non-internal) | `info` | Yes |

### 6.2 Delivery Channels

All support notification events default to `['email', 'in_app']` channels.

**Transactional events** (`support_ticket_created`, `support_response`) cannot have email disabled — they always deliver via email even if the user has disabled notifications globally.

### 6.3 Quiet Hours

Support notifications follow quiet hours settings, except:
- Transactional events (`support_ticket_created`, `support_response`) bypass quiet hours for non-in_app channels.
- In-app notifications are always delivered regardless of quiet hours.

---

## 7. API Reference

### 7.1 Public Endpoints

#### POST /api/contact
Create a support ticket (no authentication required).

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Inc",
  "category": "support",
  "subject": "Can't access scan results",
  "message": "I ran a scan yesterday but the results page shows a 404..."
}
```

**Response (201):**
```json
{
  "ticketId": "tkt-abc123",
  "message": "Thank you! We'll get back to you shortly."
}
```

### 7.2 User Endpoints (Authenticated)

#### GET /api/tickets?status=active
List the authenticated user's tickets.

**Query parameters:**
- `status` — Filter by status. Use `active` for open + in_progress + waiting_on_customer. Default: `open`.

**Response (200):**
```json
{
  "tickets": [
    {
      "id": "tkt-abc123",
      "subject": "Can't access scan results",
      "status": "waiting_on_customer",
      "category": "support",
      "message": "I ran a scan yesterday...",
      "responses": [
        {
          "id": "resp-xyz789",
          "authorName": "Support Team",
          "message": "Could you try clearing your browser cache?",
          "createdAt": "2026-02-09T12:00:00Z"
        }
      ],
      "createdAt": "2026-02-08T10:00:00Z",
      "updatedAt": "2026-02-09T12:00:00Z"
    }
  ]
}
```

Note: Internal notes are filtered out from the `responses` array.

#### POST /api/tickets/:ticketId/respond
Add a user response to their own ticket.

**Request:**
```json
{
  "message": "I tried clearing the cache but the issue persists."
}
```

**Response (200):**
```json
{
  "success": true,
  "response": {
    "id": "resp-abc456",
    "author": "user-uid-123",
    "authorName": "Jane Doe",
    "message": "I tried clearing the cache but the issue persists.",
    "createdAt": "2026-02-09T14:00:00Z",
    "internal": false
  }
}
```

**Error responses:**
- `400` — Ticket is closed, message missing, or message too long (max 5000 chars).
- `403` — User does not own this ticket.
- `404` — Ticket not found.

### 7.3 Admin Endpoints (Superadmin)

#### GET /api/admin/tickets?status=open&category=support&limit=50
List all tickets with optional filters.

**Query parameters:**
- `status` — Filter by ticket status.
- `category` — Filter by ticket category.
- `limit` — Max results (default 50, max 200).

#### GET /api/admin/tickets/:ticketId
Get full ticket details including all responses and transcript.

#### PATCH /api/admin/tickets/:ticketId
Update ticket status, priority, or assignment.

**Request:**
```json
{
  "status": "resolved",
  "priority": "high",
  "assignedTo": "admin-uid-456"
}
```

#### POST /api/admin/tickets/:ticketId
Add an admin response (optionally internal).

**Request:**
```json
{
  "message": "This was a known bug. We've deployed a fix.",
  "internal": false
}
```

#### POST /api/admin/tickets
Create a system-generated ticket (also accepts `x-admin-api-key` header).

#### GET /api/admin/knowledge
List all knowledge base entries.

#### POST /api/admin/knowledge
Create a new knowledge base entry.

**Request:**
```json
{
  "question": "How do I access scan results?",
  "answer": "Navigate to the Scans page and click on the scan ID. If you see a 404, try clearing your browser cache.",
  "category": "scans",
  "keywords": ["scan", "results", "404", "access"],
  "sourceTicketId": "tkt-abc123"
}
```

---

## 8. Sensei Integration

### 8.1 Action Types

| Action | Trigger | Parameters |
|--------|---------|------------|
| `escalate_to_human` | User frustration or explicit request | `ticketSubject`, `ticketSummary` |
| `reply_to_ticket` | User wants to respond to admin message | `ticketId`, `ticketReply` |

### 8.2 Context Schema

Sensei receives open ticket context on every message:

```typescript
openTickets?: Array<{
  id: string;           // Ticket ID for reply_to_ticket action
  subject: string;      // Ticket subject
  status: string;       // Current status
  lastResponse?: string;       // Last admin response text (if any)
  lastResponseFrom?: string;   // Name of last responder
  updatedAt?: string;          // Last update timestamp
}>
```

### 8.3 System Prompt Injection

When the user has open tickets, Sensei's system prompt includes:

```
Open support tickets:
  - [tkt-abc123] "Can't access scan results" (waiting_on_customer) — Last response from Support Team: "Could you try clearing your browser cache?"
If the user mentions a ticket or wants to reply to support, use reply_to_ticket with the ticket ID and their message.
```

### 8.4 Knowledge Base Injection

Sensei's system prompt includes a "Knowledge Base" section with Q&A pairs loaded from `sensei_knowledge`:

```
## Knowledge Base (use these for answering common questions)
Q: How do I access scan results?
A: Navigate to the Scans page and click on the scan ID. If you see a 404, try clearing your browser cache.
```

Up to 50 enabled entries are loaded per request.

### 8.5 Escalation Safeguards

- Sensei **always asks for confirmation** before escalating: *"Would you like me to escalate this to our support team?"*
- Sensei only escalates after the user explicitly confirms.
- The full conversation transcript is attached to the ticket automatically.

---

## 9. Firestore Collections

| Collection | Purpose | Index Requirements |
|-----------|---------|-------------------|
| `support_tickets` | Primary ticket storage | `userId` + `status` + `updatedAt` (composite); `status` + `createdAt` (composite) |
| `sensei_knowledge` | Sensei knowledge base entries | `enabled` + `createdAt` (composite) |
| `notifications` | In-app notifications for all event types | `userId` + `read` + `createdAt` (composite) |
| `notificationPreferences` | Per-user notification settings | `userId` (unique) |

---

## 10. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PLATFORM_SUPERADMIN_EMAIL` | Yes | Email of the superadmin user. Used for admin auth checks and notification routing. |
| `ADMIN_API_KEY` | Optional | API key for system-generated ticket creation via `POST /api/admin/tickets`. |

---

## 11. Sequence Diagrams

### 11.1 Sensei Escalation Flow

```
User                    Sensei                  Server                  Firestore            Superadmin
  |                       |                       |                       |                       |
  |-- "this is broken" -->|                       |                       |                       |
  |                       |-- (detects frustration)|                      |                       |
  |<- "Want me to        |                       |                       |                       |
  |   escalate?" --------|                       |                       |                       |
  |-- "yes" ------------->|                       |                       |                       |
  |                       |-- escalate_to_human -->|                      |                       |
  |                       |                       |-- create ticket ----->|                       |
  |                       |                       |-- notify user ------->|                       |
  |                       |                       |-- notify admin ------>|-- notification ------->|
  |                       |<-- ticketId -----------|                       |                       |
  |<- "Ticket created.   |                       |                       |                       |
  |   We'll get back     |                       |                       |                       |
  |   to you." ----------|                       |                       |                       |
```

### 11.2 Admin Response Flow

```
Superadmin              Admin UI                Server                  Firestore            User (via Sensei)
  |                       |                       |                       |                       |
  |-- type response ----->|                       |                       |                       |
  |-- click Send -------->|                       |                       |                       |
  |                       |-- POST response ------>|                      |                       |
  |                       |                       |-- add to responses -->|                       |
  |                       |                       |-- set waiting ------->|                       |
  |                       |                       |-- create notif ------>|-- notification ------->|
  |                       |<-- success ------------|                       |                       |
  |                       |                       |                       |                       |
  |                       |                       |      (later, user opens Sensei)                |
  |                       |                       |                       |<-- GET /api/tickets ---|
  |                       |                       |                       |-- ticket context ----->|
  |                       |                       |                       |                       |
  |                       |                       |                       |  (user says "tell them |
  |                       |                       |                       |   I tried that")       |
  |                       |                       |<-- reply_to_ticket ---|<-- reply_to_ticket ----|
  |                       |                       |-- add response ----->|                        |
  |                       |                       |-- notify admin ----->|-- notification -------->|
```

### 11.3 Knowledge Base Learning Loop

```
Ticket Created --> Admin Resolves --> Admin Clicks "Save to KB" --> Entry in sensei_knowledge
                                                                          |
User Asks Similar Question --> Sensei Loads KB --> Answers from KB --> No Escalation Needed
```

---

## 12. File Inventory

| File | Purpose |
|------|---------|
| `src/app/api/contact/route.ts` | Public ticket creation API + SupportTicket type definition |
| `src/app/api/tickets/route.ts` | User ticket listing API |
| `src/app/api/tickets/[ticketId]/respond/route.ts` | User ticket response API |
| `src/app/api/admin/tickets/route.ts` | Admin ticket listing + system ticket creation |
| `src/app/api/admin/tickets/[ticketId]/route.ts` | Admin ticket detail, status update, respond |
| `src/app/api/admin/knowledge/route.ts` | Knowledge base CRUD API |
| `src/app/contact/page.tsx` | Public contact form UI |
| `src/app/admin/tickets/page.tsx` | Admin ticket management UI |
| `src/lib/support/telemetry-tickets.ts` | Automated ticket creation from errors |
| `src/lib/sensei/actions/executor.ts` | Server-side Sensei action executor (escalate + reply) |
| `src/ai/flows/sensei-chat.ts` | Sensei AI flow (action schema, system prompt, KB loading) |
| `src/contexts/sensei-context.tsx` | Client-side Sensei state (ticket context, action handling) |
| `src/lib/notifications/dispatcher.ts` | Notification dispatch functions |
| `src/lib/notifications/preferences.ts` | Notification event types + user preference management |
| `src/components/dashboard-nav.tsx` | Admin nav link for tickets page |
| `src/lib/firestore.ts` | Firestore collection constants |
