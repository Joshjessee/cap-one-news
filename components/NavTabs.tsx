"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOPICS } from "@/config/sources";

export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs">
      {Object.values(TOPICS).map((t) => {
        const href = `/${t.id}`;
        return (
          <Link key={t.id} href={href} className={`tab${pathname === href ? " active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
