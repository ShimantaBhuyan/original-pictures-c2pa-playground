import { Reader } from '@contentauth/c2pa-node';

export interface ExtractedManifest {
  evidenceId: string | null;
  claimGenerator: string | null;
  label: string | null;
  assertions: Array<{ label: string; data: unknown }>;
  isValid: boolean;
  errors: string[];
}

export async function extractManifestJson(filePath: string): Promise<object | null> {
  try {
    const reader = await Reader.fromAsset({ path: filePath });
    if (!reader) return null;
    return reader.json() as object;
  } catch {
    return null;
  }
}

export async function extractManifest(filePath: string): Promise<ExtractedManifest | null> {
  try {
    const reader = await Reader.fromAsset({ path: filePath });
    if (!reader) return null;

    const manifest = reader.getActive();
    if (!manifest) return null;

    const evidenceAssertion = (manifest.assertions ?? []).find(
      (a: { label: string }) => a.label === 'org.originalpictures.evidence'
    );
    const evidenceId = (evidenceAssertion?.data as any)?.evidenceId ?? null;

    const errors: string[] = [];
    const store = reader.json();
    if (store.validation_status) {
      for (const vs of store.validation_status) {
        if (vs.code && vs.code !== 'signingCredential.untrusted') {
          errors.push(vs.code);
        }
      }
    }

    return {
      evidenceId,
      claimGenerator: (manifest as any).claim_generator ?? null,
      label: manifest.label ?? null,
      assertions: manifest.assertions ?? [],
      isValid: errors.length === 0,
      errors,
    };
  } catch {
    return null;
  }
}
