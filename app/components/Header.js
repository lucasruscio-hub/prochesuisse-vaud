"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

import Logo from "./Logo";

const NAV_ITEMS = [
  {
    href: "/recherche",
    label: "Explorer les solutions",
    key: "recherche",
  },
  {
    href: "/#how",
    homeHref: "#how",
    label: "Comment ça marche",
    key: "how",
  },
  {
    href: "/#services",
    homeHref: "#services",
    label: "Solutions",
    key: "services",
  },
  {
    href: "/guides",
    label: "Guides",
    key: "guides",
  },
  {
    href: "/contact",
    homeHref: "#contact",
    label: "Contact",
    key: "contact",
  },
];

export default function Header({ active = "", home = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ctaHref = home ? "#form" : "/#form";

  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link href="/" aria-label="Retour à l’accueil Lia">
          <Logo size={active === "guides" ? "compact" : "default"} />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex lg:text-base">
          {NAV_ITEMS.map((item) => {
            const href = home && item.homeHref ? item.homeHref : item.href;
            const isActive = active === item.key;

            return (
              <Link
                key={item.key}
                href={href}
                className={
                  isActive
                    ? "font-semibold text-[#E64B60] hover:text-[#FF5F72]"
                    : "transition hover:text-slate-950"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={ctaHref}
          className={`items-center gap-3 rounded-full bg-[#FF5F72] font-bold text-white shadow-xl shadow-rose-200 transition hover:bg-[#E64B60] ${
            home
              ? "inline-flex px-9 py-5 text-base"
              : "hidden px-7 py-3.5 text-sm md:inline-flex"
          }`}
        >
          Recevoir ma sélection
          <ArrowRight size={16} />
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#10213D] transition hover:bg-[#FFF0EF] md:hidden"
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-100 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm font-medium text-slate-700">
            {NAV_ITEMS.map((item) => {
              const href = home && item.homeHref ? item.homeHref : item.href;

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={active === item.key ? "font-semibold text-[#E64B60]" : ""}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}

            <Link
              href={ctaHref}
              className="rounded-xl bg-[#FF5F72] px-5 py-3 text-center font-semibold text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Recevoir ma sélection
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
