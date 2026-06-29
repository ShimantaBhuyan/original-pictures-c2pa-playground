import { z } from 'zod';

export const gpsSchema = z.object({
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  source: z.enum(['exif', 'user', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low', 'none']),
});

export const journalismSchema = z.object({
  reporterId: z.string().min(1),
  organization: z.string().min(1),
  sourceType: z.string().min(1),
  caption: z.string().min(1),
  publicInterestReason: z.string().min(1),
  safetyNotes: z.array(z.string()),
});

export const inspectionSchema = z.object({
  inspectionId: z.string().min(1),
  claimId: z.string().min(1),
  inspectorId: z.string().min(1),
  assetId: z.string().min(1),
  damageType: z.string().min(1),
  observation: z.string().min(1),
  mapRequired: z.boolean(),
});

export const evidenceRequestSchema = z.object({
  fileId: z.string().uuid(),
  evidenceId: z.string().regex(/^ev_\d{4}_\d{3}$/, 'Must match ev_YYYY_NNN'),
  mode: z.enum(['journalism', 'inspection']),
  capture: z.object({
    capturedAt: z.string().nullable().optional(),
    gps: gpsSchema.optional(),
    cameraHeadingDegrees: z.number().nullable().optional(),
    cameraDirectionText: z.string().nullable().optional(),
  }).optional(),
  journalism: journalismSchema.optional(),
  inspection: inspectionSchema.optional(),
}).refine((data) => {
  if (data.mode === 'journalism') return !!data.journalism;
  if (data.mode === 'inspection') return !!data.inspection;
  return false;
}, { message: 'Must provide the block matching the selected mode' });
