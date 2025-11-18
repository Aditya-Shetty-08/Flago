"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInput } from '@/components/tagInput';
import { SongCombobox } from '@/components/song-combobox';
import { X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

const DEFAULT_GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Fantasy', 'Adventure', 'Animation'];
const LANGUAGES = ['English', 'Bengali', 'Chinese', 'French', 'Hindi', 'Japanese', 'Korean', 'Spanish'];

const formSchema = z.object({
  genres: z.array(z.string()).optional(),
  songs: z.array(z.string()).optional(),
  ageRating: z.string().optional(),
  language: z.array(z.string()).optional(),
  era: z.string().optional(),
});

interface PreferenceFormProps {
  partySlug: string;
  hasSubmitted: boolean;
  onSubmitted: () => void;
}

export function PreferenceForm({ partySlug, hasSubmitted, onSubmitted }: PreferenceFormProps) {
  const [allInputs, setAllInputs] = useState<string[]>([]);
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [songTags, setSongTags] = useState<string[]>([]); // Display values for UI
  const [songTracks, setSongTracks] = useState<Map<string, string>>(new Map()); // Map displayValue -> spotifyUrl
  const [languageTags, setLanguageTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError(null); 
    try {
      // Get user ID
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();

      // Build preferences object
      const preferences: Record<string, string[]> = {};
      
      if (genreTags.length > 0) {
        preferences.preferredGenres = genreTags;
      }
      
      if (languageTags.length > 0) {
        preferences.preferredLanguages = languageTags;
      }
      
      const ageRating = form.getValues("ageRating");
      if (ageRating) {
        preferences.preferredAgeRating = [ageRating];
      }
      
      const era = form.getValues("era");
      if (era) {
        preferences.preferredEra = [era];
      }
      
      // Extract Spotify URLs from selected songs
      const spotifyUrls: string[] = [];
      songTags.forEach(displayValue => {
        const url = songTracks.get(displayValue);
        if (url) {
          spotifyUrls.push(url);
        }
      });

      const response = await fetch(`/api/party/${partySlug}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit-preferences',
          preferences: Object.keys(preferences).length > 0 ? preferences : {},
          spotifyUrls: spotifyUrls.length > 0 ? spotifyUrls : undefined,
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit preferences');
      }

      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit preferences');
    } finally {
      setLoading(false);
    }
  };

  // Prevent Enter key from submitting the form
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      
      // Only prevent if it's NOT the submit button
      // If it's the submit button, let it submit normally
      if (tagName !== 'BUTTON' || (target as HTMLButtonElement).type !== 'submit') {
        e.preventDefault();
      }
    }
  };

  const addToAllInputs = (value: string) => {
    if (value && !allInputs.includes(value)) {
      setAllInputs([...allInputs, value]);
    }
  };

  const removeFromAllInputs = (value: string) => {
    // Remove from allInputs
    setAllInputs(allInputs.filter((input) => input !== value));
    
    // If it's a genre, deselect it in genreTags
    if (genreTags.includes(value)) {
      setGenreTags(genreTags.filter(tag => tag !== value));
    }
    
    // If it's a language, deselect it in languageTags
    if (languageTags.includes(value)) {
      setLanguageTags(languageTags.filter(tag => tag !== value));
    }
    
    // If it's a song, remove it from songTags and songTracks
    if (songTags.includes(value)) {
      setSongTags(songTags.filter(tag => tag !== value));
      const newTracks = new Map(songTracks);
      newTracks.delete(value);
      setSongTracks(newTracks);
    }
    
    // If it's the current age rating, clear it
    const currentAgeRating = form.getValues("ageRating");
    if (currentAgeRating === value) {
      form.setValue("ageRating", "");
    }
    
    // If it's the current era, clear it
    const currentEra = form.getValues("era");
    if (currentEra === value) {
      form.setValue("era", "");
    }
  };

  const handleGenreTagsChange = (tags: string[]) => {
    // Remove old genre tags that are no longer in the list
    const removedTags = genreTags.filter(tag => !tags.includes(tag));
    removedTags.forEach(tag => removeFromAllInputs(tag));
    
    // Add new genre tags
    const newTags = tags.filter(tag => !genreTags.includes(tag));
    newTags.forEach(tag => addToAllInputs(tag));
    
    setGenreTags(tags);
    if (tags.length > 0) {
      form.clearErrors("genres");
    }
  };

  const handleSongSelect = (displayValue: string, spotifyUrl: string) => {
    // Add new song value if not empty and not already in the list
    if (displayValue && displayValue.trim() && !songTags.includes(displayValue.trim())) {
      const trimmedValue = displayValue.trim();
      setSongTags([...songTags, trimmedValue]);
      setSongTracks(new Map(songTracks).set(trimmedValue, spotifyUrl));
      addToAllInputs(trimmedValue);
    }
  };

  const handleLanguageTagsChange = (tags: string[]) => {
    // Remove old language tags that are no longer in the list
    const removedTags = languageTags.filter(tag => !tags.includes(tag));
    removedTags.forEach(tag => removeFromAllInputs(tag));
    
    // Add new language tags
    const newTags = tags.filter(tag => !languageTags.includes(tag));
    newTags.forEach(tag => addToAllInputs(tag));
    
    setLanguageTags(tags);
  };

  const handleSelectChange = (value: string, fieldName: "ageRating" | "era") => {
    // Remove old value if it exists in allInputs
    const oldValue = form.getValues(fieldName);
    if (oldValue && allInputs.includes(oldValue)) {
      removeFromAllInputs(oldValue);
    }
    // Add new value
    if (value && !allInputs.includes(value)) {
      addToAllInputs(value);
    }
  };

  if (hasSubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferences Submitted ✓</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Waiting for other members to submit their preferences...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Box containing all user inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Your Selections. You don't need to have a mood, you can always just skip this.</CardTitle>
        </CardHeader>
        <CardContent>
          {allInputs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allInputs.map((input) => (
                <div key={input} className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded-md">
                  {input}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-primary-foreground/20"
                    onClick={() => removeFromAllInputs(input)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No selections yet. Start filling out the form below!</p>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(handleSubmit)} 
          onKeyDown={handleKeyDown}
          className="space-y-8"
        >
          <FormField
            control={form.control}
            name="genres"
            render={() => (
              <FormItem>
                <FormLabel>Sooo... what are we feeling tonight, moviewise?</FormLabel>
                <div className="w-full max-w-xl">
                  <FormControl>
                    <TagInput 
                      tags={genreTags} 
                      onTagsChange={handleGenreTagsChange}
                      options={DEFAULT_GENRES}
                      placeholder="Add custom genre..."
                      allowCustom={true}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="songs"
            render={() => (
              <FormItem>
                <FormLabel>What songs fit the vibe tonight?</FormLabel>
                <div className="w-full max-w-xl">
                  <FormControl>
                    <SongCombobox
                      value=""
                      onChange={() => {
                        console.log();
                      }}
                      onSelect={(track) => {
                        // Add song to the list when user selects a track from results
                        const displayValue = `${track.name} - ${track.artist}`;
                        const spotifyUrl = track.external_urls.spotify;
                        handleSongSelect(displayValue, spotifyUrl);
                      }}
                      placeholder="Search for songs on Spotify..."
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ageRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose your preferred age rating</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleSelectChange(value, "ageRating");
                  }} 
                  defaultValue={field.value}
                >
                  <div className="w-full max-w-xl">
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose your preferred age rating" />
                      </SelectTrigger>
                    </FormControl>
                  </div>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Age Ratings</SelectLabel>
                      <SelectItem value="G">G</SelectItem>
                      <SelectItem value="PG">PG</SelectItem>
                      <SelectItem value="PG-13">PG-13</SelectItem>
                      <SelectItem value="R">R</SelectItem>
                      <SelectItem value="NC-17">NC-17</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="language"
            render={() => (
              <FormItem>
                <FormLabel>Preferred languages</FormLabel>
                <div className="w-full max-w-xl">
                  <FormControl>
                    <TagInput 
                      tags={languageTags} 
                      onTagsChange={handleLanguageTagsChange}
                      options={LANGUAGES}
                      placeholder="Add custom language..."
                      allowCustom={true}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="era"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What era are you in the mood for?</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleSelectChange(value, "era");
                  }} 
                  defaultValue={field.value}
                >
                  <div className="w-full max-w-xl">
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an era" />
                      </SelectTrigger>
                    </FormControl>
                  </div>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Era</SelectLabel>
                      <SelectItem value="1920s">1920s</SelectItem>
                      <SelectItem value="1930s">1930s</SelectItem>
                      <SelectItem value="1940s">1940s</SelectItem>
                      <SelectItem value="1950s">1950s</SelectItem>
                      <SelectItem value="1960s">1960s</SelectItem>
                      <SelectItem value="1970s">1970s</SelectItem>
                      <SelectItem value="1980s">1980s</SelectItem>
                      <SelectItem value="1990s">1990s</SelectItem>
                      <SelectItem value="2000s">2000s</SelectItem>
                      <SelectItem value="2010s">2010s</SelectItem>
                      <SelectItem value="2020s">2020s</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <Button type="submit" disabled={loading} className="w-full max-w-xl">
            {loading ? (
              <>
                <Spinner size="sm" />
                Submitting...
              </>
            ) : (
              'Submit Preferences'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

