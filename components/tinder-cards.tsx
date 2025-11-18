"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MovieRating } from "@/lib/elo_rating/movie_rating";
import Image from "next/image";
import { Heart, X } from "lucide-react";

export interface CardData {
  id?: string; // Optional ID to track which card was swiped (for ELO system)
  number: number;
  category: string;
  question: string;
  imageUrl: string;
  production?: string;
  directors?: string[];
  description?: string;
  rating?: number | null;
}

interface CardStyles {
  zIndex: number;
  transform: string;
  opacity: number;
}

interface TinderCardsProps {
  cardsData: CardData[];
  onSwipe?: (cardId: string | undefined, direction: 'right' | 'left') => void;
  getRankings?: () => MovieRating[];
}

export function TinderCards({ cardsData, onSwipe, getRankings }: TinderCardsProps) {
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [showDonePopup, setShowDonePopup] = React.useState<boolean>(false);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [velocity, setVelocity] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [expanded, setExpanded] = React.useState<boolean>(false);
  const [isSwiping, setIsSwiping] = React.useState<boolean>(false); // Prevent double swipes
  
  // Track previous cardsData length to detect when cards are filtered out
  const prevCardsLengthRef = React.useRef<number>(cardsData.length);
  
  // Reset currentIndex to 0 when cards are filtered out (swiped)
  React.useEffect(() => {
    // If cards were removed (filtered), reset index to 0 to show the next card
    if (cardsData.length < prevCardsLengthRef.current && cardsData.length > 0) {
      setCurrentIndex(0);
    }
    prevCardsLengthRef.current = cardsData.length;
    
    // If no cards left, show done popup
    if (cardsData.length === 0) {
      setShowDonePopup(true);
    }
  }, [cardsData.length]);

  const tinderContainerRef = React.useRef<HTMLDivElement>(null);
  const cardsRef = React.useRef<(HTMLDivElement | null)[]>([]);
  const lastMoveTimeRef = React.useRef<number>(0);
  const lastMovePositionRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getCardStyles = React.useCallback(
    (index: number): CardStyles => {
      return {
        zIndex: 4 - index,
        transform: `scale(${1 - index * 0.05}) translateY(-${index * 30}px)`,
        opacity: 1 - index * 0.2,
      };
    },
    []
  );

  const updateCardStyles = React.useCallback(() => {
    const cardsLeftToShow = Math.min(4, cardsData.length - currentIndex);

    cardsRef.current.slice(0, cardsLeftToShow).forEach((card, index) => {
      if (!card) return;

      const styles = getCardStyles(index);
      card.style.zIndex = styles.zIndex.toString();
      card.style.transform = styles.transform;
      card.style.opacity = styles.opacity.toString();
    });
  }, [currentIndex, getCardStyles, cardsData.length]);

  const updateCards = React.useCallback(() => {
    // Don't increment index - the card will be filtered out and next card becomes index 0
    // Just reset drag state and expanded state
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setExpanded(false);
    
    // The useEffect will handle resetting currentIndex when cards are filtered
    // If no cards left, show done popup
    if (cardsData.length <= 1) {
      setShowDonePopup(true);
    }
  }, [cardsData.length]);

  const handleButtonClick = React.useCallback(
    (love: boolean) => () => {
      const topCard = cardsRef.current[0];
      if (!topCard || !tinderContainerRef.current || isSwiping) return;

      // Prevent double swipes
      setIsSwiping(true);

      // Get the current card being swiped
      const currentCard = cardsData[currentIndex];
      const swipeDirection = love ? 'right' : 'left';
      
      // Call onSwipe callback if provided (for ELO system)
      if (onSwipe && currentCard) {
        onSwipe(currentCard.id, swipeDirection);
      }

      const moveOutWidth = window.innerWidth * 1.5;
      topCard.classList.add("removed");
      topCard.style.transition = "transform 0.3s ease";
      topCard.style.transform = love
        ? `translate(${moveOutWidth}px, -100px) rotate(-30deg)`
        : `translate(-${moveOutWidth}px, -100px) rotate(30deg)`;

      setTimeout(() => {
        updateCards();
        setIsSwiping(false);
      }, 300);
    },
    [updateCards, currentIndex, cardsData, onSwipe, isSwiping]
  );

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setIsDragging(true);
      setDragOffset({ x: 0, y: 0 });
      lastMoveTimeRef.current = Date.now();
      lastMovePositionRef.current = { x: touch.clientX, y: touch.clientY };
      setVelocity({ x: 0, y: 0 });
    },
    []
  );

  const handleTouchMove = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!dragStart) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;

    setDragOffset({ x: deltaX, y: deltaY });

    const now = Date.now();
    const timeDelta = now - lastMoveTimeRef.current;
    if (timeDelta > 0) {
      const positionDelta = {
        x: touch.clientX - lastMovePositionRef.current.x,
        y: touch.clientY - lastMovePositionRef.current.y,
      };
      setVelocity({
        x: positionDelta.x / timeDelta,
        y: positionDelta.y / timeDelta,
      });
    }

    lastMoveTimeRef.current = now;
    lastMovePositionRef.current = { x: touch.clientX, y: touch.clientY };

    const topCard = cardsRef.current[0];
    if (topCard) {
      const rotation = deltaX / 20;
      topCard.style.transition = "none";
      topCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
    }
  }, [dragStart]);

  const handleTouchEnd = React.useCallback(() => {
    if (!dragStart || isSwiping) return;

    const topCard = cardsRef.current[0];
    if (!topCard) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    const moveOutWidth = window.innerWidth;
    const keep = Math.abs(dragOffset.x) < 80 || Math.abs(velocity.x) < 0.5;

    if (!keep) {
      // Prevent double swipes
      setIsSwiping(true);

      // Determine swipe direction
      const swipeDirection = dragOffset.x > 0 ? 'right' : 'left';
      const currentCard = cardsData[currentIndex];
      
      // Call onSwipe callback if provided (for ELO system)
      if (onSwipe && currentCard) {
        onSwipe(currentCard.id, swipeDirection);
      }

      const endX = Math.max(Math.abs(velocity.x) * moveOutWidth, moveOutWidth);
      const toX = dragOffset.x > 0 ? endX : -endX;
      topCard.style.transition = "transform 0.3s ease";
      topCard.style.transform = `translate(${toX}px, 0) rotate(${(dragOffset.x > 0 ? 1 : -1) * 15}deg)`;
      setTimeout(() => {
        updateCards();
        setIsSwiping(false);
      }, 300);
    } else {
      topCard.style.transition = "transform 0.3s ease";
      topCard.style.transform = "";
    }

    setIsDragging(false);
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setVelocity({ x: 0, y: 0 });
  }, [dragStart, dragOffset, velocity, updateCards, currentIndex, cardsData, onSwipe, isSwiping]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    setDragOffset({ x: 0, y: 0 });
    lastMoveTimeRef.current = Date.now();
    lastMovePositionRef.current = { x: e.clientX, y: e.clientY };
    setVelocity({ x: 0, y: 0 });
  }, []);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragStart || !isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setDragOffset({ x: deltaX, y: deltaY });

      const now = Date.now();
      const timeDelta = now - lastMoveTimeRef.current;
      if (timeDelta > 0) {
        const positionDelta = {
          x: e.clientX - lastMovePositionRef.current.x,
          y: e.clientY - lastMovePositionRef.current.y,
        };
        setVelocity({
          x: positionDelta.x / timeDelta,
          y: positionDelta.y / timeDelta,
        });
      }

      lastMoveTimeRef.current = now;
      lastMovePositionRef.current = { x: e.clientX, y: e.clientY };

      const topCard = cardsRef.current[0];
      if (topCard) {
        const rotation = deltaX / 20;
        topCard.style.transition = "none";
        topCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
      }
    },
    [dragStart, isDragging]
  );

  const handleMouseUp = React.useCallback(() => {
    if (!dragStart || !isDragging || isSwiping) return;

    const topCard = cardsRef.current[0];
    if (!topCard) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    const moveOutWidth = window.innerWidth;
    const keep = Math.abs(dragOffset.x) < 80 || Math.abs(velocity.x) < 0.5;

    if (!keep) {
      // Prevent double swipes
      setIsSwiping(true);

      // Determine swipe direction
      const swipeDirection = dragOffset.x > 0 ? 'right' : 'left';
      const currentCard = cardsData[currentIndex];
      
      // Call onSwipe callback if provided (for ELO system)
      if (onSwipe && currentCard) {
        onSwipe(currentCard.id, swipeDirection);
      }

      const endX = Math.max(Math.abs(velocity.x) * moveOutWidth, moveOutWidth);
      const toX = dragOffset.x > 0 ? endX : -endX;
      topCard.style.transition = "transform 0.3s ease";
      topCard.style.transform = `translate(${toX}px, 0) rotate(${(dragOffset.x > 0 ? 1 : -1) * 15}deg)`;
      setTimeout(() => {
        updateCards();
        setIsSwiping(false);
      }, 300);
    } else {
      topCard.style.transition = "transform 0.3s ease";
      topCard.style.transform = "";
    }

    setIsDragging(false);
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setVelocity({ x: 0, y: 0 });
  }, [dragStart, isDragging, dragOffset, velocity, updateCards, currentIndex, cardsData, onSwipe, isSwiping]);

  React.useEffect(() => {
    updateCardStyles();
  }, [updateCardStyles]);

  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!dragStart) return;
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const topCard = cardsRef.current[0];
        if (topCard) {
          const rotation = deltaX / 20;
          topCard.style.transition = "none";
          topCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
        }
      };

      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, handleMouseUp]);

  const cardsToShow = cardsData.slice(
    currentIndex,
    Math.min(currentIndex + 4, cardsData.length)
  );

  if (showDonePopup) {
    const rankings = getRankings ? getRankings() : [];
    
    return (
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 bg-white z-[1000] border border-gray-300 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-black mb-4 text-center">Your Movie Rankings</h2>
        {rankings.length > 0 ? (
          <div className="space-y-3">
            {rankings.map((rating, index) => (
              <div
                key={rating.movie.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-black">{rating.movie.title}</h3>
                    <p className="text-sm text-gray-600">{rating.movie.genres.join(", ")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-black">{Math.round(rating.elo)}</div>
                  <div className="text-xs text-gray-500">ELO</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">No rankings available</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div
        ref={tinderContainerRef}
        className="relative w-[300px] h-[400px] bg-transparent rounded-[15px] flex flex-col justify-end"
      >
        {cardsToShow.map((card, index) => {
          const styles = getCardStyles(index);
          const isTopCard = index === 0;

          return (
            <div
              key={card.number}
              ref={(el) => {
                cardsRef.current[index] = el;
              }}
              className={cn(
                "absolute m-auto w-full h-full rounded-[15px] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all duration-500",
                isTopCard && "cursor-grab active:cursor-grabbing"
              )}
              style={{
                zIndex: styles.zIndex,
                transform: styles.transform,
                opacity: styles.opacity,
              }}
              onTouchStart={isTopCard ? handleTouchStart : undefined}
              onTouchMove={isTopCard ? handleTouchMove : undefined}
              onTouchEnd={isTopCard ? handleTouchEnd : undefined}
              onMouseDown={isTopCard ? handleMouseDown : undefined}
              onMouseMove={isTopCard ? handleMouseMove : undefined}
              onMouseUp={isTopCard ? handleMouseUp : undefined}
              >
                <div className="relative w-full h-full flex flex-col">
                  <div className="relative w-full h-[70%] flex items-center justify-center">
                    <Image
                      src={card.imageUrl || "/flago_only_logo.png"}
                      alt={card.question}
                      fill
                      unoptimized
                      className="object-cover pointer-events-none select-none"
                    />
                  </div>
                  <div className="w-full h-[30%] bg-white text-black p-5">
                  <div className="w-full h-full flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl font-bold leading-tight line-clamp-2">
                        {card.question}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{card.directors?.join(', ')}</div>
                      <div className="text-base mt-0.5 line-clamp-1">
                        {card.category}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="More details"
                      onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                      className="flex-shrink-0 w-10 h-10 rounded-full bg-black text-white grid place-items-center shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn("w-5 h-5 transition-transform duration-300", expanded ? "rotate-0" : "rotate-180")}
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Bottom drawer with slide animation (full-card) */}
                <div
                  className={cn(
                    "absolute inset-0 w-full h-full bg-white text-black p-5 pt-4 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out overflow-y-auto",
                    expanded ? "translate-y-0" : "translate-y-full"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-extrabold pr-2">{card.question}</h3>
                    {typeof card.rating === 'number' && (
                      <div className="px-1.5 py-0.5 rounded-lg bg-black text-white text-xs font-semibold">
                        {Math.round(card.rating * 10) / 10}
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-500">Genre</div>
                    <div className="text-sm">{card.category}</div>
                  </div>
                  {card.production && (
                    <div className="mt-2">
                      <div className="text-[10px] text-gray-500">Production</div>
                      <div className="text-sm">{card.production}</div>
                    </div>
                  )}
                  {Array.isArray(card.directors) && card.directors.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] text-gray-500">Direction</div>
                      <div className="text-sm">{card.directors.join(', ')}</div>
                    </div>
                  )}
                  {card.description && (
                    <div className="mt-2 pb-10">
                      <div className="text-[10px] text-gray-500">Description</div>
                      <div className="text-sm leading-relaxed">
                        {card.description}
                      </div>
                    </div>
                  )}
                  <div className="sticky bottom-0 w-full flex justify-end">
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      className="mt-2 w-8 h-8 rounded-full bg-black text-white grid place-items-center shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                      aria-label="Collapse details"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="w-full flex justify-center items-center gap-8 mt-8">
        <button
          id="nope"
          onClick={handleButtonClick(false)}
          className="w-16 h-16 rounded-full bg-[#ec5252] text-white flex items-center justify-center shadow-[0_4px_15px_rgba(236,82,82,0.4)] hover:shadow-[0_6px_20px_rgba(236,82,82,0.5)] hover:scale-110 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#ec5252] focus:ring-offset-2"
          aria-label="Nope"
        >
          <X className="w-7 h-7" />
        </button>
        <button
          id="love"
          onClick={handleButtonClick(true)}
          className="w-16 h-16 rounded-full bg-[#4caf50] text-white flex items-center justify-center shadow-[0_4px_15px_rgba(76,175,80,0.4)] hover:shadow-[0_6px_20px_rgba(76,175,80,0.5)] hover:scale-110 transition-all duration-200 outline-none focus:ring-2 focus:ring-[#4caf50] focus:ring-offset-2"
          aria-label="Love"
        >
          <Heart className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

