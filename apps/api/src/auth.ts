import { createHmac, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";
import { loginSchema, registerSchema } from "@juris/validation";
import type { UserSummary } from "@juris/types";

export const prisma = new PrismaClient();

const accessTokenLifetimeSeconds = 15 * 60;
const refreshTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export type AccessClaims = {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: "juris-prudentia-api";
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function authSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_JWT_SECRET must be configured in production");
  }
  return "local-development-secret-change-before-deployment";
}

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, saltValue, keyValue] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !keyValue) return false;
  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(keyValue, "base64url");
  const actual = scryptSync(password, salt, expected.length, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signAccessToken(user: { id: string; email: string; role: UserRole }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + accessTokenLifetimeSeconds,
    iss: "juris-prudentia-api",
  } satisfies AccessClaims));
  const unsigned = `${header}.${payload}`;
  const signature = base64Url(createHmac("sha256", authSecret()).update(unsigned).digest());
  return `${unsigned}.${signature}`;
}

export function verifyAccessToken(token: string): AccessClaims | null {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const unsigned = `${header}.${payload}`;
  const expected = createHmac("sha256", authSecret()).update(unsigned).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as AccessClaims;
    if (claims.iss !== "juris-prudentia-api" || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function toUserSummary(user: { id: string; fullName: string; email: string; role: UserRole; avatarUrl: string | null }): UserSummary {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };
}

async function issueSession(user: { id: string; email: string; role: UserRole }) {
  const refreshToken = createRefreshToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTokenLifetimeMs),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

export async function registerUser(input: unknown) {
  const parsed = registerSchema.parse(input);
  const user = await prisma.user.create({
    data: {
      fullName: parsed.fullName,
      email: parsed.email,
      passwordHash: hashPassword(parsed.password),
      role: UserRole.STUDENT,
    },
  });
  return { user: toUserSummary(user), ...(await issueSession(user)) };
}

export async function loginUser(input: unknown) {
  const parsed = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (!user || !user.isActive || !verifyPassword(parsed.password, user.passwordHash)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return { user: toUserSummary(user), ...(await issueSession(user)) };
}

export async function refreshSession(refreshToken: string) {
  const current = await prisma.session.findUnique({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) },
    include: { user: true },
  });
  if (!current || current.revokedAt || current.expiresAt <= new Date() || !current.user.isActive) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const nextRefreshToken = createRefreshToken();
  await prisma.$transaction([
    prisma.session.update({ where: { id: current.id }, data: { revokedAt: new Date() } }),
    prisma.session.create({
      data: {
        userId: current.userId,
        refreshTokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt: new Date(Date.now() + refreshTokenLifetimeMs),
      },
    }),
  ]);

  return {
    user: toUserSummary(current.user),
    accessToken: signAccessToken(current.user),
    refreshToken: nextRefreshToken,
  };
}

export async function revokeSession(refreshToken: string) {
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
