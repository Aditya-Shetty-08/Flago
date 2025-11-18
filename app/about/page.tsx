"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// --- 1. Mock lucide-react icons for preview ---
const mockIcon = (path: string) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-full h-full"
  >
    {path}
  </svg>
);
const UserIcon = mockIcon('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>');

// --- UPDATED ICONS for your new flow ---
const icons = {
  form: mockIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>'),
  ai: mockIcon('<path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M2 14h2"/><path d="M2 10h2"/><path d="M20 14h2"/><path d="M20 10h2"/><path d="M14 2v2"/><path d="M10 2v2"/>'),
  swipe: mockIcon('<path d="M4 14l5-5 5 5M4 20l5-5 5 5"/>'),
  trophy: mockIcon('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-1.02 1.26a2.5 2.5 0 0 0-1.96 0A2.5 2.5 0 0 1 6 22H4c0-1.66 1.34-3 3-3h1"/><path d="M14 14.66V17c0 .55.47.98 1.02 1.26a2.5 2.5 0 0 1 1.96 0A2.5 2.5 0 0 0 18 22h2c0-1.66-1.34-3-3-3h-1"/><path d="M9.66 14.66c.96.6 2.04 1 3.34 1s2.38-.4 3.34-1"/><path d="M12 12v-2c0-.55.45-1 1-1h.5a2.5 2.5 0 0 0 0-5H11c-.55 0-1 .45-1 1v2"/>'),
};

// --- 3. AppFlowTimeline COMPONENT ---
const timelineSteps = [
  { icon: icons.form, title: "1. Fill Your Form", description: "Start by telling us what you're in the mood for—genres, actors, or just a vibe.", align: "left" },
  { icon: icons.ai, title: "2. AI Creates Your List", description: "Our system analyzes your preferences and generates a custom list of movies, each with a unique 'expected score'.", align: "right" },
  { icon: icons.swipe, title: "3. Start Swiping", description: "The 'Tinder game' begins. Swipe right on movies you like and left on movies you don't.", align: "left" },
  { icon: icons.trophy, title: "4. Get Your Top 3", description: "Our ELO algorithm ranks your liked movies. See your Top 3 matches and start binge-watching!", align: "right" },
];

const TimelineItem = ({ step, isLast }: { step: (typeof timelineSteps)[0], isLast: boolean }) => {
  const isLeft = step.align === 'left';
  return (
    <div className={`relative flex ${isLeft ? 'justify-start' : 'justify-end'} w-full`}>
      {/* Updated to match home page color scheme */}
      {!isLast && (
        <div className={`absolute top-10 ${isLeft ? 'left-1/2 -ml-0.5' : 'right-1/2 -mr-0.5'} w-1 h-full bg-sky-400`}></div>
      )}
      <div className={`w-1/2 ${isLeft ? 'pr-8' : 'pl-8'}`}>
        <div className="relative">
          {/* Updated to match home page color scheme */}
          <div className={`absolute top-0 ${isLeft ? 'right-0 -mr-7' : 'left-0 -ml-7'} z-10 w-14 h-14 bg-gradient-to-br from-sky-400 to-purple-400 rounded-full flex items-center justify-center text-white shadow-lg`}>
            {step.icon}
          </div>
          {/* Updated to match home page styling */}
          <div className={`bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20 ${isLeft ? 'text-left' : 'text-right'}`}>
            <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
            <p className="text-white/90">{step.description}</p>
          </div>
        </div>
      </div>
      <div className="w-1/2"></div>
    </div>
  );
};

function AppFlowTimeline() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Updated to match home page headline styling */}
        <h1 className="text-5xl lg:text-6xl font-bold text-center mb-16">
          <span className="text-white">How Flago</span>
          <span className="text-white"> Works</span>
        </h1>
        <div className="relative flex flex-col gap-16">
          {/* Updated to match home page color scheme */}
          <div className="absolute left-1/2 -ml-0.5 w-1 h-full bg-sky-400 hidden md:block"></div>
          {timelineSteps.map((step, index) => (
            <div key={step.title} className="relative md:flex md:w-full">
              <div className="hidden md:flex w-full">
                {step.align === 'left' ? (
                  <>
                    <TimelineItem step={step} isLast={index === timelineSteps.length - 1} />
                    <div className="w-1/2"></div>
                  </>
                ) : (
                  <>
                    <div className="w-1/2"></div>
                    <TimelineItem step={step} isLast={index === timelineSteps.length - 1} />
                  </>
                )}
              </div>
              <div className="md:hidden w-full">
                <TimelineItem step={{...step, align: 'left'}} isLast={index === timelineSteps.length - 1} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 4. Team Member Card Component (Original Grid) ---
const TeamCard = ({ name, role, href, image }: { name: string, role: string, href?: string, image?: string }) => {
  const cardContent = (
    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20 flex flex-col items-center text-center hover:shadow-2xl transition-shadow">
      <div className="w-24 h-24 rounded-full overflow-hidden mb-4 flex items-center justify-center bg-gradient-to-br from-sky-400 to-purple-400">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 text-white">
            {UserIcon}
          </div>
        )}
      </div>
      <h3 className="text-xl font-bold text-white">{name}</h3>
      <p className="text-sky-300 font-medium">{role}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

// --- 5. Main About Page Component ---
// Updated to match home page styling and fonts
export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Main Content Area - matching home page container */}
      <div className="container mx-auto px-6 py-16">
        
        {/* --- Our Mission Section --- */}
        <section className="text-center my-16">
          {/* Updated to match home page headline styling */}
          <div className="space-y-2 mb-6">
            <h1 className="text-5xl lg:text-6xl font-bold">
              <span className="text-white">About</span>
              <span className="text-white"> Flago</span>
            </h1>
          </div>
          {/* Updated to match home page description styling */}
          <p className="text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
            Flago was born from one simple question: "What should we watch tonight?". 
            We're a team of students passionate about using AI to solve everyday problems, 
            and ending the nightly movie debate is our first mission.
          </p>
        </section>

        {/* --- How It Works Section (Using your Timeline) --- */}
        <section className="my-24">
          <div>
             <AppFlowTimeline />
          </div>
        </section>
        
        {/* --- Meet the Team Section --- */}
        <section className="my-24">
          {/* Updated to match home page headline styling */}
          <div className="space-y-2 mb-12 text-center">
            <h2 className="text-5xl lg:text-6xl font-bold">
              <span className="text-white">Meet the</span>
              <span className="text-white"> Team</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TeamCard name="Aditya Shetty" role="Frontend & ELO Logic" href="https://www.linkedin.com/in/adityashetty06/" image="/aditya.jpg" />
            <TeamCard name="Ashita Binte Amir" role="UI/UX Design" href="https://www.linkedin.com/in/ashita-binte-amir-900695293/" image="/ashita.jpg" />
            <TeamCard name="Sathya Sriram" role="AI & Backend" href="https://www.linkedin.com/in/sathya-sriram/" image="/sathya.jpg" />
            <TeamCard name="Ojas Srivastava" role="Support Role" href="https://www.linkedin.com/in/0jas0jas/" image="/ojas.jpg" />
          </div>
        </section>

      </div>
    </div>
  );
}
