# Database Export — Signed Evidence Record

This file is a human-readable export of the SQLite database at `examples/evidence.db`, 
showing a complete end-to-end signed evidence record and its associated tamper audit entry.

---

## Table: evidence_json

The raw evidence JSON stored after the user filled the form and before signing.

| Column | Value |
|--------|-------|
| evidence_id | `ev_2026_396` |
| file_id | `81e9933a-4194-44db-b7c8-8904e4312d28` |
| mode | `journalism` |
| media | `{"sha256":"17307b1207eb6487d7908e9d154890b46e3d2e0192369cfd3f4c33d5a5af4035","mimeType":"image/jpeg","fileSizeBytes":161713,"width":640,"height":480,"exifTimestamp":"2008-10-22T16:28:39Z","exifGpsLat":43.46744833333334,"exifGpsLng":11.885126666663888}` |
| capture | `{"capturedAt":"2008-10-22T21:58:00Z","gps":{"lat":43.46744833333334,"lng":11.885126666663888,"source":"user","confidence":"high"},"cameraHeadingDegrees":null,"cameraDirectionText":null}` |
| journalism | `{"reporterId":"REP-001","organization":"The Guardian","sourceType":"staff","caption":"Scenery","publicInterestReason":"Scenery","safetyNotes":["Scenery 1"]}` |
| inspection | `null` |
| integrity | `{"schemaVersion":"1.0","createdBy":"Original Pictures Evidence Agent","createdAt":"2026-06-29T04:41:30.445Z"}` |
| created_at | `2026-06-29 04:41:30` |

---

## Table: evidence_records

The signed C2PA record, stored after the image was signed with the C2PA manifest.

| Column | Value |
|--------|-------|
| evidence_id | `ev_2026_396` |
| mode | `journalism` |
| original_file_hash | `17307b1207eb6487d7908e9d154890b46e3d2e0192369cfd3f4c33d5a5af4035` |
| signed_file_hash | `c9177f6e9e164a0a3eafdf20d187cb709ae63fb9172943a20b7e49645025e1ea` |
| signed_file_path | `/Users/devkrishna/.../uploads/signed/ev_2026_396.jpg` |
| manifest_label | `urn:c2pa:5954ac95-79fc-49ba-a9a8-b435ee22c681` |
| claim_generator | `Original Pictures Evidence Agent/1.0` |
| signature_status | `valid` |
| validation_errors | `[]` |
| extracted_evidence_json | *(embedded copy of the evidence_json record)* |
| created_at | `2026-06-29 04:41:38` |

---

## Table: tampered_images

The tamper audit trail, created when the pixel_text tamper method was applied to the signed image.

| Column | Value |
|--------|-------|
| id | `1` |
| evidence_id | `ev_2026_396` |
| tampered_file_path | `/Users/devkrishna/.../uploads/tampered/ev_2026_396_pixel_text.jpg` |
| tampered_file_hash | `4be12245ce5ccc35ee45de6ca315b793c477725dfc5bfc2536214bbc1a265adc` |
| tamper_method | `pixel_text` |
| tamper_params | `{"text":"TAMPERED FOR TESTING"}` |
| created_at | `2026-06-29 04:44:24` |

---

## End-to-End Workflow Summary

```
Upload (original.jpg)
  → SHA-256: 17307b1207eb6487d7908e9d154890b46e3d2e0192369cfd3f4c33d5a5af4035
  → File facts: 640×480 JPEG, 161 KB, EXIF timestamp 2008-10-22T16:28:39Z

Evidence Form (journalism mode)
  → evidenceId: ev_2026_396
  → Reporter: REP-001, The Guardian
  → GPS: 43.467°N, 11.885°E (user-provided, high confidence)

C2PA Sign
  → Signed with EC P-256 dev cert → signed.jpg (415 KB)
  → Manifest label: urn:c2pa:5954ac95-79fc-49ba-a9a8-b435ee22c681
  → Signature status: valid

Tamper (pixel_text)
  → Red overlay with "TAMPERED FOR TESTING" → tampered.jpg (377 KB)
  → C2PA manifest preserved through binary JPEG APP11 surgery
  → Verification: tampered (manifest exists but hash no longer matches)

Verify
  → Reason codes: C2PA_SIGNATURE_INVALID, HASH_ASSERTION_MISMATCH, MATCHED_PRIOR_EVIDENCE_RECORD
  → Status: tampered
  → Linked to: ev_2026_396
```

---

## SQL Schema

For reference, the three tables are defined in `src/server/db/schema.sql`.
