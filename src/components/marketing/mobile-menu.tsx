"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return <div className="mobile-menu"><button type="button" aria-label="Toggle navigation" className="mobile-menu-button" onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button>{open && <div className="mobile-menu-panel"><Link href="/about" onClick={() => setOpen(false)}>About</Link><Link href="/services" onClick={() => setOpen(false)}>Services</Link><Link href="/courses" onClick={() => setOpen(false)}>Courses</Link><Link href="/contact" onClick={() => setOpen(false)}>Contact</Link><Link href="/login" onClick={() => setOpen(false)}>Sign in</Link><Link href="/apply" className="button" onClick={() => setOpen(false)}>Apply now</Link></div>}</div>;
}
