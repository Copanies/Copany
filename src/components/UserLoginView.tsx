import { auth, signOut, signIn } from "@/app/auth";
import { updateRecord } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Image from "next/image";
import { redirect } from "next/navigation";

async function updateName(formData: FormData): Promise<void> {
  "use server";
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }
  const name = formData.get("name") as string;
  if (!name) {
    return;
  }
  const query = `UPDATE users SET name = $1 WHERE id = $2`;
  await updateRecord(
    (
      await getCloudflareContext({ async: true })
    ).env.DB,
    query,
    [name, session.user.id]
  );
  redirect("/");
}

export default async function UserLoginView() {
  const session = await auth();
  return (
    <div>
      {session ? (
        <div>
          <div>
            <div>
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User Avatar"}
                  className="w-32 h-32 border-1 border-gray-300 dark:border-gray-700"
                  width={100}
                  height={100}
                />
              ) : (
                <span className="rounded-md p-2 bg-gray-200 border-1 border-gray-300">
                  {session.user?.name?.[0] || "U"}
                </span>
              )}
            </div>
            <div>
              <p>{session.user?.name || "No name set"}</p>
              <p>{session.user?.email}</p>
            </div>
          </div>

          <div>
            <p>User ID: {session.user?.id}</p>
          </div>

          <form action={updateName} className="flex gap-2">
            <div>
              <input
                id="name"
                name="name"
                placeholder="Enter new name"
                className="rounded-md border-1 border-gray-300 px-2"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 px-2"
            >
              Update Name
            </button>
          </form>
        </div>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn();
          }}
        >
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 px-2"
          >
            Sign in with Github
          </button>
        </form>
      )}

      {session && (
        <div>
          <form
            action={async () => {
              "use server";
              await signOut();
              redirect("/");
            }}
          >
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border-1 border-gray-300 mt-2 px-2"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
