import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials, { type CredentialsConfig } from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/modules/auth/authorize";

type CredentialFields = {
  email: Record<string, never>;
  password: Record<string, never>;
};

export const credentialsConfig = {
  credentials: { email: {}, password: {} },
  authorize(credentials: Partial<Record<keyof CredentialFields, unknown>>) {
    return authorizeCredentials(credentials);
  },
} satisfies Pick<CredentialsConfig<CredentialFields>, "credentials" | "authorize">;

export function addUserIdToToken(token: JWT, user?: { id?: unknown } | null) {
  if (typeof user?.id === "string" && user.id.length > 0) {
    token.userId = user.id;
  }
  return token;
}

export function addUserIdToSession(session: Session, token: JWT) {
  if (
    session.user
    && typeof token.userId === "string"
    && token.userId.length > 0
  ) {
    session.user.id = token.userId;
  }
  return session;
}

export const authCallbacks = {
  jwt({ token, user }: { token: JWT; user?: { id?: unknown } | null }) {
    return addUserIdToToken(token, user);
  },
  session({ session, token }: { session: Session; token: JWT }) {
    return addUserIdToSession(session, token);
  },
};

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [Credentials(credentialsConfig)],
  callbacks: authCallbacks,
} satisfies NextAuthConfig;
