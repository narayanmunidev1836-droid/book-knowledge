"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Drawer } from "antd";
import {
  MenuOutlined,
  CloseOutlined,
  BookOutlined,
  LogoutOutlined,
  UserOutlined,
  AppstoreOutlined,
  TeamOutlined,
  TagsOutlined,
  PictureOutlined,
  FileAddOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const ICONS = {
  "/admin": AppstoreOutlined,
  "/admin/sants": TeamOutlined,
  "/admin/books": BookOutlined,
  "/admin/topics": TagsOutlined,
  "/admin/images": PictureOutlined,
  "/sant": AppstoreOutlined,
  "/sant/entry": FileAddOutlined,
  "/sant/books": BookOutlined,
  "/sant/search": SearchOutlined,
  "/sant/gallery": PictureOutlined,
};

function isActivePath(pathname, href) {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/sant") return false;
  return pathname.startsWith(`${href}/`);
}

function Brand({ compact = false }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold whitespace-nowrap">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
        <BookOutlined />
      </span>
      {!compact && (
        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Book Knowledge
        </span>
      )}
    </Link>
  );
}

function SidebarLinks({ links, pathname, onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {links.map((link) => {
        const active = isActivePath(pathname, link.href);
        const Icon = ICONS[link.href];
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {Icon && (
              <Icon className={active ? "text-emerald-600" : "text-slate-400"} />
            )}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ user }) {
  return (
    <div className="border-t border-slate-100 p-3">
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <UserOutlined />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
          {user?.name}
        </span>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        <LogoutOutlined /> Log out
      </button>
    </div>
  );
}

export default function Nav({ links, user }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        <div className="flex items-center border-b border-slate-100 px-4 py-4">
          <Brand />
        </div>
        <SidebarLinks links={links} pathname={pathname} />
        <UserBlock user={user} />
      </aside>

      {/* Mobile / tablet topbar with hamburger */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <MenuOutlined className="text-lg" />
        </button>
        <Brand />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Log out"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
        >
          <LogoutOutlined />
        </button>
      </header>

      {/* Mobile / tablet drawer sidebar */}
      <Drawer
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        size={272}
        closeIcon={false}
        styles={{
          header: { display: "none" },
          body: {
            padding: 0,
            background: "#fff",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          >
            <CloseOutlined />
          </button>
        </div>
        <SidebarLinks
          links={links}
          pathname={pathname}
          onNavigate={() => setOpen(false)}
        />
        <UserBlock user={user} />
      </Drawer>
    </>
  );
}
