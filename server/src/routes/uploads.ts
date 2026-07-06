import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/uploads/photo — upload doctor profile photo
// Expects: multipart/form-data with field "file" (raw bytes + Content-Type header)
// For simplicity we accept base64 JSON to avoid multer dependency on the new server
router.post('/photo', requireAuth, requireRole('doctor'), async (req: Request, res: Response) => {
  const { base64, mimeType } = req.body;

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'base64 and mimeType are required' });
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are allowed' });
  }

  const buffer = Buffer.from(base64, 'base64');

  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return res.status(400).json({ error: 'File must be under 5 MB' });
  }

  const ext = mimeType.split('/')[1];
  const fileName = `${req.user!.id}-${Date.now()}.${ext}`;
  const bucket = process.env.SUPABASE_BUCKET ?? 'doctor-photos';

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    return res.status(500).json({ error: 'Upload failed' });
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);

  // Update doctor profile with new photo URL
  await supabaseAdmin
    .from('doctors')
    .update({ photos_url: urlData.publicUrl })
    .eq('id', req.user!.id);

  res.json({ url: urlData.publicUrl });
});

export default router;
