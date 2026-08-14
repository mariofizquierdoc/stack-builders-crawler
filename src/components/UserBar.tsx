import { auth, signOut } from "@/auth";

export default async function UserBar() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const localPart = session.user.email.split("@")[0];

  return (
    <div className="flex justify-end items-center gap-3 px-4 py-2 text-sm text-gray-600">
      <span>Hi {localPart}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="text-orange-600 hover:underline cursor-pointer">
          Log out
        </button>
      </form>
    </div>
  );
}
