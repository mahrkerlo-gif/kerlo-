import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_ARTICLES, INITIAL_SITE_SETTINGS, MAIN_CATEGORIES, PRODUCTS } from '../src/data/catalog';
import {
  Article,
  MainCategory,
  Product,
  SiteSettings,
  Subcategory,
} from '../src/types/catalog';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'ekhtyarak.db');

export const OWNER_USERNAME = 'Kirlos Maher';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS owner_auth (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS owner_sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    english_title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    buying_tip TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    asin TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    image TEXT NOT NULL,
    gallery_images_json TEXT NOT NULL,
    description TEXT NOT NULL,
    editorial_note TEXT NOT NULL,
    specs_json TEXT NOT NULL,
    advantages_json TEXT NOT NULL,
    disadvantages_json TEXT NOT NULL,
    verified_price_egp REAL NOT NULL,
    original_price_egp REAL,
    price_verified_date TEXT NOT NULL,
    availability TEXT NOT NULL,
    availability_text TEXT NOT NULL,
    usage_levels_json TEXT NOT NULL,
    priorities_json TEXT NOT NULL,
    badges_json TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    category_id TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS visitor_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    page_type TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT '',
    referrer TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    date_key TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_visitor_events_date ON visitor_events(date_key);
  CREATE INDEX IF NOT EXISTS idx_visitor_events_visitor ON visitor_events(visitor_id);

  CREATE TABLE IF NOT EXISTS affiliate_clicks (
    click_id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    asin TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    category_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    price_egp REAL NOT NULL,
    created_at TEXT NOT NULL,
    date_key TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_date ON affiliate_clicks(date_key);
  CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_product ON affiliate_clicks(product_id);
`);

export function getCairoDateKey(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getCairoHour(date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    hour12: false,
  });
  return Number(formatter.format(date)) % 24;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash: derived, salt: usedSalt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function seedDatabaseIfNeeded(): void {
  const now = new Date().toISOString();

  // 1. Migrate & seed Owner Auth if missing (invalidates legacy owner credentials & sessions)
  const existingOwner = db
    .prepare('SELECT username FROM owner_auth WHERE username = ?')
    .get(OWNER_USERNAME);

  if (!existingOwner) {
    db.prepare('DELETE FROM owner_sessions WHERE username != ?').run(OWNER_USERNAME);
    db.prepare('DELETE FROM owner_auth WHERE username != ?').run(OWNER_USERNAME);

    const envPassword = process.env.OWNER_PASSWORD?.trim();
    const initialPassword =
      envPassword && envPassword !== OWNER_USERNAME && envPassword.length >= 8
        ? envPassword
        : '01289053489';
    const { hash, salt } = hashPassword(initialPassword);
    db.prepare(
      'INSERT INTO owner_auth (username, password_hash, password_salt, updated_at) VALUES (?, ?, ?, ?)'
    ).run(OWNER_USERNAME, hash, salt, now);
  }

  // 2. Seed Categories & Subcategories if empty
  const catCountRow = db.prepare('SELECT COUNT(*) as cnt FROM categories').get();
  if (Number(catCountRow?.cnt ?? 0) === 0) {
    MAIN_CATEGORIES.forEach((cat, catIdx) => {
      db.prepare(
        `INSERT INTO categories (id, title, english_title, description, image, display_order, is_enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        cat.id,
        cat.title,
        cat.englishTitle,
        cat.description,
        cat.image,
        cat.displayOrder ?? catIdx + 1,
        cat.isEnabled === false ? 0 : 1,
        now
      );

      cat.subcategories.forEach((sub, subIdx) => {
        db.prepare(
          `INSERT INTO subcategories (id, category_id, title, description, image, buying_tip, display_order, is_enabled)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          sub.id,
          cat.id,
          sub.title,
          sub.description,
          sub.image,
          sub.buyingTip,
          sub.displayOrder ?? subIdx + 1,
          sub.isEnabled === false ? 0 : 1
        );
      });
    });
  }

  // 3. Seed Products if empty
  const prodCountRow = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
  if (Number(prodCountRow?.cnt ?? 0) === 0) {
    PRODUCTS.forEach((prod, idx) => {
      db.prepare(
        `INSERT INTO products (
          id, category_id, subcategory_id, name, brand, model, asin, affiliate_url,
          image, gallery_images_json, description, editorial_note, specs_json,
          advantages_json, disadvantages_json, verified_price_egp, original_price_egp,
          price_verified_date, availability, availability_text, usage_levels_json,
          priorities_json, badges_json, display_order, is_enabled, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        prod.id,
        prod.categoryId,
        prod.subcategoryId,
        prod.name,
        prod.brand,
        prod.model,
        prod.asin,
        prod.affiliateUrl,
        prod.image,
        JSON.stringify(prod.galleryImages ?? [prod.image]),
        prod.description,
        prod.editorialNote,
        JSON.stringify(prod.specs),
        JSON.stringify(prod.advantages),
        JSON.stringify(prod.disadvantages),
        prod.verifiedPriceEgp,
        prod.originalPriceEgp ?? null,
        prod.priceVerifiedDate,
        prod.availability,
        prod.availabilityText,
        JSON.stringify(prod.usageLevels ?? ['beginner', 'intermediate']),
        JSON.stringify(prod.priorities ?? ['value']),
        JSON.stringify(prod.badges ?? []),
        prod.displayOrder ?? idx + 1,
        prod.isEnabled === false ? 0 : 1,
        now
      );
    });
  }

  // 4. Seed Articles if empty
  const artCountRow = db.prepare('SELECT COUNT(*) as cnt FROM articles').get();
  if (Number(artCountRow?.cnt ?? 0) === 0) {
    INITIAL_ARTICLES.forEach((article) => {
      db.prepare(
        `INSERT INTO articles (id, title, summary, content, cover_image, category_id, is_published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        article.id,
        article.title,
        article.summary,
        article.content,
        article.coverImage,
        article.categoryId,
        article.isPublished ? 1 : 0,
        article.createdAt,
        article.updatedAt
      );
    });
  }

  // 5. Seed Site Settings if missing
  const settingsRow = db.prepare('SELECT key FROM site_settings WHERE key = ?').get('main');
  if (!settingsRow) {
    db.prepare('INSERT INTO site_settings (key, value_json) VALUES (?, ?)').run(
      'main',
      JSON.stringify(INITIAL_SITE_SETTINGS)
    );
  }
}

seedDatabaseIfNeeded();

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getAllCategories(includeDisabled: boolean): MainCategory[] {
  const catRows = db
    .prepare(
      includeDisabled
        ? 'SELECT * FROM categories ORDER BY display_order ASC, rowid ASC'
        : 'SELECT * FROM categories WHERE is_enabled = 1 ORDER BY display_order ASC, rowid ASC'
    )
    .all();

  const subRows = db
    .prepare(
      includeDisabled
        ? 'SELECT * FROM subcategories ORDER BY display_order ASC, rowid ASC'
        : 'SELECT * FROM subcategories WHERE is_enabled = 1 ORDER BY display_order ASC, rowid ASC'
    )
    .all();

  const subsByCat = new Map<string, Subcategory[]>();
  for (const row of subRows) {
    const catId = String(row.category_id);
    const list = subsByCat.get(catId) ?? [];
    list.push({
      id: String(row.id),
      categoryId: catId,
      title: String(row.title),
      description: String(row.description),
      image: String(row.image),
      buyingTip: String(row.buying_tip),
      displayOrder: Number(row.display_order),
      isEnabled: Number(row.is_enabled) === 1,
    });
    subsByCat.set(catId, list);
  }

  return catRows.map((row) => {
    const id = String(row.id);
    return {
      id,
      title: String(row.title),
      englishTitle: String(row.english_title),
      description: String(row.description),
      image: String(row.image),
      displayOrder: Number(row.display_order),
      isEnabled: Number(row.is_enabled) === 1,
      subcategories: subsByCat.get(id) ?? [],
    };
  });
}

export function getAllProducts(includeDisabled: boolean): Product[] {
  const rows = db
    .prepare(
      includeDisabled
        ? 'SELECT * FROM products ORDER BY display_order ASC, rowid DESC'
        : 'SELECT * FROM products WHERE is_enabled = 1 ORDER BY display_order ASC, rowid DESC'
    )
    .all();

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.category_id),
    subcategoryId: String(row.subcategory_id),
    name: String(row.name),
    brand: String(row.brand),
    model: String(row.model),
    asin: String(row.asin),
    affiliateUrl: String(row.affiliate_url),
    image: String(row.image),
    galleryImages: safeJsonParse<string[]>(row.gallery_images_json, [String(row.image)]),
    description: String(row.description),
    editorialNote: String(row.editorial_note),
    specs: safeJsonParse(row.specs_json, []),
    advantages: safeJsonParse(row.advantages_json, []),
    disadvantages: safeJsonParse(row.disadvantages_json, []),
    verifiedPriceEgp: Number(row.verified_price_egp),
    originalPriceEgp: row.original_price_egp != null ? Number(row.original_price_egp) : undefined,
    priceVerifiedDate: String(row.price_verified_date),
    availability: String(row.availability) as Product['availability'],
    availabilityText: String(row.availability_text),
    usageLevels: safeJsonParse(row.usage_levels_json, ['beginner', 'intermediate']),
    priorities: safeJsonParse(row.priorities_json, ['value']),
    badges: safeJsonParse(row.badges_json, []),
    displayOrder: Number(row.display_order),
    isEnabled: Number(row.is_enabled) === 1,
  }));
}

export function getAllArticles(includeUnpublished: boolean): Article[] {
  const rows = db
    .prepare(
      includeUnpublished
        ? 'SELECT * FROM articles ORDER BY created_at DESC'
        : 'SELECT * FROM articles WHERE is_published = 1 ORDER BY created_at DESC'
    )
    .all();

  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    summary: String(row.summary),
    content: String(row.content),
    coverImage: String(row.cover_image),
    categoryId: String(row.category_id),
    isPublished: Number(row.is_published) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export function getSiteSettings(): SiteSettings {
  const row = db.prepare('SELECT value_json FROM site_settings WHERE key = ?').get('main');
  return {
    ...INITIAL_SITE_SETTINGS,
    ...safeJsonParse<Partial<SiteSettings>>(row?.value_json, {}),
  };
}

export function saveSiteSettings(settings: SiteSettings): SiteSettings {
  db.prepare(
    'INSERT INTO site_settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json'
  ).run('main', JSON.stringify(settings));
  return settings;
}
