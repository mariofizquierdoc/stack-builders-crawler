import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const usageSchema = z.object({
  filter: z.enum(["all", "long", "short"]),
  sortKey: z.enum(["score", "comments"]).nullable(),
  sortDir: z.enum(["asc", "desc"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = usageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { filter, sortKey, sortDir } = parsed.data;
    await prisma.usageEvent.create({
      data: { userId: session.user.id, filter, sortKey, sortDir },
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
