import { supabaseAdmin, supabaseAuth } from '../services/supabase.js';
import { upsertUserProfile, getUserProfile, updateUserProfile } from '../services/user.service.js';
import { isDataUrl, uploadAvatarDataUrl } from '../services/storage.service.js';

export async function signup(req, res, next) {
  try {
    const { username, email, phone, age, password } = req.body;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createError) {
      const message = String(createError.message || '').toLowerCase();
      if (createError.status === 422 || message.includes('already') || message.includes('exists')) {
        return res.status(409).json({ message: 'User already exists.' });
      }
      throw createError;
    }

    const { data: sessionData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      return res.status(401).json({ message: 'User id or password wrong.' });
    }

    const user = created.user ?? sessionData.user;
    const profile = await upsertUserProfile(user, { username, phone, age });
    const token = sessionData.session?.access_token || '';
    res.json({ token, user: profile });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data?.user) {
      try {
        const { data: lookup } = await supabaseAdmin.auth.admin.getUserByEmail(email);
        if (!lookup?.user) {
          return res.status(404).json({ message: 'User does not exist.' });
        }
      } catch {
        // ignore lookup errors and fall back to generic message
      }
      return res.status(401).json({ message: 'User id or password wrong.' });
    }

    const profile = await upsertUserProfile(data.user);
    res.json({ token: data.session.access_token, user: profile });
  } catch (err) {
    next(err);
  }
}

export async function profile(req, res, next) {
  try {
    const profileData = await getUserProfile(req.user.id);
    res.json(profileData);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { username, phone, age, avatar_url } = req.body;
    let resolvedAvatarUrl = avatar_url;
    if (avatar_url && isDataUrl(avatar_url)) {
      resolvedAvatarUrl = await uploadAvatarDataUrl(req.user.id, avatar_url);
    }
    const updated = await updateUserProfile(req.user.id, {
      username,
      phone,
      age,
      avatar_url: resolvedAvatarUrl
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
