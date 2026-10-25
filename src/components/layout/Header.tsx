"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-[#0B0C0E]/95 backdrop-blur-md font-poppins">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10">
        {/* Brand identity: hipermove.ai logo */}
        <Link href="/" className="group flex items-center gap-2.5 no-underline">
          <span className="flex h-2.5 w-2.5 bg-white transition-transform duration-300 group-hover:scale-125" />
          <span className="text-[18px] font-bold tracking-tight text-white">
            hipermove<span className="text-[#AEB4BD]">.ai</span>
          </span>
        </Link>

        {/* Clean, bold navigation: home, upload studio, webcam */}
        <nav className="hidden md:flex items-center gap-9 text-[15px] font-bold tracking-normal">
          <Link
            href="/"
            className={`transition-colors lowercase ${
              pathname === "/" ? "text-white underline underline-offset-8 decoration-white decoration-2" : "text-[#7E8590] hover:text-white"
            }`}
          >
            home
          </Link>
          <Link
            href="/upload"
            className={`transition-colors lowercase ${
              pathname === "/upload" ? "text-white underline underline-offset-8 decoration-white decoration-2" : "text-[#7E8590] hover:text-white"
            }`}
          >
            upload studio
          </Link>
          <Link
            href="/webcam"
            className={`transition-colors lowercase ${
              pathname === "/webcam" ? "text-white underline underline-offset-8 decoration-white decoration-2" : "text-[#7E8590] hover:text-white"
            }`}
          >
            webcam
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[#7E8590] hover:text-white p-1"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-hairline bg-[#0B0C0E] px-6 py-4 space-y-4 text-[16px] font-bold">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block lowercase ${pathname === "/" ? "text-white" : "text-[#7E8590] hover:text-white"}`}
          >
            home
          </Link>
          <Link
            href="/upload"
            onClick={() => setMobileMenuOpen(false)}
            className={`block lowercase ${pathname === "/upload" ? "text-white" : "text-[#7E8590] hover:text-white"}`}
          >
            upload studio
          </Link>
          <Link
            href="/webcam"
            onClick={() => setMobileMenuOpen(false)}
            className={`block lowercase ${pathname === "/webcam" ? "text-white" : "text-[#7E8590] hover:text-white"}`}
          >
            webcam
          </Link>
        </div>
      )}
    </header>
  );
}
