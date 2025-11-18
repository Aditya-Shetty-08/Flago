'use client';

import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface TagInputProps {
    tags?: string[];
    onTagsChange?: (tags: string[]) => void;
    options?: string[];
    placeholder?: string;
    allowCustom?: boolean;
}

export function TagInput({ 
    tags = [], 
    onTagsChange, 
    options = [],
    placeholder = 'Add custom...',
    allowCustom = true
}: TagInputProps) {
    const [input, setInput] = useState('');

    const handleOptionClick = (option: string) => {
        if (!tags.includes(option) && onTagsChange) {
            onTagsChange([...tags, option]);
        } else if (tags.includes(option) && onTagsChange) {
            // Allow deselection by clicking again
            onTagsChange(tags.filter(t => t !== option));
        }
    };

    const handleAddTag = (tag: string) => {
        if (tag.trim() && !tags.includes(tag.trim()) && onTagsChange) {
            onTagsChange([...tags, tag.trim()]);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            {options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const isSelected = tags.includes(option);
                        return (
                            <Button
                                key={option}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleOptionClick(option)}
                            >
                                {option}
                            </Button>
                        );
                    })}
                </div>
            )}
            {allowCustom && (
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && input.trim()) {
                            handleAddTag(input.trim());
                        }
                    }}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
}