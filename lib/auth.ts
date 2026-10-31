import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyPassword } from "./auth-utils";
import { LoginSchema } from "./validations/game";

export const authOptions = {
  trustHost: true,
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const creds = credentials as Record<string, string>;
        const parsed = LoginSchema.safeParse({ email: creds.email, password: creds.password });
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.adminUser.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}