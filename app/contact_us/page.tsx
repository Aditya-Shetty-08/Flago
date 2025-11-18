"use client";

import React, { useState } from 'react';

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({ name: '', email: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen">
      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="space-y-2 mb-6">
            <h1 className="text-5xl lg:text-6xl font-bold">
              <span className="text-white">Get in</span>
              <span className="text-white"> Touch</span>
            </h1>
          </div>
          <p className="text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            Have a question or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Section - Contact Form */}
          <div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="
                      w-full
                      px-4 py-3
                      bg-white/5 border border-white/20 rounded-lg
                      text-white placeholder-white/50
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      transition-all duration-300
                    "
                    placeholder="Your name"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="
                      w-full
                      px-4 py-3
                      bg-white/5 border border-white/20 rounded-lg
                      text-white placeholder-white/50
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      transition-all duration-300
                    "
                    placeholder="you@example.com"
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="
                      w-full
                      px-4 py-3
                      bg-white/5 border border-white/20 rounded-lg
                      text-white placeholder-white/50
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      transition-all duration-300
                      resize-none
                    "
                    placeholder="How can we help?"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="
                    w-full
                    inline-flex items-center justify-center
                    px-6 py-3
                    bg-purple-600 hover:bg-purple-700
                    text-white font-medium rounded-lg
                    transition-all duration-300
                    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent
                    cursor-pointer
                  "
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>

          {/* Right Section - Contact Information Cards */}
          <div className="flex flex-col space-y-6">
            {/* Email Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-start space-x-4">
                <div className="
                  w-12 h-12
                  bg-blue-800
                  rounded-lg
                  flex items-center justify-center
                  flex-shrink-0
                ">
                  <svg 
                    className="w-6 h-6 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Email</h3>
                  <p className="text-white/80">support@flago.com</p>
                </div>
              </div>
            </div>

            {/* Live Chat Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-start space-x-4">
                <div className="
                  w-12 h-12
                  bg-blue-800
                  rounded-lg
                  flex items-center justify-center
                  flex-shrink-0
                ">
                  <svg 
                    className="w-6 h-6 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Live Chat</h3>
                  <p className="text-white/80">Available 9am - 5pm EST</p>
                </div>
              </div>
            </div>

            {/* Testimonial Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <div>
                <p className="text-white mb-3 italic">
                  "Flago has saved my relationship from endless movie scrolling."
                </p>
                <p className="text-white/80">- Happy User</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
