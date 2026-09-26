import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Nav from "@/components/Nav";

const links = [
  { href: "/sant", label: "Dashboard" },
  { href: "/sant/entry", label: "New Entry" },
  { href: "/sant/books", label: "Books" },
  { href: "/sant/search", label: "Topic Search" },
  { href: "/sant/gallery", label: "Gallery" },
];

export default async function SantLayout({ children }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "admin") redirect("/admin");

  return (
    <>
      <Nav links={links} user={session.user} />
      <div className="flex-1 lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </div>
    </>
  );
}
