import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { googleAuthWithApi, loginWithApi } from "@/lib/api";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const data = await loginWithApi(credentials.email, credentials.password);
        return {
          id: credentials.email,
          email: credentials.email,
          apiToken: data.access_token,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email && account.providerAccountId) {
        const data = await googleAuthWithApi(user.email, account.providerAccountId);
        user.apiToken = data.access_token;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.apiToken) {
        token.apiToken = user.apiToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.apiToken) {
        session.apiToken = token.apiToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
