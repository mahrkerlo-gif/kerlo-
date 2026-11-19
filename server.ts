import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { NextFunction, Request, Response } from 'express';
import { getAnalyticsSummary, recordAffiliateClick, recordVisit } from './server/analytics';
import {
  db,
  getAllArticles,
  getAllCategories,
  getAllProducts,
  getSiteSettings,
  hashPassword,
  OWNER_USERNAME,
  saveSiteSettings,
  verifyPassword,
} from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
const SESSION_COOKIE_NAME = 'ekhtyarak_owner_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Simple in-memory login rate limiter (max 8 attempts / 15 min per IP)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 8) {
    return false;
  }
  entry.count += 1;
  return true;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

function getValidSession(token: string | null): { username: string; expiresAt: string } | null {
  if (!token) return null;
  const row = db
    .prepare('SELECT username, expires_at FROM owner_sessions WHERE token = ?')
    .get(token);
  if (!row) return null;
  const expiresAt = String(row.expires_at);
  if (new Date(expiresAt).getTime() <= Date.now()) {
    db.prepare('DELETE FROM owner_sessions WHERE token = ?').run(token);
    return null;
  }
  return { username: String(row.username), expiresAt };
}

function setSessionCookie(res: Response, req: Request, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(res: Response, req: Request): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function requireOwnerAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractSessionToken(req);
  const session = getValidSession(token);
  if (!session) {
    res.status(401).json({ ok: false, error: 'Unauthorized: Owner login required.' });
    return;
  }
  next();
}

