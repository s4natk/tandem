import { z } from "zod";

/**
 * Strictly typed environment configuration.
 *
 * The server refuses to boot if required variables are missing so that
 * misconfiguration is a build-time failure, not a runtime mystery.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be >= 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be >= 16 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SOCKET_IO_REDIS_ADAPTER: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("true"),

  // AWS (all optional - app stays functional without them)
  AWS_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default(""),
  S3_PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(
      "Invalid environment configuration:\n",
      parsed.error.flatten().fieldErrors,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = parseEnv();

/** Comma-separated origin list for CORS (supports multiple). */
export const corsOrigins: string[] = env.CORS_ORIGIN.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** True when AWS S3 credentials & bucket are configured. */
export const s3Enabled = Boolean(
  env.S3_BUCKET && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY,
);
