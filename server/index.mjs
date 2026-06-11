import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULTS } from '../js/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const PORT = Number(process.env.PORT) || 3000;
const sessions = new Map();

function readJson(file, fallback) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return structuredClone(fallback);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

function initData() {
  if (!fs.existsSync(path.join(DATA_DIR, 'admin.json'))) {
    writeJson('admin.json', { username: 'admin', password: 'pehuenche2026' });
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'properties.json'))) {
    writeJson('properties.json', structuredClone(DEFAULTS));
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'leads.json'))) writeJson('leads.json', []);
  if (!fs.existsSync(path.join(DATA_DIR, 'clicks.json'))) writeJson('clicks.json', []);
}

initData();

function weekStart(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  req.adminUser = session.user;
  next();
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes JPG, PNG, WEBP o GIF'));
  },
});

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, backend: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const admin = readJson('admin.json', {});
  if (username !== admin.username || password !== admin.password) {
    return res.status(401).json({ ok: false, error: 'Credenciales incorrectas.' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { user: username, expires: Date.now() + 8 * 60 * 60 * 1000 });
  res.json({ ok: true, token, user: username });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.adminUser });
});

app.get('/api/admin/config', authMiddleware, (_req, res) => {
  const admin = readJson('admin.json', {});
  res.json({ username: admin.username });
});

app.put('/api/admin/config', authMiddleware, (req, res) => {
  const { username, password, newPassword } = req.body || {};
  const admin = readJson('admin.json', {});
  if (password !== admin.password) {
    return res.status(400).json({ error: 'Contraseña actual incorrecta.' });
  }
  if (username?.trim()) admin.username = username.trim();
  if (newPassword?.trim()) admin.password = newPassword.trim();
  writeJson('admin.json', admin);
  res.json({ ok: true, username: admin.username });
});

app.get('/api/properties', (_req, res) => {
  res.json(readJson('properties.json', []));
});

app.post('/api/properties', authMiddleware, (req, res) => {
  const properties = readJson('properties.json', []);
  const prop = req.body;
  if (!prop?.titulo) return res.status(400).json({ error: 'Título obligatorio' });
  if (!prop.id) prop.id = 'p' + Date.now().toString(36);
  const idx = properties.findIndex(p => p.id === prop.id);
  if (idx >= 0) properties[idx] = prop;
  else properties.push(prop);
  writeJson('properties.json', properties);
  res.json(properties);
});

app.delete('/api/properties/:id', authMiddleware, (req, res) => {
  let properties = readJson('properties.json', []);
  properties = properties.filter(p => p.id !== req.params.id);
  writeJson('properties.json', properties);
  res.json(properties);
});

app.post('/api/upload', authMiddleware, upload.array('images', 12), (req, res) => {
  const urls = (req.files || []).map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

app.post('/api/analytics/click', (req, res) => {
  const { propertyId } = req.body || {};
  if (!propertyId) return res.status(400).json({ error: 'propertyId requerido' });
  const clicks = readJson('clicks.json', []);
  clicks.push({ propertyId, at: Date.now() });
  if (clicks.length > 10000) clicks.splice(0, clicks.length - 10000);
  writeJson('clicks.json', clicks);
  res.json({ ok: true });
});

app.get('/api/analytics/weekly', (_req, res) => {
  const start = weekStart();
  const clicks = readJson('clicks.json', []).filter(c => c.at >= start);
  res.json({ clicks, total: clicks.length });
});

app.get('/api/leads', authMiddleware, (_req, res) => {
  res.json(readJson('leads.json', []));
});

app.post('/api/leads', (req, res) => {
  const { propertyId, propertyTitle, nombre, email, mensaje } = req.body || {};
  if (!email?.trim() || !nombre?.trim()) {
    return res.status(400).json({ error: 'Nombre y correo obligatorios' });
  }
  const leads = readJson('leads.json', []);
  const lead = {
    id: 'l' + Date.now().toString(36),
    propertyId, propertyTitle, nombre: nombre.trim(), email: email.trim(),
    mensaje: (mensaje || '').trim(), at: Date.now(), contacted: false,
  };
  leads.unshift(lead);
  writeJson('leads.json', leads);
  res.json(lead);
});

app.patch('/api/leads/:id', authMiddleware, (req, res) => {
  const leads = readJson('leads.json', []);
  const lead = leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'No encontrado' });
  if (req.body.contacted !== undefined) lead.contacted = !!req.body.contacted;
  writeJson('leads.json', leads);
  res.json(leads);
});

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(ROOT));

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || 'Error' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Pewenche → http://localhost:${PORT}\n  API: /api/*  |  Admin: pie de página → Acceso administrador\n`);
});
