'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Loader2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

interface SongComboboxProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (track: Track) => void;
  placeholder?: string;
}

export function SongCombobox({ value = '', onChange, onSelect, placeholder = 'Search for songs...' }: SongComboboxProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync searchQuery with value prop when it changes externally
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Debounce search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/spotify?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.tracks || []);
          setIsOpen(true);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Error searching songs:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (track: Track) => {
    const displayValue = `${track.name} - ${track.artist}`;
    setIsOpen(false);
    onChange?.(displayValue);
    onSelect?.(track);
    setSelectedIndex(-1);
    // Clear the search query after selection to allow adding more songs
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        onChange?.(searchQuery);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onChange?.(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && (results.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-1">
              {results.map((track, index) => (
                <Button
                  key={track.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-left font-normal h-auto py-2 px-3',
                    index === selectedIndex && 'bg-accent'
                  )}
                  onClick={() => handleSelect(track)}
                >
                  <Music className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate font-medium">{track.name}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {track.artist} • {track.album}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

