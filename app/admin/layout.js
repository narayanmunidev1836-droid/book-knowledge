import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import Nav from "@/components/Nav";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/sants", label: "Sants" },
  { href: "/admin/report", label: "Activity Report" },
  { href: "/admin/activity", label: "Activity Log" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/sant");
  const settings = await getSettings();

  return (
    <>
      <Nav links={links} user={session.user} brandName={settings.siteName} />
      <div className="flex-1 lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </div>
    </>
  );
}
