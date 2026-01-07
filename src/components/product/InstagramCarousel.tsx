"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstagramCarouselProps {
  posts: Array<{
    id: string;
    type?: 'embed' | 'video' | 'image';
    url?: string;
  }>;
  autoplayInterval?: number;
}

export function InstagramCarousel({ posts, autoplayInterval = 5000 }: InstagramCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    loop: true,
    duration: 20,
  });

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback((emblaApi: any) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  // Autoplay functionality
  useEffect(() => {
    if (!emblaApi) return;

    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);

    // Autoplay
    const autoplay = setInterval(() => {
      if (emblaApi) {
        emblaApi.scrollNext();
      }
    }, autoplayInterval);

    return () => {
      clearInterval(autoplay);
    };
  }, [emblaApi, onSelect, autoplayInterval]);

  return (
    <div className="relative w-full">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex-[0_0_100%] sm:flex-[0_0_100%] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] min-w-0"
            >
              {/* Phone Mockup Container - 9:16 aspect ratio */}
              <div className="relative mx-auto max-w-sm">
                {/* Phone Frame */}
                <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  {/* Phone Screen */}
                  <div className="relative bg-black rounded-[2.5rem] overflow-hidden aspect-[9/16]">
                    {/* Screen Content */}
                    <div className="absolute inset-0">
                      {post.type === 'embed' ? (
                        <iframe
                          src={`https://www.instagram.com/p/${post.id}/embed`}
                          className="w-full h-full"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          allowTransparency={true}
                          allow="autoplay"
                        ></iframe>
                      ) : post.type === 'video' && post.url ? (
                        <video
                          src={post.url}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <iframe
                          src={`https://www.instagram.com/p/${post.id}/embed`}
                          className="w-full h-full"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          allowTransparency={true}
                          allow="autoplay"
                        ></iframe>
                      )}
                    </div>
                    
                    {/* Phone Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
                    
                    {/* Home Indicator (for modern phones) */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {posts.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="rounded-full w-12 h-12 border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Previous post"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="rounded-full w-12 h-12 border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Next post"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}

