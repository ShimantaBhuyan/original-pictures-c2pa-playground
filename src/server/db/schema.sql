CREATE TABLE IF NOT EXISTS evidence_json (
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

CREATE TABLE IF NOT EXISTS evidence_records (
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

CREATE TABLE IF NOT EXISTS tampered_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id TEXT NOT NULL REFERENCES evidence_records(evidence_id),
  tampered_file_path TEXT NOT NULL,
  tampered_file_hash TEXT NOT NULL,
  tamper_method TEXT NOT NULL,
  tamper_params TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
