import jwt from "jsonwebtoken";
import { getPrisma } from "../../src/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-lab3-key";

export async function cookieFor(
  email: string,
  overrides: Partial<{ userId: number; role: string; mustChangePassword: boolean }> = {}
): Promise<string> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user && !overrides.userId) {
    throw new Error(`User not found for email: ${email}`);
  }
  const payload = {
    userId: user?.id ?? overrides.userId,
    role: user?.role ?? overrides.role,
    mustChangePassword: user?.mustChangePassword ?? overrides.mustChangePassword ?? false,
    ...overrides,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
  return `auth_token=${token}`;
}

export async function tokenFor(
  email: string,
  overrides: Partial<{ userId: number; role: string; mustChangePassword: boolean }> = {}
): Promise<string> {
  const cookie = await cookieFor(email, overrides);
  return cookie.replace("auth_token=", "");
}

