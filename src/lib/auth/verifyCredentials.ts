import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function verifyCredentials({
  email,
  password,
}: {
  email: string | undefined;
  password: string | undefined;
}) {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
