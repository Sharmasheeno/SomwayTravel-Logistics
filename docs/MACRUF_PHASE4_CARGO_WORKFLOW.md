# Macruf Phase 4 Cargo Workflow

Date: 2026-08-30

## 1. Old Cargo Workflow

Cargo previously used manually selected display statuses: `In Transit`, `Arrived`, `Delivered`, and `Claim`. There was no authoritative transition validator or status history.

## 2. New Canonical Lifecycle

Stored canonical statuses are `received`, `in_transit`, `arrived`, `ready_for_collection`, `delivered`, `cancelled`, and legacy-compatible `claim`.

## 3. Status Transition Table

Normal transitions are `received -> in_transit`, `received -> cancelled`, `in_transit -> arrived`, `in_transit -> cancelled`, `arrived -> ready_for_collection`, `arrived -> delivered`, `arrived -> cancelled`, `ready_for_collection -> delivered`, and `ready_for_collection -> cancelled`. `delivered`, `cancelled`, and `claim` are terminal for normal workflow.

## 4. Role/Branch Permission Matrix

Owners can perform workflow actions across branches. Origin operators can dispatch cargo from their branch. Destination operators can mark incoming cargo arrived, ready, or delivered. Operators from unrelated branches cannot perform lifecycle actions.

## 5. Status History Design

Cargo uses an embedded `statusHistory` array because Macruf is a compact agency system and expected cargo lifecycle event volume per shipment is small.

## 6. Timestamp Fields

Lifecycle timestamps include `receivedAt`, `dispatchedAt`, `arrivedAt`, `readyForCollectionAt`, `deliveredAt`, and `cancelledAt`.

## 7. Actor Fields

Lifecycle actor fields include `receivedByUserId`, `dispatchedByUserId`, `arrivedByUserId`, `readyForCollectionByUserId`, `deliveredByUserId`, and `cancelledByUserId`. History entries also record user id, user name, branch, time, from status, and to status.

## 8. Incoming/Outgoing Cargo Behavior

One Cargo record travels across branches. Operators can view cargo where their branch is origin, destination, or paid-by branch; action permissions are narrower than visibility.

## 9. Route-Locking Behavior

After dispatch, normal operators cannot change origin or destination branch through entity persistence. Owner correction remains possible but should be treated as an audited operational correction in a later hardening pass.

## 10. Cancellation Behavior

Cancellation is allowed before terminal delivery according to transition rules and requires a reason through the transition service.

## 11. Claim Compatibility Decision

Legacy `Claim` appears in the old app as a cargo status and public special case, but no code or documentation explains whether it means damage, loss, complaint, or another issue. Phase 4 preserves it as terminal `claim` and records a migration history entry. MACRUF BUSINESS DECISION REQUIRED before redesigning Claim as an issue subtype.

## 12. Public Tracking Mapping

Public cargo tracking displays safe status labels from the canonical lifecycle and includes a customer-safe timeline with status, label, and timestamp only.

## 13. Internal Tracking Mapping

Internal tracking reads the same Cargo `status` and `statusHistory`; no second status source was added.

## 14. Dashboard Mapping

Dashboard status mapping should group cargo into Received, In Transit, Arrived/Ready, and Delivered using canonical status keys.

## 15. Third-Branch Workflow Result

Automated tests cover Hargeisa to Nairobi and Nairobi to Hargeisa transitions without source-code branch coupling.

## 16. Migration Results

`runPhase4Migration()` is idempotent. It reports cargo scanned, status normalized, history initialized, Claim records, skipped records, and unresolved records. It does not fabricate historical dispatch/arrival/delivery timestamps.

## 17. Existing Email Compatibility

Manual Resend status email remains manual. Cargo email now displays canonical status labels and still uses existing transaction snapshot fields.

## 18. Future WhatsApp Event Readiness

History event names are stable for future notification work: `cargo_received`, `cargo_in_transit`, `cargo_arrived`, `cargo_ready_for_collection`, `cargo_delivered`, `cargo_cancelled`, and `cargo_claim`. No Twilio code was added.

## 19. Test Results

Phase 4 adds automated cargo workflow tests for valid/invalid transitions, branch permissions, third-branch routing, incoming visibility, history recording, and legacy Claim migration.

## 20. Deferred Phase 5+ Work

Payment ledger, partial payments, supplier payment ledger, Daily Close redesign, Twilio WhatsApp, notification queues, and proof-of-delivery complexity remain deferred.
