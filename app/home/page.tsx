"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Lottie from 'lottie-react';

/**
 * A modern, bright homepage component styled like the reference image.
 * Features white background, bright colors, and a two-column layout.
 */
export default function HomePage() {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    fetch('/movie-animation.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Error loading animation:', err));
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Section - Text and CTA */}
          <div className="flex flex-col space-y-6 items-center text-center">
            {/* Two-line Headline */}
            <div className="space-y-2">
              <h1 className="text-5xl lg:text-6xl font-bold">
                <span className="text-white">Flago your</span>
                <br />
                <span className="text-white">movies</span>
              </h1>
            </div>

            {/* Description Paragraph */}
            <p className="text-lg text-white/90 max-w-lg leading-relaxed">
            Pick the perfect movie in seconds.
            <br />
            Set your preferences with your friends and let our AI handle the rest.
            <br />
            Use Create a Party to get started.
            </p>

            {/* Call-to-Action Button */}
            <div className="pt-4">
              <Link
                href="/party/create"
                className="
                  inline-flex items-center gap-2
                  px-8 py-4 text-lg font-semibold
                  bg-sky-400 hover:bg-sky-500
                  text-white rounded-lg
                  shadow-lg shadow-sky-400/30
                  transition-all transform hover:scale-105
                  focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2
                  cursor-pointer
                "
              >
                Create a Party
                <svg 
                  className="w-5 h-5" 
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

          {/* Right Section - Visual Element */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-lg h-96">
              {animationData && (
                <Lottie 
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
