import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// A fixed bcrypt hash with no known matching password. Used to make the
// "unknown email" path run bcrypt.compare too, so it takes comparable time
// to the "wrong password" path and doesn't leak which emails are registered.
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8gVKPvJhbCWkYFRz2xJI.Y8YZ2Vf9K";

export async function verifyCredentials({
  email,
  password,
}: {
  email: string | undefined;
  password: string | undefined;
}) {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.hashedPassword ?? DUMMY_HASH);

  if (!user || !valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
