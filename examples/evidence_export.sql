PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE evidence_json (
  evidence_id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('journalism', 'inspection')),
  media TEXT NOT NULL,
  capture TEXT NOT NULL,
  journalism TEXT,
  inspection TEXT,
  integrity TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO evidence_json VALUES('ev_2026_396','81e9933a-4194-44db-b7c8-8904e4312d28','journalism','{"sha256":"17307b1207eb6487d7908e9d154890b46e3d2e0192369cfd3f4c33d5a5af4035","mimeType":"image/jpeg","fileSizeBytes":161713,"width":640,"height":480,"exifTimestamp":"2008-10-22T16:28:39Z","exifGpsLat":43.46744833333334,"exifGpsLng":11.885126666663888}','{"capturedAt":"2008-10-22T21:58:00Z","gps":{"lat":43.46744833333334,"lng":11.885126666663888,"source":"user","confidence":"high"},"cameraHeadingDegrees":null,"cameraDirectionText":null}','{"reporterId":"REP-001","organization":"The Guardian","sourceType":"staff","caption":"Scenery","publicInterestReason":"Scenery","safetyNotes":["Scenery 1"]}',NULL,'{"schemaVersion":"1.0","createdBy":"Original Pictures Evidence Agent","createdAt":"2026-06-29T04:41:30.445Z"}','2026-06-29 04:41:30');
CREATE TABLE evidence_records (
  evidence_id TEXT PRIMARY KEY REFERENCES evidence_json(evidence_id),
  mode TEXT NOT NULL CHECK(mode IN ('journalism', 'inspection')),
  original_file_hash TEXT NOT NULL,
  signed_file_hash TEXT NOT NULL,
  signed_file_path TEXT NOT NULL,
  manifest_label TEXT NOT NULL,
  claim_generator TEXT NOT NULL DEFAULT 'Original Pictures Evidence Agent/1.0',
  signature_status TEXT NOT NULL DEFAULT 'unknown' CHECK(signature_status IN ('valid', 'invalid', 'unknown')),
  validation_errors TEXT NOT NULL DEFAULT '[]',
  extracted_evidence_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO evidence_records VALUES('ev_2026_396','journalism','17307b1207eb6487d7908e9d154890b46e3d2e0192369cfd3f4c33d5a5af4035','5c25855554b51fa10e5294ddc4afe1762d571fb72b517e4d1b35d80740dd66ec','/Users/devkrishna/Desktop/Playground/original-pictures-assignment/uploads/signed/ev_2026_396.jpg','urn:c2pa:5954ac95-79fc-49ba-a9a8-b435ee22c681','Original Pictures Evidence Agent','valid','[]','{"evidenceId":"ev_2026_396","mode":"journalism","media":{"sha256":"17307b1207eb6487d7908e9d154890b46e3d2e0192369cfd3f4c33d5a5af4035","mimeType":"image/jpeg","fileSizeBytes":161713,"width":640,"height":480,"exifTimestamp":"2008-10-22T16:28:39Z","exifGpsLat":43.46744833333334,"exifGpsLng":11.885126666663888},"capture":{"capturedAt":"2008-10-22T21:58:00Z","gps":{"lat":43.46744833333334,"lng":11.885126666663888,"source":"user","confidence":"high"},"cameraHeadingDegrees":null,"cameraDirectionText":null},"journalism":{"reporterId":"REP-001","organization":"The Guardian","sourceType":"staff","caption":"Scenery","publicInterestReason":"Scenery","safetyNotes":["Scenery 1"]},"inspection":null,"integrity":{"schemaVersion":"1.0","createdBy":"Original Pictures Evidence Agent","createdAt":"2026-06-29T04:41:30.445Z"}}','2026-06-29 04:41:38');
CREATE TABLE tampered_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id TEXT NOT NULL REFERENCES evidence_records(evidence_id),
  tampered_file_path TEXT NOT NULL,
  tampered_file_hash TEXT NOT NULL,
  tamper_method TEXT NOT NULL,
  tamper_params TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO tampered_images VALUES(1,'ev_2026_396','/Users/devkrishna/Desktop/Playground/original-pictures-assignment/uploads/tampered/ev_2026_396_pixel_text.jpg','4be12245ce5ccc35ee45de6ca315b793c477725dfc5bfc2536214bbc1a265adc','pixel_text','{"text":"TAMPERED FOR TESTING"}','2026-06-29 04:44:24');
INSERT INTO sqlite_sequence VALUES('tampered_images',1);
COMMIT;
