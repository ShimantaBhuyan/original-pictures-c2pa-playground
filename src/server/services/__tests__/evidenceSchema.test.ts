import { describe, it, expect } from 'vitest';
import { evidenceRequestSchema } from '../evidenceSchema';

const baseValid = {
  fileId: '550e8400-e29b-41d4-a716-446655440000',
  evidenceId: 'ev_2026_001',
  capture: {
    capturedAt: '2026-06-27T10:30:00Z',
    gps: { lat: 25.2048, lng: 55.2708, source: 'user' as const, confidence: 'medium' as const },
  },
};

describe('evidenceRequestSchema', () => {
  it('accepts a valid journalism request', () => {
    const data = {
      ...baseValid,
      mode: 'journalism' as const,
      journalism: {
        reporterId: 'rep_123',
        organization: 'Example Newsroom',
        sourceType: 'staff_reporter',
        caption: 'Street scene',
        publicInterestReason: 'Newsworthy event',
        safetyNotes: ['Keep safe'],
      },
    };
    const result = evidenceRequestSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts a valid inspection request', () => {
    const data = {
      ...baseValid,
      mode: 'inspection' as const,
      inspection: {
        inspectionId: 'ins_001',
        claimId: 'clm_001',
        inspectorId: 'insp_001',
        assetId: 'ast_001',
        damageType: 'flood',
        observation: 'Water damage observed',
        mapRequired: true,
      },
    };
    const result = evidenceRequestSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects when mode block is missing', () => {
    const data = {
      ...baseValid,
      mode: 'journalism' as const,
    };
    const result = evidenceRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('Must provide'))).toBe(true);
    }
  });

  it('rejects invalid evidenceId format', () => {
    const data = {
      ...baseValid,
      evidenceId: 'bad-id',
      mode: 'journalism' as const,
      journalism: {
        reporterId: 'rep_123',
        organization: 'Example Newsroom',
        sourceType: 'staff_reporter',
        caption: 'Street scene',
        publicInterestReason: 'Newsworthy event',
        safetyNotes: [],
      },
    };
    const result = evidenceRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid GPS lat', () => {
    const data = {
      ...baseValid,
      mode: 'journalism' as const,
      journalism: {
        reporterId: 'rep_123',
        organization: 'Example Newsroom',
        sourceType: 'staff_reporter',
        caption: 'Street scene',
        publicInterestReason: 'Newsworthy event',
        safetyNotes: [],
      },
      capture: {
        capturedAt: '2026-06-27T10:30:00Z',
        gps: { lat: 100, lng: 55.2708, source: 'user' as const, confidence: 'medium' as const },
      },
    };
    const result = evidenceRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing fileId', () => {
    const data = {
      evidenceId: 'ev_2026_001',
      mode: 'journalism' as const,
      journalism: {
        reporterId: 'rep_123',
        organization: 'Example Newsroom',
        sourceType: 'staff_reporter',
        caption: 'Street scene',
        publicInterestReason: 'Newsworthy event',
        safetyNotes: [],
      },
    };
    const result = evidenceRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
