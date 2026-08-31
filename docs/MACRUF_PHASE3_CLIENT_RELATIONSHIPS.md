# Macruf Phase 3 Client Relationships

Date: 2026-08-30

## 1. Client Model Changes

Clients are now the agency-wide identity record for customer relationships. The model keeps `name`, `phone`, `normalizedPhone`, optional `email`, optional `homeBranchId`, `homeOffice`, `preferredLanguage`, `notes`, `isActive`, and timestamps. `preferredLanguage` defaults to `so`.

## 2. Phone Normalization Design

`server/lib/phone.js` is the single authoritative phone normalizer. It returns a canonical phone, validity flag, country, and reason so callers can distinguish valid identity keys from unresolved input.

## 3. Somalia Rules

Somalia phones normalize to `+252...` when provided as valid international input or as local mobile numbers with Somalia branch/country context, including forms like `0612345678`, `612345678`, `+252612345678`, and `00252612345678`.

## 4. Kenya Rules

Kenya phones normalize to `+254...` when provided as valid international input or as local mobile numbers with Kenya branch/country context, including forms like `0712345678`, `712345678`, `+254712345678`, and `00254712345678`.

## 5. Client Matching Policy

Automatic matching uses reliable `normalizedPhone` only. Name equality alone never merges people.

## 6. Duplicate Policy

New manual client writes are checked at the application layer and rejected with `A client with this phone number already exists.` when another client already has the same normalized phone. No unique MongoDB index was added because legacy duplicates may already exist.

## 7. Conservative Profile-Update Policy

Transaction forms may fill missing safe fields on an existing client, such as missing email or home branch. They do not overwrite an existing trusted name with shorter or alternate transaction text. Explicit client edit remains the deliberate profile-change path.

## 8. Ticket Relationship

Ticket writes call the client identity service, reuse or create a client, store `clientId`, and preserve ticket-time fields such as `passenger` and `phone`.

## 9. Visa Relationship

Visa writes use the same service, store `clientId`, and preserve applicant snapshot fields such as `applicant`, `phone`, and `email`.

## 10. Cargo Sender Relationship

Cargo sender writes create or reuse a client through `senderPhone`, then store `senderClientId` and `senderNormalizedPhone`.

## 11. Cargo Receiver Relationship

Cargo receiver writes independently create or reuse a client through `receiverPhone`, then store `receiverClientId` and `receiverNormalizedPhone`. If sender and receiver normalize to the same phone, both fields may point to the same client.

## 12. Historical Snapshot Policy

Relationships are additive. Existing transaction display fields remain the source for receipts, tracking text, and historical presentation, so later client profile edits do not rewrite old tickets, visas, or cargo records.

## 13. Client History API

`GET /api/clients/:id/history` returns a focused client history payload with the client, linked tickets, linked visas, and linked cargo where the client is sender or receiver.

## 14. Owner/Operator Authorization Behavior

Client identity is agency-wide, but transaction history remains branch-authorized. Owners can see all linked activity. Operators only see activity involving their assigned branch, including cargo where the branch is origin, destination, or paid-by branch.

## 15. Preferred Language Preparation

`preferredLanguage` is available on clients with supported values `so` and `en`. Somali is the default for existing and new clients when not explicitly set.

## 16. WhatsApp Readiness

Future notification code can resolve a cargo/ticket/visa to a client, then to `normalizedPhone` and `preferredLanguage`. Phase 3 does not install Twilio and does not send WhatsApp messages.

## 17. Existing Email Compatibility

Resend status email remains unchanged and still uses transaction snapshot fields: cargo sender email/name and visa applicant email/name. New client relationship fields do not affect email delivery.

## 18. Migration/Backfill Results

`runPhase3Migration()` runs after Phase 2 startup migration. It is idempotent and re-runnable. It reports client scan/normalization counts, ticket links, visa links, cargo sender/receiver links, clients created, skipped records, unresolved records, and duplicate phone groups.

## 19. Index Strategy

Indexes now support `Client.normalizedPhone`, `Ticket.clientId`, `Visa.clientId`, `Cargo.senderClientId`, and `Cargo.receiverClientId`. Duplicate prevention is application-level, not database-unique.

## 20. Unresolved Legacy Identities

Ambiguous or invalid legacy phones are reported as unresolved and left untouched. Duplicate normalized-phone groups are reported for manual review instead of being aggressively merged.

## 21. Deferred Work

Payment ledger, cargo lifecycle redesign, Twilio WhatsApp delivery, full CRM features, and professional UI/UX redesign remain deferred to later phases.
