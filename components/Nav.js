"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  EllipsisOutlined,
  BookOutlined,
  LogoutOutlined,
  UserOutlined,
  AppstoreOutlined,
  TeamOutlined,
  TagsOutlined,
  FileAddOutlined,
  SearchOutlined,
  LockOutlined,
  BarChartOutlined,
  HistoryOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import ChangePasswordModal from "./ChangePasswordModal";

const ICONS = {
  "/admin": AppstoreOutlined,
  "/admin/sants": TeamOutlined,
  "/admin/report": BarChartOutlined,
  "/admin/activity": HistoryOutlined,
  "/admin/settings": SettingOutlined,
  "/sant": AppstoreOutlined,
  "/sant/entry": FileAddOutlined,
  "/sant/books": BookOutlined,
  "/sant/topics": TagsOutlined,
  "/sant/search": SearchOutlined,
};

function isActivePath(pathname, href) {
  if (!pathname || !href) return false;
  if (pathname === href) return true;
  if (href === "/admin" || href === "/sant") return false;
  return pathname.startsWith(`${href}/`);
}

function Brand({ compact = false, name = "Book Knowledge" }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold whitespace-nowrap">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
        <BookOutlined />
      </span>
      {!compact && (
        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {name}
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

function UserBlock({ user, onChangePassword }) {
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
        onClick={onChangePassword}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800"
      >
        <LockOutlined /> Change password
      </button>
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

const TAB_WIDTH = 76; // min px per tab, incl. the More tab
const DEFAULT_TABS = 4;

function BottomBar({ links, pathname, user, onChangePassword }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [maxTabs, setMaxTabs] = useState(DEFAULT_TABS);
  const ref = useRef(null);
  const navRef = useRef(null);

  // Show as many tabs as fit in the bar (one slot is reserved for More);
  // the rest go into the More menu.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () =>
      setMaxTabs(Math.max(1, Math.floor(el.clientWidth / TAB_WIDTH) - 1));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tabs = links.slice(0, maxTabs);
  const extra = links.slice(maxTabs);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (moreOpen) setMoreOpen(false);
  }

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [moreOpen]);

  const moreActive = extra.some((l) => isActivePath(pathname, l.href));
  const tabClass = (active) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
      active ? "text-emerald-600" : "text-slate-500"
    }`;
  const pill = (active) =>
    `flex h-7 w-12 items-center justify-center rounded-full text-lg transition ${
      active ? "bg-emerald-100" : ""
    }`;

  return (
    <div ref={ref} className="lg:hidden">
      {moreOpen && (
        <div className="fixed bottom-[72px] right-3 z-50 w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10">
          {user?.name && (
            <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700">
              <UserOutlined className="text-lg text-slate-500" />
              <span className="truncate">{user.name}</span>
            </div>
          )}
          {extra.map((link) => {
            const active = isActivePath(pathname, link.href);
            const Icon = ICONS[link.href];
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-emerald-50 text-emerald-700" : "text-slate-700"
                }`}
              >
                {Icon && <Icon className="text-lg text-emerald-600" />}
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              onChangePassword();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700"
          >
            <LockOutlined className="text-lg text-slate-500" /> Change password
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600"
          >
            <LogoutOutlined className="text-lg" /> Log out
          </button>
        </div>
      )}

      <nav
        ref={navRef}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.15)] backdrop-blur-md"
      >
        {tabs.map((link) => {
          const active = isActivePath(pathname, link.href);
          const Icon = ICONS[link.href];
          return (
            <Link key={link.href} href={link.href} className={tabClass(active)}>
              <span className={pill(active)}>{Icon && <Icon />}</span>
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-label="More"
          aria-expanded={moreOpen}
          className={tabClass(moreOpen || moreActive)}
        >
          <span className={pill(moreOpen || moreActive)}>
            <EllipsisOutlined />
          </span>
          More
        </button>
      </nav>
    </div>
  );
}

export default function Nav({ links, user, brandName }) {
  const pathname = usePathname();
  const [pwdOpen, setPwdOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        <div className="flex items-center border-b border-slate-100 px-4 py-4">
          <Brand name={brandName} />
        </div>
        <SidebarLinks links={links} pathname={pathname} />
        <UserBlock user={user} onChangePassword={() => setPwdOpen(true)} />
      </aside>

      {/* Mobile / tablet topbar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur-md lg:hidden">
        <Brand name={brandName} />
        <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <UserOutlined />
        </span>
      </header>

      {/* Mobile / tablet bottom tab bar */}
      <BottomBar
        links={links}
        pathname={pathname}
        user={user}
        onChangePassword={() => setPwdOpen(true)}
      />

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </>
  );
}
