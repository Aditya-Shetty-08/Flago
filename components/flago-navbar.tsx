"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function FlagoNavbar() {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Home", link: "/home" },
    { name: "About", link: "/about" },
    { name: "Contact Us", link: "/contact_us" },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if a link is active
  const isActive = (link: string) => {
    return pathname === link;
  };

  return (
    <div className="relative w-full bg-transparent z-50">
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center justify-center py-4 px-6">
        {/* Gradient Border Wrapper */}
        <div 
          className="rounded-full p-[2px] w-full"
          style={{
            background: 'linear-gradient(to right, #60a5fa, #34d399)',
            maxWidth: '95%',
            minWidth: '1200px',
          }}
        >
          <div className="
            relative w-full
            flex items-center justify-between
            bg-white/10 backdrop-blur-md rounded-full
            border border-white/20
            px-12 py-4
          ">
          {/* Left Section - Logo */}
          <div className="flex items-center space-x-4">
            <Link href="/home" className="flex items-center space-x-3 group cursor-pointer">
              {/* Logo Image with hover animation */}
              <div className="relative w-15 h-15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Image
                  src="/flago-high-resolution-logo-grayscale-transparent.png"
                  alt="Flago Logo"
                  width={100}
                  height={100}
                  className="object-contain"
                  priority
                />
              </div>
              
              {/* Logo Text with hover effect */}
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white leading-tight transition-colors duration-300 group-hover:text-black">
                  Flago
                </span>
              </div>
            </Link>
            
            {/* Vertical Separator */}
            <div className="h-6 w-px bg-white/30"></div>
          </div>

          {/* Center Section - Navigation Links */}
          <div className="flex items-center space-x-10 absolute left-1/2 transform -translate-x-1/2">
            {navItems.map((item, idx) => {
              const active = isActive(item.link);
              return (
                <Link
                  key={`nav-link-${idx}`}
                  href={item.link}
               className="
                 group
                 relative
                 text-base font-medium text-white
                 whitespace-nowrap
                 px-4 py-2
                 transition-all duration-300 ease-out
                 hover:scale-110
                 hover:text-white
               "
                >
                  {/* Hover Background - Subtle rounded background */}
                  <div className="
                    absolute inset-0
                    bg-black/0
                    group-hover:bg-black/30
                    rounded-lg
                    scale-95 group-hover:scale-100
                    transition-all duration-300 ease-out
                    -z-10
                  "></div>
                  
                  {/* Active Indicator - Diamond Shape with Animation */}
                  {active && (
                    <div className="
                      absolute inset-0
                      bg-gradient-to-br from-sky-900/40 via-blue-900/40 to-sky-900/40
                      rounded-md
                      transform rotate-45
                      -z-10
                      animate-pulse
                    "></div>
                  )}
                  
                  {/* Text with smooth transition */}
                  <span className="relative z-10 transition-all duration-300 group-hover:font-semibold">
                    {item.name}
                  </span>
                  
                  {/* Underline effect on hover */}
                  <div className="
                    absolute bottom-0 left-0 right-0 h-0.5
                    bg-gradient-to-r from-sky-600 to-blue-600
                    transform scale-x-0 group-hover:scale-x-100
                    transition-transform duration-300 ease-out
                    -z-0
                  "></div>
                </Link>
              );
            })}
          </div>

          {/* Right Section - Get Started Button */}
          <div className="flex items-center">
            <Link
              href="/party/create"
              className="
                group
                relative
                inline-flex items-center gap-2
                px-6 py-2.5
                rounded-lg
                bg-black
                text-white
                text-sm font-medium
                overflow-hidden
                transition-all duration-300 ease-out
                hover:scale-105
                hover:shadow-lg hover:shadow-black/30
              "
            >
              {/* Animated background gradient on hover */}
              <div className="
                absolute inset-0
                bg-gradient-to-r from-sky-700 via-blue-700 to-sky-800
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
              "></div>
              
              {/* Shine effect */}
              <div className="
                absolute inset-0
                bg-gradient-to-r from-transparent via-white/20 to-transparent
                -translate-x-full group-hover:translate-x-full
                transition-transform duration-700 ease-in-out
              "></div>
              
              {/* Text and icon */}
              <span className="relative z-10">Create a Party</span>
              <svg 
                className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </Link>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden flex items-center justify-between px-4 py-4 bg-white/10 backdrop-blur-md border-b border-white/20">
        <Link href="/home" className="flex items-center space-x-3">
          {/* Mobile Logo */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <Image
              src="/flago-high-resolution-logo-grayscale-transparent.png"
              alt="Flago Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <span className="text-lg font-bold text-white">Flago</span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-white"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex flex-col space-y-3">
            {navItems.map((item, idx) => (
              <Link
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base text-white font-medium py-2"
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/form"
                className="
                  inline-flex items-center justify-center gap-2
                  w-full
                  px-5 py-2.5
                  rounded-lg
                  bg-black
                  text-white
                  text-sm font-medium
                "
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
