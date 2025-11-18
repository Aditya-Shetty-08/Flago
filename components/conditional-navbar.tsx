"use client";

import { usePathname } from 'next/navigation';
import FlagoNavbar from "@/components/flago-navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Only show navbar on home page (exact match with "/")
  // Hide it on all other pages including party routes
  if (pathname === '/home' || pathname === '/about' || pathname === '/contact_us' || pathname === '/') {
    return <FlagoNavbar />;
  }
  
  return null;
}

