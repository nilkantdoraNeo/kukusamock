import crypto from 'crypto';
import { supabaseAdmin } from './supabase.js';

const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const MAX_AVATAR_BYTES = Number(process.env.AVATAR_MAX_BYTES) || 5 * 1024 * 1024;

export function isDataUrl(value) {
  if (!value) return false;
  return DATA_URL_REGEX.test(String(value));
}

function extensionForMime(mime) {
  const raw = mime.split('/')[1] || 'png';
  if (raw === 'jpeg') return 'jpg';
  if (raw.startsWith('svg')) return 'svg';
  return raw.replace('+xml', '');
}

export async function uploadAvatarDataUrl(userId, dataUrl) {
  const match = String(dataUrl || '').match(DATA_URL_REGEX);
  if (!match) {
    throw new Error('Invalid image data.');
  }

  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_AVATAR_BYTES) {
    const err = new Error('Avatar image is too large. Max 5MB.');
    err.status = 400;
    throw err;
  }
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';
  const ext = extensionForMime(mime);
  const filename = `avatars/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin
    .storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: mime,
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);
  return data?.publicUrl || '';
}
