import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Serve static public files directory
  const publicPath = path.join(process.cwd(), 'public');

  // Direct serve of resume.pdf with exact application/pdf headers (never falls through to SPA HTML)
  app.get('/resume.pdf', async (req, res) => {
    try {
      const fs = await import('fs');
      const filePath = path.join(publicPath, 'resume.pdf');
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="Mohammed_Saahir_Essa_Resume.pdf"');
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        return res.sendFile(filePath);
      }
      return res.status(404).send('Resume PDF not found');
    } catch (e) {
      return res.status(500).send('Error serving resume');
    }
  });

  // Dedicated direct PDF download endpoint: always serves original untouched binary with attachment header
  app.get('/api/download-resume', async (req, res) => {
    try {
      const fs = await import('fs');
      const requestedUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';

      // Google Drive link resolution: fetch original binary directly so user does not receive preview web page
      if (requestedUrl && requestedUrl.includes('drive.google.com')) {
        let fileId = '';
        const matchFile = requestedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (matchFile && matchFile[1]) {
          fileId = matchFile[1];
        } else {
          const matchId = requestedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (matchId && matchId[1]) {
            fileId = matchId[1];
          }
        }

        if (fileId) {
          try {
            const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            const driveRes = await fetch(driveDownloadUrl);
            const contentType = driveRes.headers.get('content-type') || '';
            if (driveRes.ok && !contentType.includes('text/html')) {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="Mohammed_Saahir_Essa_Resume.pdf"');
              const buffer = Buffer.from(await driveRes.arrayBuffer());
              return res.send(buffer);
            }
          } catch (driveErr) {
            console.warn('Failed to fetch from Google Drive direct link, falling back to local file', driveErr);
          }
        }
      }

      // External direct PDF link fetch
      if (requestedUrl && (requestedUrl.startsWith('http://') || requestedUrl.startsWith('https://'))) {
        try {
          const extRes = await fetch(requestedUrl);
          if (extRes.ok) {
            const contentType = extRes.headers.get('content-type') || '';
            if (contentType.includes('pdf') || requestedUrl.split('?')[0].endsWith('.pdf')) {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="Mohammed_Saahir_Essa_Resume.pdf"');
              const buffer = Buffer.from(await extRes.arrayBuffer());
              return res.send(buffer);
            }
          }
        } catch (extErr) {
          console.warn('Failed to fetch external PDF URL, falling back to local file', extErr);
        }
      }

      // Default: Serve the original untouched local resume.pdf file
      const defaultPath = path.join(publicPath, 'resume.pdf');
      if (fs.existsSync(defaultPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Mohammed_Saahir_Essa_Resume.pdf"');
        return res.sendFile(defaultPath);
      }

      return res.status(404).json({ error: 'Resume PDF file not found' });
    } catch (err) {
      console.error('Download resume endpoint error:', err);
      try {
        const fs = await import('fs');
        const defaultPath = path.join(publicPath, 'resume.pdf');
        if (fs.existsSync(defaultPath)) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="Mohammed_Saahir_Essa_Resume.pdf"');
          return res.sendFile(defaultPath);
        }
      } catch (_) {}
      return res.status(500).json({ error: 'Failed to serve resume PDF' });
    }
  });

  app.use(express.static(publicPath));

  // --- Cryptographically Secure Session & Authentication Management ---
  const validEmail = (process.env.ADMIN_EMAIL || 'saahiressa@gmail.com').toLowerCase();
  const authConfigFile = path.join(process.cwd(), '.admin_auth.json');
  const sessionsFile = path.join(process.cwd(), '.sessions.json');

  interface SessionInfo {
    token: string;
    email: string;
    createdAt: number;
    expiresAt: number;
    ip: string;
  }

  const activeSessions = new Map<string, SessionInfo>();

  // Load existing persistent sessions on startup
  try {
    if (fs.existsSync(sessionsFile)) {
      const saved = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
      const now = Date.now();
      if (Array.isArray(saved)) {
        saved.forEach((s: SessionInfo) => {
          if (s && s.token && s.expiresAt > now) {
            activeSessions.set(s.token, s);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Could not read .sessions.json:', e);
  }

  function saveSessionsToFile() {
    try {
      const now = Date.now();
      const valid = Array.from(activeSessions.values()).filter((s) => s.expiresAt > now);
      fs.writeFileSync(sessionsFile, JSON.stringify(valid, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not write .sessions.json:', e);
    }
  }

  // Load valid passkeys (from env and secure stored config)
  function getAcceptablePasskeys(): string[] {
    const list: string[] = [];
    if (process.env.ADMIN_PASSKEY) {
      list.push(process.env.ADMIN_PASSKEY);
    }
    // Default system passkey
    list.push('Saahir2026');

    try {
      if (fs.existsSync(authConfigFile)) {
        const stored = JSON.parse(fs.readFileSync(authConfigFile, 'utf8'));
        if (stored && typeof stored.passkey === 'string' && stored.passkey.trim()) {
          list.unshift(stored.passkey.trim());
        }
      }
    } catch (_) {}

    return Array.from(new Set(list.filter(Boolean)));
  }

  // Timing-safe password verification using SHA-256 fixed-length buffers
  function timingSafePasskeyCheck(input: string, candidate: string): boolean {
    if (!input || !candidate) return false;
    const hashA = crypto.createHash('sha256').update(input).digest();
    const hashB = crypto.createHash('sha256').update(candidate).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  // Rate Limiting and Anti-Brute-Force defense
  interface RateLimitRecord {
    attempts: number;
    lockedUntil: number;
    lastAttempt: number;
  }
  const rateLimits = new Map<string, RateLimitRecord>();

  function getClientIp(req: express.Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  // Express middleware to protect sensitive edit and upload endpoints
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : (req.headers['x-auth-token'] as string);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: Valid owner session token required. Please log in.'
      });
    }

    const session = activeSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      if (session) {
        activeSessions.delete(token);
        saveSessionsToFile();
      }
      return res.status(401).json({
        error: 'Unauthorized: Session expired or invalid. Please log in again.'
      });
    }

    (req as any).session = session;
    next();
  };

  // Upload custom PDF resume (Protected by requireAuth)
  app.post('/api/upload-resume', requireAuth, async (req, res) => {
    try {
      const { fileBase64 } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: 'No PDF data provided' });
      }

      const base64Data = fileBase64.replace(/^data:application\/pdf;base64,/, '').replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const targetPath = path.join(publicDir, 'resume.pdf');
      fs.writeFileSync(targetPath, buffer);

      // Also copy to dist if dist exists
      const distDir = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, 'resume.pdf'), buffer);
      }

      // Also persist resumeUrl: "/resume.pdf" into src/data/initialData.ts
      try {
        const initialDataPath = path.join(process.cwd(), 'src', 'data', 'initialData.ts');
        if (fs.existsSync(initialDataPath)) {
          let content = fs.readFileSync(initialDataPath, 'utf8');
          content = content.replace(/resumeUrl:\s*["'][^"']*["']/, `resumeUrl: "/resume.pdf"`);
          fs.writeFileSync(initialDataPath, content, 'utf8');
        }
      } catch (syncErr) {
        console.warn('Could not update initialData.ts with resumeUrl:', syncErr);
      }

      res.json({ success: true, url: '/resume.pdf' });
    } catch (err) {
      console.error('Failed to save resume.pdf:', err);
      res.status(500).json({ error: 'Failed to save resume PDF' });
    }
  });

  // Upload custom image endpoint (Protected by requireAuth)
  app.post('/api/upload-image', requireAuth, async (req, res) => {
    try {
      const { fileBase64, fileName } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Detect extension from data URL or original filename
      let ext = 'png';
      const mimeMatch = fileBase64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
      if (mimeMatch && mimeMatch[1]) {
        ext = mimeMatch[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      } else if (fileName && fileName.includes('.')) {
        ext = fileName.split('.').pop() || 'png';
      }

      const base64Data = fileBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const publicDir = path.join(process.cwd(), 'public');
      const uploadsDir = path.join(publicDir, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeBaseName = (fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') : 'image').slice(0, 32);
      const uniqueFileName = `${Date.now()}_${safeBaseName}.${ext}`;
      const targetPath = path.join(uploadsDir, uniqueFileName);
      fs.writeFileSync(targetPath, buffer);

      // Also mirror into dist/uploads if dist exists
      const distDir = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distDir)) {
        const distUploads = path.join(distDir, 'uploads');
        if (!fs.existsSync(distUploads)) {
          fs.mkdirSync(distUploads, { recursive: true });
        }
        fs.writeFileSync(path.join(distUploads, uniqueFileName), buffer);
      }

      const publicUrl = `/uploads/${uniqueFileName}`;
      return res.json({ success: true, url: publicUrl });
    } catch (err) {
      console.error('Failed to save image:', err);
      return res.status(500).json({ error: 'Failed to save image' });
    }
  });

  // Secure Authentication Endpoint with Rate Limiting & Cryptographic Tokens
  app.post('/api/auth', async (req, res) => {
    const ip = getClientIp(req);
    const now = Date.now();

    // Check rate limit status
    let rateRecord = rateLimits.get(ip);
    if (rateRecord) {
      if (rateRecord.lockedUntil > now) {
        const minutesLeft = Math.ceil((rateRecord.lockedUntil - now) / 60000);
        return res.status(429).json({
          success: false,
          locked: true,
          retryAfterMinutes: minutesLeft,
          message: `Too many failed login attempts. Temporarily locked for ${minutesLeft} more minute(s) to protect portfolio integrity.`
        });
      }
      // Reset if previous attempts were long ago
      if (now - rateRecord.lastAttempt > 30 * 60 * 1000) {
        rateLimits.delete(ip);
        rateRecord = undefined;
      }
    }

    const { email, passkey, rememberMe } = req.body;
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPasskey = typeof passkey === 'string' ? passkey.trim() : '';

    const acceptablePasskeys = getAcceptablePasskeys();
    const isEmailValid = cleanEmail === validEmail;
    const isPasskeyValid = isEmailValid && acceptablePasskeys.some((cand) => timingSafePasskeyCheck(cleanPasskey, cand));

    if (!isPasskeyValid) {
      // Artificial delay (350ms) to thwart automated timing/brute-force attacks
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (!rateRecord) {
        rateRecord = { attempts: 1, lockedUntil: 0, lastAttempt: now };
      } else {
        rateRecord.attempts += 1;
        rateRecord.lastAttempt = now;
      }

      const MAX_ATTEMPTS = 5;
      if (rateRecord.attempts >= MAX_ATTEMPTS) {
        rateRecord.lockedUntil = now + 15 * 60 * 1000; // 15 min lockout
        rateLimits.set(ip, rateRecord);
        return res.status(429).json({
          success: false,
          locked: true,
          retryAfterMinutes: 15,
          message: 'Too many failed attempts. Login temporarily locked for 15 minutes.'
        });
      }

      rateLimits.set(ip, rateRecord);
      const remaining = MAX_ATTEMPTS - rateRecord.attempts;
      return res.status(401).json({
        success: false,
        message: `Incorrect passkey. ${remaining} attempt(s) remaining before a 15-minute security lockout.`,
        remainingAttempts: remaining
      });
    }

    // Success: Clear failed attempts
    rateLimits.delete(ip);

    // Issue cryptographic 256-bit session token
    const token = crypto.randomBytes(32).toString('hex');
    // Session lifetime: 30 days if rememberMe, otherwise 24 hours
    const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = now + duration;

    const sessionData: SessionInfo = {
      token,
      email: validEmail,
      createdAt: now,
      expiresAt,
      ip
    };

    activeSessions.set(token, sessionData);
    saveSessionsToFile();

    return res.json({
      success: true,
      token,
      email: validEmail,
      expiresAt,
      message: 'Authenticated successfully'
    });
  });

  // Verify Active Session
  app.get('/api/auth/session', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : (req.headers['x-auth-token'] as string);

    if (!token) {
      return res.json({ authenticated: false });
    }

    const session = activeSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      if (session) {
        activeSessions.delete(token);
        saveSessionsToFile();
      }
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      email: session.email,
      expiresAt: session.expiresAt
    });
  });

  // Invalidate Session / Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : (req.headers['x-auth-token'] as string);

    if (token) {
      activeSessions.delete(token);
      saveSessionsToFile();
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // Dynamic passkey update endpoint (Protected by requireAuth + old passkey verification)
  app.post('/api/update-passkey', requireAuth, (req, res) => {
    const { currentPasskey, newPasskey } = req.body;
    if (typeof newPasskey !== 'string' || newPasskey.trim().length < 6) {
      return res.status(400).json({ error: 'New passkey must be at least 6 characters long' });
    }

    // Must verify current passkey
    const acceptable = getAcceptablePasskeys();
    const isCurrentValid = typeof currentPasskey === 'string' && acceptable.some((cand) => timingSafePasskeyCheck(currentPasskey.trim(), cand));
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Current passkey is incorrect. Verification failed.' });
    }

    const cleanNewPasskey = newPasskey.trim();
    process.env.ADMIN_PASSKEY = cleanNewPasskey;

    try {
      fs.writeFileSync(
        authConfigFile,
        JSON.stringify(
          {
            passkey: cleanNewPasskey,
            updatedAt: new Date().toISOString()
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (e) {
      console.error('Failed to write .admin_auth.json:', e);
    }

    return res.json({ success: true, message: 'Passkey updated successfully' });
  });

  // Sync edits made via UI directly into source file src/data/initialData.ts (Protected by requireAuth)
  app.post('/api/sync-data', requireAuth, async (req, res) => {
    try {
      const { profile, experienceNodes, projects, skills, sections } = req.body;
      if (!profile) {
        return res.status(400).json({ error: 'Invalid profile data' });
      }

      const filePath = path.join(process.cwd(), 'src', 'data', 'initialData.ts');
      const content = `import { Profile, ExperienceFlowNode, Project, SkillCategory, SectionConfig } from '../types';

export const initialProfile: Profile = ${JSON.stringify(profile, null, 2)};

export const initialExperienceNodes: ExperienceFlowNode[] = ${JSON.stringify(experienceNodes, null, 2)};

export const initialProjects: Project[] = ${JSON.stringify(projects, null, 2)};

export const initialSkills: SkillCategory[] = ${JSON.stringify(skills, null, 2)};

export const initialSections: SectionConfig[] = ${JSON.stringify(sections, null, 2)};
`;

      fs.writeFileSync(filePath, content, 'utf8');
      res.json({ success: true, message: 'Updated src/data/initialData.ts successfully' });
    } catch (err) {
      console.error('Failed to write initialData.ts:', err);
      res.status(500).json({ error: 'Failed to write initialData.ts' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