function sanitizeId(raw: string, prefix: string): string {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `${prefix}_${Date.now()}`;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '12mb' }));

  // =========================================================
  // PUBLIC UPLOADS & BOOTSTRAP ROUTES
  // =========================================================
  app.get('/api/uploads/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Not found');
      return;
    }
    res.sendFile(filePath);
  });

  app.get('/api/public/bootstrap', (_req, res) => {
    const categories = getAllCategories(false);
    const activeCatIds = new Set(categories.map((c) => c.id));
    const activeSubIds = new Set(categories.flatMap((c) => c.subcategories.map((s) => s.id)));
    const products = getAllProducts(false).filter(
      (p) => activeCatIds.has(p.categoryId) && activeSubIds.has(p.subcategoryId)
    );
    const articles = getAllArticles(false);
    const settings = getSiteSettings();

    res.json({
      ok: true,
      categories,
      products,
      articles,
      settings,
    });
  });

  // =========================================================
  // REAL VISITOR & AFFILIATE CLICK TRACKING ROUTES
  // =========================================================
  app.post('/api/analytics/visit', (req, res) => {
    const body = (req.body ?? {}) as {
      visitorId?: string;
      sessionId?: string;
      pagePath?: string;
      pageType?: string;
      entityId?: string;
      referrer?: string;
    };

    const visitorId = String(body.visitorId ?? '').trim().slice(0, 64);
    const sessionId = String(body.sessionId ?? '').trim().slice(0, 64);
    const pagePath = String(body.pagePath ?? '/').trim().slice(0, 200);
    const pageType = String(body.pageType ?? 'home').trim().slice(0, 32);

    if (!visitorId || !sessionId) {
      res.status(400).json({ ok: false, error: 'Missing visitor or session ID.' });
      return;
    }

    // Never count owner dashboard paths as public visitor traffic
    if (pageType === 'owner-login' || pageType === 'owner-dashboard') {
      res.json({ ok: true, ignored: true });
      return;
    }

    recordVisit({
      visitorId,
      sessionId,
      pagePath,
      pageType,
      entityId: String(body.entityId ?? '').slice(0, 120),
      referrer: String(body.referrer ?? '').slice(0, 250),
    });

    res.status(201).json({ ok: true });
  });

  app.post('/api/affiliate-click', (req, res) => {
    const body = (req.body ?? {}) as {
      visitorId?: string;
      productId?: string;
      productName?: string;
      brand?: string;
      model?: string;
      asin?: string;
      affiliateUrl?: string;
      categoryId?: string;
      subcategoryId?: string;
      priceEgp?: number;
    };

    if (!body.productId || !body.asin || !body.affiliateUrl) {
      res.status(400).json({ ok: false, error: 'Missing required product affiliate fields.' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.affiliateUrl);
    } catch {
      res.status(400).json({ ok: false, error: 'Invalid affiliate URL.' });
      return;
    }

    if (!parsedUrl.hostname.endsWith('amazon.eg') || !parsedUrl.pathname.includes('/dp/')) {
      res.status(400).json({
        ok: false,
        error: 'Affiliate URL must point to a specific Amazon Egypt product page.',
      });
      return;
    }

    const clickId = `clk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const { recordedAt } = recordAffiliateClick({
      clickId,
      visitorId: String(body.visitorId ?? 'anonymous').slice(0, 64),
      productId: String(body.productId),
      productName: String(body.productName ?? ''),
      brand: String(body.brand ?? ''),
      model: String(body.model ?? ''),
      asin: String(body.asin),
      affiliateUrl: parsedUrl.toString(),
      categoryId: String(body.categoryId ?? ''),
      subcategoryId: String(body.subcategoryId ?? ''),
      priceEgp: Number(body.priceEgp ?? 0),
    });

    const countRow = db
      .prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks WHERE product_id = ?')
      .get(String(body.productId));

    res.status(201).json({
      ok: true,
      clickId,
      recordedAt,
      redirectUrl: parsedUrl.toString(),
      totalClicksForProduct: Number(countRow?.cnt ?? 1),
    });
  });

  // =========================================================
  // OWNER AUTHENTICATION ROUTES
  // =========================================================
  app.get('/api/owner/session', (req, res) => {
    const token = extractSessionToken(req);
    const session = getValidSession(token);
    if (!session) {
      res.json({ ok: true, authenticated: false });
      return;
    }
    res.json({
      ok: true,
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
    });
  });

  app.post('/api/owner/login', (req, res) => {
    const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
    if (!checkRateLimit(ip)) {
      res.status(429).json({
        ok: false,
        error: 'تم تجاوز الحد المسموح لمحاولات الدخول. يرجى المحاولة بعد قليل.',
      });
      return;
    }

    const body = (req.body ?? {}) as { username?: string; password?: string };
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!username || !password) {
      res.status(400).json({ ok: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' });
      return;
    }

    if (username !== OWNER_USERNAME) {
      res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة.' });
      return;
    }

    const authRow = db
      .prepare('SELECT username, password_hash, password_salt FROM owner_auth WHERE username = ?')
      .get(OWNER_USERNAME);

    if (
      !authRow ||
      !verifyPassword(password, String(authRow.password_hash), String(authRow.password_salt))
    ) {
      res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

    db.prepare(
      'INSERT INTO owner_sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
    ).run(token, OWNER_USERNAME, now.toISOString(), expiresAt);

    setSessionCookie(res, req, token);
    res.json({
      ok: true,
      authenticated: true,
      username: OWNER_USERNAME,
      token,
      expiresAt,
    });
  });

  app.post('/api/owner/logout', (req, res) => {
    const token = extractSessionToken(req);
    if (token) {
      db.prepare('DELETE FROM owner_sessions WHERE token = ?').run(token);
    }
    clearSessionCookie(res, req);
    res.json({ ok: true });
  });

  app.post('/api/owner/change-password', requireOwnerAuth, (req, res) => {
    const body = (req.body ?? {}) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      res.status(400).json({ ok: false, error: 'يرجى إدخال كلمة المرور الحالية والجديدة.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        ok: false,
        error: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
      });
      return;
    }

    if (newPassword.trim() === OWNER_USERNAME) {
      res.status(400).json({
        ok: false,
        error: 'لا يمكن استخدام اسم المستخدم ككلمة مرور.',
      });
      return;
    }

    const authRow = db
      .prepare('SELECT password_hash, password_salt FROM owner_auth WHERE username = ?')
      .get(OWNER_USERNAME);

    if (
      !authRow ||
      !verifyPassword(
        currentPassword,
        String(authRow.password_hash),
        String(authRow.password_salt)
      )
    ) {
      res.status(401).json({ ok: false, error: 'كلمة المرور الحالية غير صحيحة.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    db.prepare(
      'UPDATE owner_auth SET password_hash = ?, password_salt = ?, updated_at = ? WHERE username = ?'
    ).run(hash, salt, new Date().toISOString(), OWNER_USERNAME);

    res.json({ ok: true });
  });

  // =========================================================
  // PROTECTED OWNER ANALYTICS & WORKSPACE ROUTES
  // =========================================================
  app.get('/api/owner/analytics', requireOwnerAuth, (req, res) => {
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    const summary = getAnalyticsSummary(startDate, endDate);
    res.json({ ok: true, summary });
  });

  app.get('/api/owner/workspace', requireOwnerAuth, (_req, res) => {
    res.json({
      ok: true,
      categories: getAllCategories(true),
      products: getAllProducts(true),
      articles: getAllArticles(true),
      settings: getSiteSettings(),
    });
  });

  app.post('/api/owner/upload-image', requireOwnerAuth, (req, res) => {
    const body = (req.body ?? {}) as { filename?: string; dataUrl?: string };
    if (!body.dataUrl || typeof body.dataUrl !== 'string') {
      res.status(400).json({ ok: false, error: 'بيانات الصورة مفقودة.' });
      return;
    }

    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i.exec(body.dataUrl);
    if (!match) {
      res.status(400).json({ ok: false, error: 'صيغة الصورة غير مدعومة.' });
      return;
    }

    const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    const base = path
      .basename(body.filename || 'upload', path.extname(body.filename || 'upload'))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 32);
    const finalName = `${base || 'img'}_${Date.now()}_${crypto.randomBytes(2).toString('hex')}.${ext}`;
    const destPath = path.join(UPLOADS_DIR, finalName);

    try {
      fs.writeFileSync(destPath, Buffer.from(match[2], 'base64'));
      res.status(201).json({ ok: true, imageUrl: `/api/uploads/${finalName}` });
    } catch {
      res.status(500).json({ ok: false, error: 'فشل حفظ الصورة.' });
    }
  });

  // --- CATEGORY CRUD ---
  app.post('/api/owner/categories', requireOwnerAuth, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const title = String(b.title ?? '').trim();
    if (!title) {
      res.status(400).json({ ok: false, error: 'اسم القسم مطلوب.' });
      return;
    }
    const baseId = sanitizeId(String(b.id || b.englishTitle || `cat_${Date.now()}`), 'cat');
    const exists = db.prepare('SELECT id FROM categories WHERE id = ?').get(baseId);
    const id = exists ? `${baseId}_${Date.now()}` : baseId;

    db.prepare(
      `INSERT INTO categories (id, title, english_title, description, image, display_order, is_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title,
      String(b.englishTitle ?? '').trim() || 'Category',
      String(b.description ?? '').trim(),
      String(b.image ?? '/src/assets/images/cat_computer_gear_1795107716790.jpg'),
      Number(b.displayOrder ?? 10),
      b.isEnabled === false ? 0 : 1,
      new Date().toISOString()
    );

    res.status(201).json({ ok: true, id, categories: getAllCategories(true) });
  });

  app.put('/api/owner/categories/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const title = String(b.title ?? '').trim();
    if (!title) {
      res.status(400).json({ ok: false, error: 'اسم القسم مطلوب.' });
      return;
    }

    const result = db
      .prepare(
        `UPDATE categories
         SET title = ?, english_title = ?, description = ?, image = ?, display_order = ?, is_enabled = ?
         WHERE id = ?`
      )
      .run(
        title,
        String(b.englishTitle ?? '').trim(),
        String(b.description ?? '').trim(),
        String(b.image ?? ''),
        Number(b.displayOrder ?? 0),
        b.isEnabled === false ? 0 : 1,
        id
      );

    if (Number(result.changes) === 0) {
      res.status(404).json({ ok: false, error: 'القسم غير موجود.' });
      return;
    }

    res.json({ ok: true, categories: getAllCategories(true) });
  });

  app.delete('/api/owner/categories/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    db.prepare('DELETE FROM products WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM subcategories WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.json({
      ok: true,
      categories: getAllCategories(true),
      products: getAllProducts(true),
    });
  });

  // --- SUBCATEGORY CRUD + MOVE ---
  app.post('/api/owner/subcategories', requireOwnerAuth, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const categoryId = String(b.categoryId ?? '').trim();
    const title = String(b.title ?? '').trim();
    if (!categoryId || !title) {
      res.status(400).json({ ok: false, error: 'القسم الرئيسي واسم القسم الفرعي مطلوبان.' });
      return;
    }

    const baseId = sanitizeId(String(b.id || `sub_${Date.now()}`), 'sub');
    const exists = db.prepare('SELECT id FROM subcategories WHERE id = ?').get(baseId);
    const id = exists ? `${baseId}_${Date.now()}` : baseId;

    db.prepare(
      `INSERT INTO subcategories (id, category_id, title, description, image, buying_tip, display_order, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      categoryId,
      title,
      String(b.description ?? '').trim(),
      String(b.image ?? '/src/assets/images/cat_computer_gear_1795107716790.jpg'),
      String(b.buyingTip ?? '').trim(),
      Number(b.displayOrder ?? 10),
      b.isEnabled === false ? 0 : 1
    );

    res.status(201).json({ ok: true, id, categories: getAllCategories(true) });
  });

  app.put('/api/owner/subcategories/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const categoryId = String(b.categoryId ?? '').trim();
    const title = String(b.title ?? '').trim();
    if (!categoryId || !title) {
      res.status(400).json({ ok: false, error: 'القسم الرئيسي واسم القسم الفرعي مطلوبان.' });
      return;
    }

    const result = db
      .prepare(
        `UPDATE subcategories
         SET category_id = ?, title = ?, description = ?, image = ?, buying_tip = ?, display_order = ?, is_enabled = ?
         WHERE id = ?`
      )
      .run(
        categoryId,
        title,
        String(b.description ?? '').trim(),
        String(b.image ?? ''),
        String(b.buyingTip ?? '').trim(),
        Number(b.displayOrder ?? 0),
        b.isEnabled === false ? 0 : 1,
        id
      );

    if (Number(result.changes) === 0) {
      res.status(404).json({ ok: false, error: 'القسم الفرعي غير موجود.' });
      return;
    }

    // Keep products synced if subcategory was moved to a different main category
    db.prepare('UPDATE products SET category_id = ? WHERE subcategory_id = ?').run(categoryId, id);

    res.json({
      ok: true,
      categories: getAllCategories(true),
      products: getAllProducts(true),
    });
  });

  app.delete('/api/owner/subcategories/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    db.prepare('DELETE FROM products WHERE subcategory_id = ?').run(id);
    db.prepare('DELETE FROM subcategories WHERE id = ?').run(id);

    res.json({
      ok: true,
      categories: getAllCategories(true),
      products: getAllProducts(true),
    });
  });

  // --- PRODUCT CRUD + MOVE ---
  app.post('/api/owner/products', requireOwnerAuth, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const name = String(b.name ?? '').trim();
    const brand = String(b.brand ?? '').trim();
    const categoryId = String(b.categoryId ?? '').trim();
    const subcategoryId = String(b.subcategoryId ?? '').trim();
    const affiliateUrl = String(b.affiliateUrl ?? '').trim();

    if (!name || !brand || !categoryId || !subcategoryId || !affiliateUrl) {
      res.status(400).json({ ok: false, error: 'يرجى استكمال الحقول الأساسية للمنتج ورابط أمازون.' });
      return;
    }

    const baseId = sanitizeId(String(b.id || `prod_${Date.now()}`), 'prod');
    const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(baseId);
    const id = exists ? `${baseId}_${Date.now()}` : baseId;
    const gallery = Array.isArray(b.galleryImages) && b.galleryImages.length > 0
      ? b.galleryImages
      : [String(b.image ?? '/src/assets/images/cat_computer_gear_1795107716790.jpg')];

    db.prepare(
      `INSERT INTO products (
        id, category_id, subcategory_id, name, brand, model, asin, affiliate_url,
        image, gallery_images_json, description, editorial_note, specs_json,
        advantages_json, disadvantages_json, verified_price_egp, original_price_egp,
        price_verified_date, availability, availability_text, usage_levels_json,
        priorities_json, badges_json, display_order, is_enabled, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      categoryId,
      subcategoryId,
      name,
      brand,
      String(b.model ?? name).trim(),
      String(b.asin ?? 'B0CUSTOM01').trim(),
      affiliateUrl,
      String(gallery[0]),
      JSON.stringify(gallery),
      String(b.description ?? '').trim(),
      String(b.editorialNote ?? '').trim(),
      JSON.stringify(Array.isArray(b.specs) ? b.specs : []),
      JSON.stringify(Array.isArray(b.advantages) ? b.advantages : []),
      JSON.stringify(Array.isArray(b.disadvantages) ? b.disadvantages : []),
      Math.max(0, Number(b.verifiedPriceEgp ?? 0)),
      b.originalPriceEgp ? Number(b.originalPriceEgp) : null,
      String(b.priceVerifiedDate ?? 'محقق في نوفمبر 2026'),
      String(b.availability ?? 'IN_STOCK'),
      String(b.availabilityText ?? 'متاح للشراء على أمازون مصر'),
      JSON.stringify(Array.isArray(b.usageLevels) ? b.usageLevels : ['beginner', 'intermediate']),
      JSON.stringify(Array.isArray(b.priorities) ? b.priorities : ['value']),
      JSON.stringify(Array.isArray(b.badges) ? b.badges : []),
      Number(b.displayOrder ?? 1),
      b.isEnabled === false ? 0 : 1,
      new Date().toISOString()
    );

    res.status(201).json({ ok: true, id, products: getAllProducts(true) });
  });

  app.put('/api/owner/products/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const name = String(b.name ?? '').trim();
    const brand = String(b.brand ?? '').trim();
    const categoryId = String(b.categoryId ?? '').trim();
    const subcategoryId = String(b.subcategoryId ?? '').trim();
    const affiliateUrl = String(b.affiliateUrl ?? '').trim();

    if (!name || !brand || !categoryId || !subcategoryId || !affiliateUrl) {
      res.status(400).json({ ok: false, error: 'يرجى استكمال الحقول الأساسية للمنتج ورابط أمازون.' });
      return;
    }

    const gallery = Array.isArray(b.galleryImages) && b.galleryImages.length > 0
      ? b.galleryImages
      : [String(b.image ?? '/src/assets/images/cat_computer_gear_1795107716790.jpg')];

    const result = db
      .prepare(
        `UPDATE products SET
          category_id = ?, subcategory_id = ?, name = ?, brand = ?, model = ?, asin = ?, affiliate_url = ?,
          image = ?, gallery_images_json = ?, description = ?, editorial_note = ?, specs_json = ?,
          advantages_json = ?, disadvantages_json = ?, verified_price_egp = ?, original_price_egp = ?,
          price_verified_date = ?, availability = ?, availability_text = ?, usage_levels_json = ?,
          priorities_json = ?, badges_json = ?, display_order = ?, is_enabled = ?
         WHERE id = ?`
      )
      .run(
        categoryId,
        subcategoryId,
        name,
        brand,
        String(b.model ?? name).trim(),
        String(b.asin ?? 'B0CUSTOM01').trim(),
        affiliateUrl,
        String(gallery[0]),
        JSON.stringify(gallery),
        String(b.description ?? '').trim(),
        String(b.editorialNote ?? '').trim(),
        JSON.stringify(Array.isArray(b.specs) ? b.specs : []),
        JSON.stringify(Array.isArray(b.advantages) ? b.advantages : []),
        JSON.stringify(Array.isArray(b.disadvantages) ? b.disadvantages : []),
        Math.max(0, Number(b.verifiedPriceEgp ?? 0)),
        b.originalPriceEgp ? Number(b.originalPriceEgp) : null,
        String(b.priceVerifiedDate ?? 'محقق في نوفمبر 2026'),
        String(b.availability ?? 'IN_STOCK'),
        String(b.availabilityText ?? 'متاح للشراء على أمازون مصر'),
        JSON.stringify(Array.isArray(b.usageLevels) ? b.usageLevels : ['beginner', 'intermediate']),
        JSON.stringify(Array.isArray(b.priorities) ? b.priorities : ['value']),
        JSON.stringify(Array.isArray(b.badges) ? b.badges : []),
        Number(b.displayOrder ?? 1),
        b.isEnabled === false ? 0 : 1,
        id
      );

    if (Number(result.changes) === 0) {
      res.status(404).json({ ok: false, error: 'المنتج غير موجود.' });
      return;
    }

    res.json({ ok: true, products: getAllProducts(true) });
  });

  app.delete('/api/owner/products/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ ok: true, products: getAllProducts(true) });
  });

  // --- ARTICLES CRUD ---
  app.post('/api/owner/articles', requireOwnerAuth, (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const title = String(b.title ?? '').trim();
    if (!title) {
      res.status(400).json({ ok: false, error: 'عنوان المقال مطلوب.' });
      return;
    }

    const id = `art_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO articles (id, title, summary, content, cover_image, category_id, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title,
      String(b.summary ?? '').trim(),
      String(b.content ?? '').trim(),
      String(b.coverImage ?? '/src/assets/images/cat_content_creation_1795108122118.jpg'),
      String(b.categoryId ?? 'content-creation'),
      b.isPublished === false ? 0 : 1,
      now,
      now
    );

    res.status(201).json({ ok: true, id, articles: getAllArticles(true) });
  });

  app.put('/api/owner/articles/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const title = String(b.title ?? '').trim();
    if (!title) {
      res.status(400).json({ ok: false, error: 'عنوان المقال مطلوب.' });
      return;
    }

    const result = db
      .prepare(
        `UPDATE articles
         SET title = ?, summary = ?, content = ?, cover_image = ?, category_id = ?, is_published = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        title,
        String(b.summary ?? '').trim(),
        String(b.content ?? '').trim(),
        String(b.coverImage ?? ''),
        String(b.categoryId ?? ''),
        b.isPublished === false ? 0 : 1,
        new Date().toISOString(),
        id
      );

    if (Number(result.changes) === 0) {
      res.status(404).json({ ok: false, error: 'المقال غير موجود.' });
      return;
    }

    res.json({ ok: true, articles: getAllArticles(true) });
  });

  app.delete('/api/owner/articles/:id', requireOwnerAuth, (req, res) => {
    const id = String(req.params.id);
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    res.json({ ok: true, articles: getAllArticles(true) });
  });

  // --- SITE SETTINGS ---
  app.put('/api/owner/settings', requireOwnerAuth, (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const current = getSiteSettings();
    const updated = saveSiteSettings({
      ...current,
      brandArabic: String(body.brandArabic ?? current.brandArabic),
      brandEnglish: String(body.brandEnglish ?? current.brandEnglish),
      slogan: String(body.slogan ?? current.slogan),
      heroHeadline: String(body.heroHeadline ?? current.heroHeadline),
      heroSubheadline: String(body.heroSubheadline ?? current.heroSubheadline),
      finderTitle: String(body.finderTitle ?? current.finderTitle),
      finderDescription: String(body.finderDescription ?? current.finderDescription),
      showFeaturedSection:
        typeof body.showFeaturedSection === 'boolean'
          ? body.showFeaturedSection
          : current.showFeaturedSection,
      showArticlesSection:
        typeof body.showArticlesSection === 'boolean'
          ? body.showArticlesSection
          : current.showArticlesSection,
      methodologyTitle: String(body.methodologyTitle ?? current.methodologyTitle),
      methodologySubtitle: String(body.methodologySubtitle ?? current.methodologySubtitle),
      footerAbout: String(body.footerAbout ?? current.footerAbout),
      affiliateDisclosure: String(body.affiliateDisclosure ?? current.affiliateDisclosure),
      amazonTag: String(body.amazonTag ?? current.amazonTag),
    });

    res.json({ ok: true, settings: updated });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`EKHTYARAK server running on http://0.0.0.0:${port}`);
  });
}

startServer();
