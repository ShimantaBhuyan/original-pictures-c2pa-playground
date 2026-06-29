# Design Decisions v2 — Full Project History

## 1. C2PA Library

**`@contentauth/c2pa-node` v0.6.0** from the Content Authenticity Initiative (CAI) open-source project.

This is the official Node.js SDK wrapping the native Rust C2PA library via N-API. It provides:

| API                                         | Usage                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `Builder`                                   | Construct C2PA manifests with assertions, claim generator info, format      |
| `Builder.addAssertion()`                    | Embed the evidence JSON as `org.originalpictures.evidence` custom assertion |
| `Builder.addAssertion()`                    | Add `c2pa.actions` with `c2pa.created` action                               |
| `LocalSigner.newSigner(cert, key, 'es256')` | Sign with EC P-256 credentials                                              |
| `Reader.fromAsset({ path })`                | Read/extract C2PA manifest from a signed image                              |
| `reader.getActive()`                        | Get the active (latest) manifest                                            |
| `reader.json()`                             | Full JSON representation including `validation_status`                      |

**Source**: `src/server/services/c2paSigner.ts` (74 lines) and `src/server/services/c2paReader.ts` (56 lines).

---

## 2. Real vs Mocked

### 2.1 Real (no mock)

- **C2PA manifest creation**: `Builder.withJson()` constructs real manifests conforming to the C2PA spec.
- **C2PA signing**: `Builder.sign()` with `LocalSigner` produces actual cryptographic signatures.
- **C2PA manifest extraction**: `Reader.fromAsset()` reads back manifests from signed files.
- **C2PA verification**: The `Reader` returns `validation_status` with error codes; the verifier (`c2paVerifier.ts`) classifies these into `verified`, `tampered`, `manifest_missing`, `manifest_invalid` statuses.
- **SHA-256 hashing**: Real cryptographic hash via crypto.subtle / Node crypto.
- **EXIF extraction**: Real EXIF parsing via `exifreader` (mattiasw) from raw image buffers — extracts `DateTimeOriginal`, `DateTimeDigitized`, GPS latitude/longitude.
- **Image processing**: Real pixel manipulation via Sharp — SVG composite overlays (`pixel_text`), crop extraction (`crop`), re-encode without metadata (`manifest_strip`).
- **JPEG/PNG C2PA manifest preservation**: Real raw binary surgery on JPEG APP11 segments and PNG C2PA chunks — no library wrappers, pure `Buffer` manipulation.
- **SQLite persistence**: Real CRUD operations via `better-sqlite3`.

### 2.2 Mocked (or intentionally limited)

- **Dev certificates**: Self-signed EC P-256 certs generated via OpenSSL. The C2PA verifier always reports `signingCredential.untrusted` — this is expected and accepted. Production certificates from an accredited C2PA trust anchor are needed for trusted signatures.
- **WebP C2PA preservation**: Not implemented. The C2PA RIFF chunk structure in WebP is not reliably exposed by current `@contentauth/c2pa-node` tooling, so pixel-manifest tamper methods that attempt to preserve the C2PA manifest fall through to `preserveC2paManifest()` and simply rename the re-encoded file. Hash-based detection still works for lab-generated WebP tampers.
- **No distributed multi-tenant isolation**: The SQLite database is single-instance.
- **No authentication/authorization**: All evidence creation and tamper endpoints are unprotected.

---

## 3. Certificate Handling

Dev certificates are stored at `certs/cert.pem` and `certs/private.key`:

```
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -keyout certs/private.key -out certs/cert.pem -days 365 -nodes \
  -subj "/CN=Original Pictures Dev/O=Original Pictures/OU=Evidence Agent"
```

- **Algorithm**: EC P-256 (es256) — chosen over RSA for smaller manifest sizes and faster signing.
- **Trust**: The `LocalSigner` uses the `'es256'` algorithm parameter matching `@contentauth/c2pa-node`'s expected signing format.
- **Dev caveat**: Verification reports `signingCredential.untrusted` because no production certificate authority (CA) chain backs this cert. This is stated clearly in the UI and in all verification output. The C2PA spec treats untrusted credentials as valid-but-untrusted; the manifest is still cryptographically sound.
- **Security**: Private keys are **not** stored in the database, returned from API endpoints, embedded in exported outputs, or committed to source control (except as clearly labeled dev fixtures in `certs/` — which is gitignored via `.gitignore`).

