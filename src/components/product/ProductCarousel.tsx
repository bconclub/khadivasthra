"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Button } from "@/components/ui/button";

interface ProductCarouselProps {
  products: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
  }>;
}

export function ProductCarousel({ products }: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    loop: false,
    dragFree: true,
    containScroll: "trimSnaps",
  });
  
  const viewportRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!emblaApi) return;

    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  // Handle touchpad/mouse wheel horizontal scrolling
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !emblaApi) return;

    let scrollTimeout: NodeJS.Timeout;
    let accumulatedDeltaX = 0;
    const SCROLL_THRESHOLD = 30; // Minimum delta to trigger scroll

    const handleWheel = (e: WheelEvent) => {
      // Handle horizontal scrolling - prioritize deltaX over deltaY
      // For touchpads, deltaX represents horizontal swipe
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || (e.deltaX !== 0 && Math.abs(e.deltaY) < 5)) {
        e.preventDefault();
        accumulatedDeltaX += e.deltaX;
        
        // Clear previous timeout
        clearTimeout(scrollTimeout);
        
        // Scroll when accumulated delta reaches threshold
        scrollTimeout = setTimeout(() => {
          if (Math.abs(accumulatedDeltaX) >= SCROLL_THRESHOLD) {
            if (accumulatedDeltaX > 0) {
              emblaApi.scrollNext();
            } else {
              emblaApi.scrollPrev();
            }
          }
          accumulatedDeltaX = 0;
        }, 100);
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, [emblaApi]);

  return (
    <div className="product-carousel relative">
      <div 
        className="product-carousel__viewport overflow-hidden touch-pan-x" 
        ref={(node) => {
          emblaRef(node);
          if (node) {
            viewportRef.current = node;
          }
        }}
        style={{ touchAction: "pan-x pinch-zoom" }}
      >
        <div className="product-carousel__container flex gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="product-carousel__slide flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {products.length > 4 && (
        <div className="product-carousel__navigation flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="product-carousel__button product-carousel__button--prev rounded-full w-12 h-12 border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Previous products"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="product-carousel__button product-carousel__button--next rounded-full w-12 h-12 border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Next products"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}

