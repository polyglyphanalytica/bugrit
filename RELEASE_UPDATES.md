# Release Updates – Sensei-first

## Claude-led Notification & Admin Work
- Multi-channel notification service now aggregates syndrome alerts, help messaging, and onboarding hints into a single Sensei-managed stream using email, Slack, WhatsApp, in-app, and native mobile channels.
- Transactional vs. marketing flags are in place with at least one transactional channel always live.
- Admin composer (superadmin) stub is staged for publishing notifications with module context and telemetry data.

## Release Status
- Dev pipeline (Sensei module chat + Firestore host resolver + telemetry) completed. Remaining: final QA2 alert instrumentation and Stripe sync visibility.
- Current progress ≈83% complete with Claude owning notifications and Codex continuing UI tasks.
