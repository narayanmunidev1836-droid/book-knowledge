"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  Loading3QuartersOutlined,
  BookOutlined,
  PictureOutlined,
  SearchOutlined,
} from "@ant-design/icons";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("Incorrect credentials, or the account is disabled");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1">
      <div className="grid w-full lg:grid-cols-2">
        {/* Hero */}
        <section className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-10 text-white lg:flex lg:px-16 lg:py-16">
          <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -right-16 -bottom-24 h-80 w-80 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-1/3 right-10 hidden h-40 w-40 rotate-12 rounded-3xl bg-white/5 lg:block" />

          <div className="relative fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50 ring-1 ring-white/20">
              <BookOutlined /> Digital Library
            </span>
            <h1 className="mt-4 text-4xl font-bold lg:text-5xl">
              Book <span className="text-emerald-200">Knowledge</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-50/90 lg:text-base">
              A shared home for sant vachans — manage books, topics and pages,
              upload images, and search the collection from anywhere.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                { icon: BookOutlined, text: "Books & topics organized in one place" },
                { icon: PictureOutlined, text: "Gallery of uploaded vachan images" },
                { icon: SearchOutlined, text: "Instant topic-wise search" },
              ].map((item) => (
                <li
                  key={item.text}
                  className="flex items-center gap-3 text-emerald-50/95 fade-up"
                  style={{ animationDelay: "0.12s" }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                    <item.icon />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Login card */}
        <section className="flex items-center justify-center bg-slate-50 px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center fade-up">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl text-white shadow-xl shadow-emerald-500/40">
                <BookOutlined />
              </div>
              <h1 className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-3xl font-bold text-transparent">
                Book Knowledge
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Login for Sants and Admins
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="card fade-up space-y-4 p-6 !shadow-lg"
              style={{ animationDelay: "0.08s" }}
            >
              <div>
                <label htmlFor="identifier" className="label">
                  Email / Mobile Number
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                    <UserOutlined />
                  </span>
                  <input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="admin@book.com"
                    className="input !pl-9"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                    <LockOutlined />
                  </span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input !pl-9"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="btn-primary w-full !py-2.5"
              >
                {pending ? <Loading3QuartersOutlined spin /> : <LoginOutlined />}
                {pending ? "Signing in..." : "Log in"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
