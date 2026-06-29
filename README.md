# Original Pictures — C2PA Evidence & Tamper Lab

A Next.js application for signing images with C2PA manifests, creating tampered variants, and verifying evidence integrity.

## Quick Start

```bash
npm install
mkdir -p certs
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out certs/private.key
openssl req -new -x509 -key certs/private.key -out certs/cert.pem -days 365 \
  -subj "/CN=Original Pictures Dev/O=Original Pictures/OU=Evidence Agent" \
  -addext "basicConstraints=critical,CA:FALSE" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=critical,timeStamping"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Framework**: Next.js 15 (App Router)
- **C2PA**: `@contentauth/c2pa-node` (signing + verification)
- **Image processing**: Sharp (re-encode, composite, crop)
- **Database**: SQLite via `better-sqlite3`
- **Validation**: Zod
- **Tests**: Vitest

## Workflow

```
Upload → Evidence → Sign → Tamper → Verify
```

1. **Upload** — Upload a JPEG, PNG or WebP; the server returns a `fileId` and media facts (hash, dimensions, EXIF).
2. **Evidence** — Submit an evidence JSON body (`journalism` or `inspection` mode) linked to the `fileId`. The JSON is stored in SQLite and EXIF capture time/GPS are merged in if the user did not supply them.
3. **Sign** — The server embeds a C2PA manifest (ECDSA P-256 signature) into the image in its original format and stores the record in SQLite.
4. **Tamper** — Choose a method (`pixel_text`, `crop`, or `manifest_strip`) to create a modified copy. `pixel_text` and `crop` restore the C2PA container after Sharp re-encode for JPEG/JPG (APP11) and PNG (C2PA chunks), so verification reports `tampered`. WebP tampers currently strip the manifest and report `manifest_missing`, but are still detected by hash. `manifest_strip` intentionally removes the manifest.
5. **Verify** — Upload a tampered file. The verifier checks for a C2PA manifest, compares the evidence ID against the database, and reports the status.

## Test

```bash
npm test
```

## Certificate Notes

Development certs are at `certs/cert.pem` and `certs/private.key` (EC P-256, self-signed). They produce valid cryptographic signatures but the C2PA validator reports `signingCredential.untrusted` because no production CA chain is present. Replace with CA-signed certificates for production use.

## App Screenshots

- [screenshots/1-upload-page.png](screenshots/1-upload-page.png)
- [screenshots/2-upload-page-2.png](screenshots/2-upload-page-2.png)
- [screenshots/3-create-evidence-record-1.png](screenshots/3-create-evidence-record-1.png)
- [screenshots/4-create-evidence-record-2.png](screenshots/4-create-evidence-record-2.png)
- [screenshots/5-create-evidence-record-3.png](screenshots/5-create-evidence-record-3.png)
- [screenshots/6-evidence-created.png](screenshots/6-evidence-created.png)
- [screenshots/7-sign.png](screenshots/7-sign.png)
- [screenshots/8-tamper-lab.png](screenshots/8-tamper-lab.png)
- [screenshots/9-tampered-image-display.png](screenshots/9-tampered-image-display.png)
- [screenshots/10-verification.png](screenshots/10-verification.png)
- [screenshots/11-evidence-records-page.png](screenshots/11-evidence-records-page.png)
- [screenshots/12-evidence-record-details-page.png](screenshots/12-evidence-record-details-page.png)

## Examples

In the /examples folder, you can find samples of

- an image to test signing
- the signed image for verification
- the image tampered with pixel tampering method for verification
- an `evidence.json` file
- a `manifest.json` file
- an `evidence.db` file to check the database directly for records - can use `DB Browser for SQLite` for inspecting
