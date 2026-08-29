import { verifyPassword } from "./password";
import { loginSchema } from "./schema";

type CredentialUser = {
  id: string;
  email: string;
  passwordHash: string;
};

type AuthorizeDependencies = {
  findUserByEmail: (email: string) => Promise<CredentialUser | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
};

const DUMMY_PASSWORD_HASH = "$2b$12$tSKGFguryHDYiYu6vLPOOOL2WHmsfEqFVHUDkiWahaA3xK8ctGXdm";

const defaultDependencies: AuthorizeDependencies = {
  async findUserByEmail(email) {
    const { prisma } = await import("@/lib/prisma");
    return prisma.user.findUnique({ where: { email } });
  },
  verifyPassword,
};

export async function authorizeCredentials(
  credentials: unknown,
  dependencies: AuthorizeDependencies = defaultDependencies,
) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await dependencies.findUserByEmail(parsed.data.email);
  const passwordMatches = await dependencies.verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) return null;
  return { id: user.id, email: user.email };
}
