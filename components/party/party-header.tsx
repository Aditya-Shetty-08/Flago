"use client";

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface PartyHeaderProps {
  party: {
    name: string | null;
    slug: string;
    status: string;
  };
}

export function PartyHeader({ party }: PartyHeaderProps) {
  const [copied, setCopied] = useState(false);
  const partyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/party/${party.slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(partyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="mb-16">
      <h1 className="text-6xl font-bold mb-5">
        {party.name || 'Movie Party'}
      </h1>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <code className="px-2 py-1 rounded text-sm break-all">{partyUrl}</code>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