---

## 4. EXIF Extraction

EXIF is parsed with the **`exifreader`** package [ExifReader by mattiasw](https://github.com/mattiasw/ExifReader) using `ExifReader.load(buffer, { expanded: true })` from the raw image buffer at upload time.

| Field              | Source                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `DateTimeOriginal` | `tags.exif.DateTimeOriginal.description` (fallback to `DateTimeDigitized`, then `DateTime`) |
| `GPSLatitude`      | `tags.gps.Latitude` (decimal)                                                               |
| `GPSLongitude`     | `tags.gps.Longitude` (decimal)                                                              |

**Integration with evidence form** (`src/app/evidence/new/page.tsx`):

- The `/evidence/new` page fetches `/api/media/{fileId}` on load.
- The API extracts EXIF via `computeFileFacts()` in `fileFacts.ts` and returns `exifTimestamp`, `exifGpsLat`, `exifGpsLng`.
- The form pre-fills **Captured At** and **GPS Coordinates** when EXIF data is available.
- GPS source is set to `exif` and confidence to `high` when derived from EXIF.
- The value is converted to ISO 8601 for storage and displayed in `datetime-local` format in the form.
- The app does **not** pretend missing EXIF/GPS means the file is invalid — missing data is represented as `null`.

---

## 5. Evidence JSON Storage

Evidence JSON is stored **both** on disk (`uploads/evidence/{evidenceId}.json`) and in SQLite (`evidence_json` table). The database copy serves as a queryable primary record for the UI, reducing filesystem I/O.

The evidence endpoint (`POST /api/evidence`) merges EXIF-derived data into `capture.capturedAt` and `capture.gps` when the user does not supply their own values.

---

## 6. Tamper Method Behavior

Three tamper methods are implemented in `src/server/services/tamperService.ts` (156 lines):

### 6.1 pixel_text

- Sharp composites a semi-transparent red overlay with "TAMPERED — FOR TESTING" text (or custom text from `params.text`).
- The overlay is an inline SVG with a red-tinted `<rect>` and centered `<text>`.
- Font size scales dynamically: `max(20, floor(min(width, height) / 10))`.
- **Manifest preservation**: For JPEG/PNG, the re-encoded temp file is surgically re-injected with the original C2PA segments/chunks before the SOS marker (JPEG) or IDAT chunk (PNG). This means verification detects a **content-hash mismatch** — the manifest is still valid but the pixel data no longer matches, producing a `tampered` status.
- **WebP**: C2PA cannot be preserved (see §2.2). The re-encoded file is used directly. Hash-based detection still flags it.

### 6.2 crop

- Sharp extracts a 10%-margin crop from all four sides (`left: margin, top: margin, width: w-2*margin, height: h-2*margin`).
- Same manifest preservation strategy as `pixel_text` for JPEG/PNG.
- Same WebP limitation.

### 6.3 manifest_strip

- Sharp re-encodes without `withMetadata()`, intentionally stripping all metadata including the C2PA manifest.
- No manifest preservation attempt — the purpose is to produce a file with no C2PA manifest.
- Verification returns `manifest_missing`.

---

## 7. JPEG and PNG C2PA Preservation (Binary Surgery)

Two dedicated modules perform raw buffer surgery to preserve C2PA manifests through Sharp re-encoding:

### 7.1 JPEG — `jpegSurgery.ts` (142 lines)

- **Extraction**: Walks marker-by-marker through the JPEG file. C2PA stores are embedded in APP11 markers (`0xFF 0xEB`). Every APP11 segment between SOI and EOI is captured as a `Buffer`.
- **Injection**: The re-encoded temp file is scanned for the SOS marker (`0xFF 0xDA`). APP segments must appear between SOI and SOS per the JPEG spec, so injection happens immediately before SOS. The output is `[SOI ... markers ... APP11* ... SOS ECS EOI]`.
- **Edge cases handled**: Stuffed bytes (`FF 00`), padding FFs, standalone markers (`RSTn`, D8, D9), scan data traversal.

### 7.2 PNG — `pngSurgery.ts` (67 lines)

- **Extraction**: Iterates PNG chunk structure (length + type + data + CRC). C2PA chunks are identified by four-byte types in `{caBX, C2PA, C2CI, C2CS}`.
- **Injection**: Finds the first `IDAT` chunk. Injects C2PA chunks immediately before it, per the PNG spec requirement that ancillary chunks precede IDAT.

### 7.3 Why binary surgery over `sharp().withMetadata()`?

Sharp's `.withMetadata()` preserves EXIF, ICC profiles, and XMP but **does not preserve C2PA APP11 segments** in JPEG or C2PA chunks in PNG. The binary surgery approach is:

- **Framework-agnostic**: No dependency on Sharp or any image library to preserve C2PA.
- **Format-specific**: Each image format embeds C2PA differently — JPEG uses APP11 markers, PNG uses custom chunk types, WebP uses RIFF chunks.
- **Production note**: A production implementation would likely use a dedicated C2PA-aware image library rather than surgery, but this approach demonstrates understanding of the container formats.

---

## 8. Verification Classification

The verifier (`c2paVerifier.ts`, 96 lines) implements the five-status classification from the assessment spec:

| Status             | Condition                                                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verified`         | Manifest exists and `isValid === true` (no errors beyond `signingCredential.untrusted`)                                                                                                                                           |
| `tampered`         | Manifest exists with recoverable `evidenceId`, but validation produces errors (signature mismatch, hash assertion mismatch) — or manifest is missing but the file hash matches a known tampered record in `tampered_images` table |
| `manifest_missing` | No C2PA manifest found AND no matching record in `tampered_images` table                                                                                                                                                          |
| `manifest_invalid` | Manifest exists but cannot be parsed or has no `evidenceId`/`label`                                                                                                                                                               |
| `unknown`          | Verifier could not classify (current implementation only returns this when no existing case matches)                                                                                                                              |

**Reason codes** follow the assessment spec (`C2PA_MANIFEST_MISSING`, `C2PA_SIGNATURE_INVALID`, `HASH_ASSERTION_MISMATCH`, `MATCHED_PRIOR_EVIDENCE_RECORD`, etc.) and are returned alongside human-readable messages.

The verifier also cross-references the `tampered_images` database table — if a file's hash matches a known tampered record (even without a manifest), it reports `tampered` with the `tamperMethod` in the response.

---

## 9. Database Architecture

SQLite via `better-sqlite3` with WAL mode. Three tables:

| Table              | Purpose                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `evidence_json`    | Stores the full evidence JSON (media, capture, journalism/inspection, integrity) keyed by `evidence_id` |
| `evidence_records` | Stores the signed C2PA record — hashes, paths, manifest label, signature status                         |
| `tampered_images`  | Tracks each tamper operation — method, params, hash, linked to `evidence_id`                            |

**Design rule** (per assessment spec §5): The database is **not** the source of cryptographic truth. The C2PA verifier determines whether a file validates. The database helps link an uploaded file back to a prior evidence record. Records are stored so that tampered files can be matched to their origin even when the manifest is stripped.

**Path overrides**: `DB_PATH` env var overrides the default `data/evidence.db`.

---

## 10. Frontend Architecture

- **Framework**: Next.js 15 App Router with React 19.
- **Styling**: Tailwind CSS v4 with CSS custom properties for the Original Pictures design system.
- **Fonts**: Sanchez (serif headings) + League Spartan (sans body) + JetBrains Mono (code/hashes), loaded via `@next/font/google`.
- **Color palette**: Warm paper (`#fff7e8`) background, notary blue (`#015185`) CTAs, cream (`#fcedd3`) cards, brass (`#cea273`) accents, ink (`#102a6b`) headings.
- **Client components**: All interactive pages use `'use client'` and fetch from `/api/*` routes.
- **9 UI pages**: Upload (page.tsx), Evidence Editor (evidence/new/page.tsx), Journalism/Inspection forms, Sign (via sign/page.tsx), Records (records/page.tsx), Tamper (tamper/page.tsx), Verify (verify/page.tsx), Verification Result (verify/result/page.tsx), Record Detail (records/[evidenceId]/page.tsx).
- **Download endpoints**: `/api/download/[evidenceId]` and `/api/tamper/download/[evidenceId]/[method]` for retrieving signed and tampered files.

---

## 11. Shared Components

All located in `src/components/`:

| Component                | Purpose                                                                           |
| ------------------------ | --------------------------------------------------------------------------------- |
| `Button.tsx`             | Primary (notary blue bg) + Ghost (transparent + slate-200 border) variants        |
| `Card.tsx`               | Cream background, slate-200 border, rounded-lg body                               |
| `StatusBadge.tsx`        | Color-coded badge for verified/tampered/manifest_missing/manifest_invalid/unknown |
| `FileDropZone.tsx`       | Drag-and-drop file upload with format validation (JPEG/PNG, max 50MB)             |
| `VerificationResult.tsx` | Detailed result card with status, reason codes, matched record info               |

---

## 12. Server Configuration

`src/server/config.ts` defines three key paths:

```typescript
export const UPLOADS_DIR = path.join(ROOT, "uploads"); // originals/, signed/, tampered/, evidence/, verify/
export const CERTS_DIR = path.join(ROOT, "certs"); // cert.pem, private.key
export const DB_PATH = path.join(ROOT, "data", "evidence.db");
```

Next.js configuration (`next.config.ts`) sets `serverExternalPackages` for native modules:

```typescript
serverExternalPackages: ["@contentauth/c2pa-node", "better-sqlite3", "sharp"];
```

---

## 13. Testing

Vitest v4 with Node environment. Test files in `src/server/services/__tests__/`:

| Test File                | Cases                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evidenceSchema.test.ts` | Evidence JSON schema validation (6+ cases — valid journalism, valid inspection, missing mode block, invalid evidenceId pattern, missing fields, edge cases) |
| `fileFacts.test.ts`      | File facts computation (JPEG + PNG dimensions, MIME type, file size)                                                                                        |
| `hash.test.ts`           | SHA-256 hash computation, consistency verification                                                                                                          |
| `recordsDb.test.ts`      | SQLite CRUD operations for evidence records                                                                                                                 |

Run with: `npx vitest run`

---

## 14. Known Limitations

1. **Self-signed certificates**: Always report `signingCredential.untrusted` during verification. No production trust chain.
2. **WebP C2PA preservation**: Not implemented — `preserveC2paManifest()` for WebP falls through to a plain file rename, effectively stripping the manifest. Hash-based detection compensates partially.
3. **C2PA v2.1 features**: Content bindings, ingredient hashes, and hard bindings using image hashes are not yet used.
4. **No distributed multi-tenant isolation**: The SQLite database is single-instance. No connection pooling for concurrent writes.
5. **No authentication/authorization**: All API endpoints are unprotected. Evidence creation, signing, and tampering are open to any client.
6. **Next.js default 4MB body limit**: The `/api/upload` and `/api/verify` routes use `NextRequest.formData()` which inherits Next.js's default body size limit. Files over ~4MB may fail without additional configuration.
7. **Manifest-preserving tamper methods** only produce correct results for JPEG/PNG assets that were signed by this app's own flow. Third-party C2PA-signed images may have different marker/chunk layouts.
8. **Oil-painting illustrations**: The Original Pictures brand signature oil-painting imagery is not reproduced in the assessment UI. The warm paper + notary blue palette is used faithfully.

---

## 17. Production Next Steps

1. **Obtain production C2PA certificates** from an accredited provider (DigiCert, SSL.com, or a C2PA trust anchor) so signatures are trusted rather than untrusted.
2. **Replace Sharp-based tampering** with a JPEG-binary manipulation approach that preserves APP11 markers for all three tamper methods without intermediate re-encoding.
3. **Add content-binding assertions** (hard bindings using image hashes) per the C2PA 2.1 spec.
4. **Migrate from SQLite to PostgreSQL** (or add a connection pooler) for concurrent write support across multiple instances.
5. **Add authentication/authorization** around evidence creation, signing, and tamper endpoints.
6. **Increase file upload limit** by configuring `maxDuration` or implementing streaming uploads for files > 50MB.
7. **Implement WebP C2PA preservation** by parsing the RIFF chunk structure when the tooling stabilizes.

---
