import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// ── Load .env safely ──────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ── Schema ────────────────────────────────────────────────────────────────────
const EnvSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z
    .string()
    .default('5000')
    .transform((val) => {
      const parsed = Number(val);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
        throw new Error('PORT must be a valid integer (1–65535)');
      }
      return parsed;
    }),

  // ── Database ─────────────────────────────────────────────────────────────
  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required')
    .refine(
      (val) =>
        val.startsWith('mongodb://') ||
        val.startsWith('mongodb+srv://'),
      { message: 'Invalid MongoDB connection string' }
    ),

  MONGODB_DB_NAME: z.string().default('agentic-agile'),

  // ── Auth ─────────────────────────────────────────────────────────────────
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),

  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'Must be like 7d, 24h, 3600s')
    .default('7d'),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default('30d'),

  // ── AI / LLM (Groq) ──────────────────────────────────────────────────────
  GROQ_API_KEY: z
    .string()
    .min(1, 'GROQ_API_KEY is required')
    .refine((val) => val.startsWith('gsk_'), {
      message: 'GROQ_API_KEY must start with "gsk_"',
    }),

  GROQ_MODEL: z
    .string()
    .default('llama3-70b-8192'),

  GROQ_MAX_TOKENS: z
    .string()
    .default('4096')
    .transform((val) => {
      const parsed = Number(val);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('GROQ_MAX_TOKENS must be a positive integer');
      }
      return parsed;
    }),

  GROQ_TEMPERATURE: z
    .string()
    .default('0.2')
    .transform((val) => {
      const parsed = Number(val);
      if (isNaN(parsed) || parsed < 0 || parsed > 1) {
        throw new Error('GROQ_TEMPERATURE must be between 0 and 1');
      }
      return parsed;
    }),

  // ── CORS ─────────────────────────────────────────────────────────────────
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((val) =>
      val.split(',').map((o) => o.trim()).filter(Boolean)
    )
    .refine(
      (origins) =>
        origins.every((o) => {
          try {
            new URL(o);
            return true;
          } catch {
            return false;
          }
        }),
      { message: 'Invalid CORS_ORIGIN URLs' }
    ),

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform((val) => Number(val)),

  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default('100')
    .transform((val) => Number(val)),

  // ── Logging ──────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'debug'])
    .default('info'),
});

// ── Type ─────────────────────────────────────────────────────────────────────
export type Env = z.infer<typeof EnvSchema>;

// ── Parse ────────────────────────────────────────────────────────────────────
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nInvalid environment configuration:\n');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

// ── Production safety checks ─────────────────────────────────────────────────
if (parsed.data.NODE_ENV === 'production') {
  if (parsed.data.JWT_SECRET.includes('dev')) {
    throw new Error('Weak JWT_SECRET in production');
  }

  if (!parsed.data.MONGO_URI) {
    throw new Error('MONGO_URI required in production');
  }
}

// ── Export frozen config ─────────────────────────────────────────────────────
export const env: Readonly<Env> = Object.freeze(parsed.data);

// ── Flags ────────────────────────────────────────────────────────────────────
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';