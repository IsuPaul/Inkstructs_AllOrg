"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return <div className="mobile-menu"><button type="button" aria-label="Toggle navigation" className="mobile-menu-button" onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button>{open && <div className="mobile-menu-panel"><Link href="/login" onClick={() => setOpen(false)}>Sign in to dashboard</Link><Link href="/forgot-password" onClick={() => setOpen(false)}>Reset password</Link></div>}</div>;
}
