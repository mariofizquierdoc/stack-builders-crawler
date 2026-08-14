import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/login", "/register"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith("/api/auth") ||
        pathname === "/api/register";

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
