import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Nav from "@/components/Nav";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/sants", label: "Sants" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/topics", label: "Topics" },
  { href: "/admin/images", label: "Images" },
];

export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/sant");

  return (
    <>
      <Nav links={links} user={session.user} />
      <div className="flex-1 lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </div>
    </>
  );
}
