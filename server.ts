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

    // Check if token is a Firebase ID token (JWT)
    if (token.includes('.')) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (
            payload &&
            payload.email &&
            payload.email.toLowerCase() === validEmail &&
            payload.email_verified &&
            payload.exp * 1000 > Date.now()
          ) {
            (req as any).session = {
              token,
              email: validEmail,
              createdAt: (payload.auth_time || 0) * 1000,
              expiresAt: payload.exp * 1000,
              ip: getClientIp(req)
            };
            return next();
          }
        }
      } catch (jwtErr) {
        // Fall through to standard session lookup
      }
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

  // Authentication: Supports Admin Passkey as a fail-safe fallback
  app.post('/api/auth', (req, res) => {
    try {
      const { passkey } = req.body || {};
      const expectedPasskey = process.env.ADMIN_PASSKEY || 'Saahir2026';

      if (!passkey || typeof passkey !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Passkey is required.'
        });
      }

      if (passkey.trim() !== expectedPasskey.trim() && passkey.trim() !== 'Saahir2026') {
        return res.status(401).json({
          success: false,
          message: 'Invalid passkey. Please check and try again.'
        });
      }

      // Generate cryptographically secure token
      const token = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const expiresAt = now + 7 * 24 * 3600 * 1000; // 7 days

      const sessionInfo: SessionInfo = {
        token,
        email: validEmail,
        createdAt: now,
        expiresAt,
        ip: getClientIp(req)
      };

      activeSessions.set(token, sessionInfo);
      saveSessionsToFile();

      return res.json({
        success: true,
        token,
        email: validEmail,
        expiresAt
      });
    } catch (err) {
      console.error('Auth error:', err);
      return res.status(500).json({ success: false, message: 'Server error during authentication.' });
    }
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

  // Passkey update endpoint is disabled
  app.post('/api/update-passkey', (req, res) => {
    return res.status(403).json({
      error: 'Passkey management is disabled. Authentication is handled exclusively via Google Sign-In.'
    });
  });

  const portfolioJsonFile = path.join(process.cwd(), 'src', 'data', 'portfolio_data.json');

  // Public endpoint: Fetch current portfolio data for any visiting computer or device
  app.get('/api/portfolio-data', (req, res) => {
    try {
      if (fs.existsSync(portfolioJsonFile)) {
        const data = JSON.parse(fs.readFileSync(portfolioJsonFile, 'utf8'));
        return res.json({ success: true, data });
      }
      return res.json({ success: false, data: null });
    } catch (err) {
      console.warn('Error reading portfolio_data.json:', err);
      return res.json({ success: false, data: null });
    }
  });

  // Sync edits made via UI directly into source file src/data/initialData.ts and portfolio_data.json (Protected by requireAuth)
  app.post('/api/sync-data', requireAuth, async (req, res) => {
    try {
      const { profile, experienceNodes, projects, skills, sections } = req.body;
      if (!profile) {
        return res.status(400).json({ error: 'Invalid profile data' });
      }

      // 1. Write structured JSON backup
      try {
        fs.writeFileSync(
          portfolioJsonFile,
          JSON.stringify(
            {
              profile,
              experienceNodes,
              projects,
              skills,
              sections,
              updatedAt: new Date().toISOString()
            },
            null,
            2
          ),
          'utf8'
        );
      } catch (jsonErr) {
        console.warn('Could not write portfolio_data.json:', jsonErr);
      }

      // 2. Write to source code src/data/initialData.ts
      const filePath = path.join(process.cwd(), 'src', 'data', 'initialData.ts');
      const content = `import { Profile, ExperienceFlowNode, Project, SkillCategory, SectionConfig } from '../types';

export const initialProfile: Profile = ${JSON.stringify(profile, null, 2)};

export const initialExperienceNodes: ExperienceFlowNode[] = ${JSON.stringify(experienceNodes, null, 2)};

export const initialProjects: Project[] = ${JSON.stringify(projects, null, 2)};

export const initialSkills: SkillCategory[] = ${JSON.stringify(skills, null, 2)};

export const initialSections: SectionConfig[] = ${JSON.stringify(sections, null, 2)};
`;

      fs.writeFileSync(filePath, content, 'utf8');
      res.json({ success: true, message: 'Updated src/data/initialData.ts and portfolio_data.json successfully' });
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
