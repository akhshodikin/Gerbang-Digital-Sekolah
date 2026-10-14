import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "sdn-kandangan-tosari-secret-key-32chars-minimum-security-2026-production"
);

const COOKIE_NAME = "sdn_tosari_session";
const MAX_AGE = parseInt(process.env.SESSION_MAX_AGE_SECONDS || "86400", 10); // 24 hours

export interface SessionPayload {
  userId: string;
  username: string;
  fullName: string;
  schoolId: string;
  roles: string[]; // ['ADMIN', 'WALI_KELAS', 'WALI_MURID', 'GURU_PIKET']
  teacherId?: string | null;
  guardianId?: string | null;
  homeroomClassId?: string | null;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET_KEY);

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
