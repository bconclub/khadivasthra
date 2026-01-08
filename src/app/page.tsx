"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import { ArrowRight, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";

export default function Home() {
  // Get trending products (featured products)
  const trendingProducts = products.filter(p => p.isFeatured).slice(0, 8);
  
  // Get best selling products
  const bestSelling = products.slice(0, 7);

  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const heroLogo = document.getElementById('hero-logo');
      if (!heroLogo) return;

      const rect = heroLogo.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const logoTop = rect.top;
      const scrollY = window.scrollY;
      
      // Only start scaling when user has scrolled
      if (scrollY === 0) {
        setLogoScale(1);
        setLogoOpacity(1);
        return;
      }
      
      // Calculate scale based on scroll position
      // Logo starts at scale 1, grows to 1.5 as it approaches header (80px from top)
      const headerThreshold = 80;
      const scrollRange = windowHeight - headerThreshold;
      const currentScroll = windowHeight - logoTop;
      
      if (logoTop <= headerThreshold) {
        // Logo has reached header position - start fading out
        const fadeProgress = Math.max(0, 1 - (headerThreshold - logoTop) / 100);
        setLogoOpacity(fadeProgress);
        setLogoScale(1.5);
      } else if (logoTop < windowHeight && scrollY > 0) {
        // Logo is in viewport and user has scrolled, scale it up as it scrolls
        const scrollProgress = Math.min(1, currentScroll / scrollRange);
        const scale = 1 + (scrollProgress * 0.5); // Scale from 1 to 1.5
        setLogoScale(scale);
        setLogoOpacity(1);
      } else {
        // Logo is below viewport or no scroll yet
        setLogoScale(1);
        setLogoOpacity(1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Don't call handleScroll on initial load - let it stay at scale 1
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 1. HERO SECTION - Fullscreen Cover Image with Logo in Middle */}
      <section className="hero-section relative -mt-20 pt-20 h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <Image
          src="/Cover KV.webp"
          alt="Khadi Vasthra Cover"
          fill
          className="hero-section__background-image object-cover z-0"
          priority
          quality={90}
        />
        {/* Dark Overlay for Text Readability */}
        <div className="hero-section__overlay absolute inset-0 bg-black/30 z-0"></div>
        {/* Content */}
        <div className="hero-section__content container mx-auto px-4 max-w-7xl relative z-20 text-center max-w-4xl">
          <span className="hero-section__badge inline-block px-4 py-1.5 border border-white/30 rounded-full text-sm tracking-widest uppercase font-medium bg-white/20 backdrop-blur-sm text-white mb-4">
            Authentic Kerala Handloom
          </span>
          <div className="hero-section__logo-wrapper flex justify-center mb-4">
            <Image
              id="hero-logo"
              src="/Khadi Vasthra White Transparnt.png"
              alt="Khadi Vasthra Logo"
              width={500}
              height={200}
              className="hero-section__logo h-auto w-full max-w-md md:max-w-lg lg:max-w-xl object-contain drop-shadow-2xl transition-all duration-300 ease-out"
              style={{
                transform: `scale(${logoScale})`,
                opacity: logoOpacity,
              }}
              priority
            />
          </div>
          <p className="hero-section__description text-xl md:text-2xl text-white/95 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md mb-6">
            Discover the finest collection of handcrafted Mundus and Dhotis, brought to you directly from the artisans of Aluva.
          </p>
          <div className="hero-section__actions flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/products" className="hero-section__cta-primary">
              <Button size="lg" className="bg-orange hover:bg-orange-dark text-white font-bold min-w-[200px] h-14 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. TRENDING PRODUCTS - Cream bg, carousel */}
      <section className="trending-section bg-cream py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="trending-section__title text-4xl font-bold text-text font-serif text-center mb-12">
            Trending Products
          </h2>
          <div className="trending-section__carousel">
            <TrendingCarousel products={trendingProducts} />
          </div>
        </div>
      </section>

      {/* 3. THREE BANNERS - White bg */}
      <section className="banners-section bg-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="banners-section__grid grid md:grid-cols-3 gap-6">
            <BannerCard 
              title="Festival Collection"
              overlay="coral"
              image="/images/single-mundus/Peach Heritage Mundu.png"
            />
            <BannerCard 
              title="25% Off"
              overlay="orange"
              image="/images/single-mundus/Red Border Balck Mundu.png"
            />
            <BannerCard 
              title="New Arrivals"
              overlay="cream"
              image="/images/single-mundus/White Purple Mundu.png"
            />
          </div>
        </div>
      </section>

      {/* 4. TOP CATEGORY - White bg, 4 circular images */}
      <section className="categories-section bg-white py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="categories-section__title text-4xl font-bold text-text font-serif text-center mb-12">
            Top Category
          </h2>
          <div className="categories-section__grid grid grid-cols-2 md:grid-cols-4 gap-8">
            <CategoryCircle name="White Mundus" image="/images/mundu-white.png" />
            <CategoryCircle name="Kavi" image="/images/mundu-gold.png" />
            <CategoryCircle name="Printed" image="/images/mundu-pink.png" />
            <CategoryCircle name="Double" image="/images/mundu-saffron.png" />
          </div>
        </div>
      </section>

      {/* 5. BEST SELLING - Cream bg, masonry grid */}
      <section className="bestselling-section bg-cream py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="bestselling-section__title text-4xl font-bold text-text font-serif text-center mb-12">
            Best Selling
          </h2>
          <div className="bestselling-section__grid grid md:grid-cols-3 gap-6">
            {/* Large left card */}
            <div className="md:col-span-1">
              <ProductCard product={bestSelling[0]} variant="white" />
            </div>
            {/* 4 small right cards */}
            <div className="md:col-span-2 grid grid-cols-2 gap-6">
              {bestSelling.slice(1, 5).map((product) => (
                <ProductCard key={product.id} product={product} variant="white" />
              ))}
            </div>
            {/* 3 below */}
            <div className="md:col-span-3 grid md:grid-cols-3 gap-6">
              {bestSelling.slice(5, 8).map((product) => (
                <ProductCard key={product.id} product={product} variant="white" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. MARQUEE - Coral pink bg, infinite scroll */}
      <section className="marquee-section bg-coral py-6 overflow-hidden">
        <div className="marquee-section__content flex animate-scroll whitespace-nowrap">
          <span className="marquee-section__text text-white text-xl font-semibold mx-8">
            Welcome to our store
          </span>
          <span className="marquee-section__text text-white text-xl font-semibold mx-8">
            Welcome to our store
          </span>
          <span className="marquee-section__text text-white text-xl font-semibold mx-8">
            Welcome to our store
          </span>
          <span className="marquee-section__text text-white text-xl font-semibold mx-8">
            Welcome to our store
          </span>
        </div>
      </section>

      {/* 7. ABOUT SECTION - White bg, image left, text right */}
      <section className="about-section bg-white py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="about-section__content grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Image */}
            <div className="about-section__image-wrapper relative aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="https://placehold.co/600x750/F5E6D3/1A1A1A?text=Our+Heritage"
                alt="Khadi Vasthra Heritage"
                fill
                className="object-cover"
              />
            </div>

            {/* Right: Text */}
            <div className="about-section__text space-y-6">
              <span className="about-section__badge inline-block px-4 py-2 bg-orange text-white text-sm font-semibold uppercase tracking-wider rounded-full">
                Since 1990
              </span>
              <h2 className="about-section__title text-4xl md:text-5xl font-bold text-text font-serif leading-tight">
                Preserving Kerala's Handloom Heritage
              </h2>
              <p className="about-section__description text-lg text-text-muted leading-relaxed">
                Khadi Vasthra is more than just a store; it's a celebration of Kerala's rich textile heritage.
                Located in the heart of Aluva, we have been bridging the gap between traditional weavers and modern lifestyles since 1990.
              </p>
              <p className="about-section__description text-lg text-text-muted leading-relaxed">
                Every thread in our mundus tells a story of patience, skill, and dedication. We take pride in sourcing directly
                from master weavers, ensuring that the art form thrives while you get the most authentic quality.
              </p>
              <Link href="/contact" className="about-section__cta inline-block">
                <Button size="lg" className="bg-coral hover:bg-coral-dark text-white font-semibold px-8 py-6">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Banner Card Component
function BannerCard({ title, overlay, image }: { title: string; overlay: string; image: string }) {
  const overlayClass = overlay === "coral" ? "bg-coral/80" : overlay === "orange" ? "bg-orange/80" : "bg-cream/80";
  
  return (
    <div className="banner-card relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div className={`absolute inset-0 ${overlayClass} flex items-center justify-center`}>
        <h3 className="banner-card__title text-2xl md:text-3xl font-bold text-white text-center">
          {title}
        </h3>
      </div>
    </div>
  );
}

// Category Circle Component
function CategoryCircle({ name, image }: { name: string; image: string }) {
  return (
    <div className="category-circle text-center">
      <div className="category-circle__image-wrapper relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 rounded-full overflow-hidden shadow-lg border-4 border-white">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
      <h3 className="category-circle__name text-lg font-semibold text-text">{name}</h3>
    </div>
  );
}

// Trending Carousel Component with Heart Icons
function TrendingCarousel({ products }: { products: Array<{ id: string; name: string; price: number; image: string; category: string }> }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    loop: false,
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

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="trending-carousel relative">
      <div className="trending-carousel__viewport overflow-hidden" ref={emblaRef}>
        <div className="trending-carousel__container flex gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="trending-carousel__slide flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0"
            >
              <ProductCard product={product} showHeart={true} />
            </div>
          ))}
        </div>
      </div>

      {products.length > 4 && (
        <div className="trending-carousel__navigation flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Previous products"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Next products"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
