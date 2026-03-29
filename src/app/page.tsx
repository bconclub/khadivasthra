"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getFeaturedProducts, getBestSellingProducts, getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import { getActiveBanners } from "@/lib/services/admin";
import type { Banner, Category, ProductWithCategory } from "@/types";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, ImageOff } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";

// Adapter: map Supabase product shape to what ProductCard expects
function toCardProduct(product: ProductWithCategory) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    compare_price: product.compare_price ? Number(product.compare_price) : null,
    in_stock: product.in_stock,
    image: product.image_url || '',
    category: product.category?.name || '',
  };
}

export default function Home() {
  const { data: trendingProducts, loading: isLoadingTrending } = useSupabaseQuery(getFeaturedProducts);
  const { data: categories, loading: isLoadingCategories } = useSupabaseQuery(getCategories);
  const { data: allProducts, loading: isLoadingProducts } = useSupabaseQuery(getProducts);
  const { data: bestSellingData } = useSupabaseQuery(getBestSellingProducts);
  const { data: activeBanners } = useSupabaseQuery(getActiveBanners);

  // Group products by category name
  const productsByCategory: Record<string, ProductWithCategory[]> = {};
  if (allProducts) {
    allProducts.forEach((product) => {
      const categoryName = product.category?.name || 'Other';
      if (!productsByCategory[categoryName]) productsByCategory[categoryName] = [];
      productsByCategory[categoryName].push(product);
    });
  }

  const bestSelling = bestSellingData || [];

  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(1);

  // Multilingual logo cycling
  const heroLogos = [
    "/logo_languages/Artboard 1.png",
    "/logo_languages/Artboard 2.png",
    "/logo_languages/Artboard 3.png",
    "/logo_languages/Artboard 4.png",
  ];
  const [logoIndex, setLogoIndex] = useState(0);

  useEffect(() => {
    let step = 0;
    const lastIndex = heroLogos.length - 1;
    const interval = setInterval(() => {
      step++;
      if (step >= lastIndex) {
        setLogoIndex(lastIndex); // land on Malayalam
        clearInterval(interval);
      } else {
        setLogoIndex(step);
      }
    }, 1400);
    return () => clearInterval(interval);
  }, [heroLogos.length]);

  useEffect(() => {
    const handleScroll = () => {
      const heroLogo = document.getElementById('hero-logo');
      if (!heroLogo) return;

      const rect = heroLogo.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const logoTop = rect.top;
      const scrollY = window.scrollY;

      if (scrollY === 0) {
        setLogoScale(1);
        setLogoOpacity(1);
        return;
      }

      const headerThreshold = 80;
      const scrollRange = (windowHeight - headerThreshold) * 0.5;
      const currentScroll = windowHeight - logoTop;

      if (logoTop <= headerThreshold) {
        const fadeProgress = Math.max(0, 1 - (headerThreshold - logoTop) / 60);
        setLogoOpacity(fadeProgress);
        setLogoScale(1.5);
      } else if (logoTop < windowHeight && scrollY > 0) {
        const scrollProgress = Math.min(1, currentScroll / scrollRange);
        const scale = 1 + (scrollProgress * 0.5);
        setLogoScale(scale);
        setLogoOpacity(1);
      } else {
        setLogoScale(1);
        setLogoOpacity(1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="hero-section relative -mt-20 pt-32 pb-20 min-h-[calc(100vh+5rem)] flex items-center justify-center overflow-hidden">
        <Image
          src="/Cover KV.webp"
          alt="Khadi Vasthra Cover"
          fill
          className="hero-section__background-image object-cover z-0"
          priority
          quality={90}
        />
        <div className="hero-section__overlay absolute inset-0 bg-black/30 z-0"></div>
        <div className="hero-section__content container mx-auto px-4 max-w-7xl relative z-20 text-center max-w-4xl">
          <span className="hero-section__badge inline-block px-4 py-1.5 border border-white/30 rounded-full text-sm tracking-widest uppercase font-medium bg-white/20 backdrop-blur-sm text-white mb-4">
            Authentic Kerala Handloom
          </span>
          <div id="hero-logo" className="hero-section__logo-wrapper relative flex justify-center items-center mb-4 w-full max-w-[70vw] md:max-w-xl lg:max-w-2xl mx-auto aspect-[5/2]"
            style={{ transform: `scale(${logoScale})`, opacity: logoOpacity, transition: "transform 100ms ease-out, opacity 100ms ease-out" }}
          >
            {heroLogos.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt="Khadi Vasthra"
                fill
                className="object-contain drop-shadow-2xl transition-opacity duration-700 ease-in-out"
                style={{ opacity: i === logoIndex ? 1 : 0 }}
                priority={i === 0}
                unoptimized
              />
            ))}
          </div>
          <p className="hero-section__description text-xl md:text-2xl text-white/95 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md mb-6">
            Pure comfort. Timeless style. Crafted in cotton, inspired by heritage.
          </p>
          <div className="hero-section__actions flex flex-col items-center justify-center gap-4">
            <Link href="/shop" className="hero-section__cta-primary">
              <Button size="lg" className="bg-orange hover:bg-orange-dark text-white font-bold min-w-[200px] h-14 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                Shop Now
              </Button>
            </Link>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Kavi Mundu", href: "/shop/kavi-mundu" },
                { label: "Printed Mundu", href: "/shop/printed-mundu" },
                { label: "Set Mundu", href: "/shop/set-mundu" },
                { label: "Set Sarees", href: "/shop/set-sarees" },
                { label: "Men's Shirts", href: "/shop/men-shirts" },
              ].map(({ label, href }) => (
                <Link key={href} href={href}
                  className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-medium tracking-wide transition-all hover:-translate-y-0.5">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRENDING PRODUCTS */}
      <section className="trending-section bg-cream py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="trending-section__title text-3xl font-bold text-text font-serif text-center mb-8">
            Trending Products
          </h2>
          {isLoadingTrending ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          ) : trendingProducts && trendingProducts.length > 0 ? (
            <div className="trending-section__carousel">
              <TrendingCarousel products={trendingProducts.map(toCardProduct)} />
            </div>
          ) : (
            <div className="text-center py-20 text-text-muted">
              <p>No featured products available at the moment.</p>
              <p className="text-sm mt-2">Mark products as featured in the admin dashboard to display them here.</p>
            </div>
          )}
        </div>
      </section>

      {/* 3. DYNAMIC BANNERS */}
      {activeBanners && activeBanners.length > 0 ? (
        <section className="banners-section bg-white py-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="banners-section__grid grid md:grid-cols-3 gap-6">
              {activeBanners.slice(0, 6).map((banner) => (
                <DynamicBannerCard key={banner.id} banner={banner} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="banners-section bg-white py-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="banners-section__grid grid md:grid-cols-3 gap-6">
              <StaticBannerCard title="Festival Collection" overlay="coral" image="/images/card covers/festival collection.png" />
              <StaticBannerCard title="25% Off" overlay="orange" image="/images/card covers/offer.png" />
              <StaticBannerCard title="New Arrivals" overlay="cream" image="/images/card covers/new-arrivals.png" />
            </div>
          </div>
        </section>
      )}

      {/* 4. SHOP BY CATEGORY */}
      <section className="categories-carousel-section bg-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="categories-carousel-section__title text-3xl font-bold text-text font-serif text-center mb-8">
            Shop by Category
          </h2>
          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          ) : categories && categories.length > 0 ? (
            <CategoriesCarousel categories={categories} />
          ) : (
            <div className="text-center py-20 text-text-muted">
              <p>No categories available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. BEST SELLING */}
      <section className="bestselling-section bg-cream py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="bestselling-section__title text-3xl font-bold text-text font-serif text-center mb-8">
            Best Selling
          </h2>
          {bestSelling.length > 0 ? (
            <BestSellingCarousel products={bestSelling.map(toCardProduct)} />
          ) : (
            <div className="text-center py-20 text-text-muted">
              <p>No best selling products available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5.5. PRODUCTS BY CATEGORY */}
      {isLoadingProducts ? (
        <section className="products-by-category-section bg-white py-20">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          </div>
        </section>
      ) : (
        Object.keys(productsByCategory).filter((cat) => productsByCategory[cat].length >= 5).length > 0 && (
          <section className="products-by-category-section bg-white py-12">
            <div className="container mx-auto px-4 max-w-7xl space-y-12">
              {Object.keys(productsByCategory)
                .filter((categoryName) => productsByCategory[categoryName].length >= 5)
                .sort((a, b) => {
                  const categoryA = categories?.find((cat) => cat.name === a);
                  const categoryB = categories?.find((cat) => cat.name === b);
                  const orderA = categoryA?.display_order ?? 999;
                  const orderB = categoryB?.display_order ?? 999;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.localeCompare(b);
                })
                .map((categoryName) => {
                  const categoryProducts = productsByCategory[categoryName].slice(0, 8);
                  const matchedCategory = categories?.find((cat) => cat.name === categoryName);
                  const categorySlug = matchedCategory?.slug || slugifyCategory(categoryName);

                  return (
                    <div key={categoryName} className="category-products-row">
                      <div className="category-products-row__header flex items-center justify-between mb-6">
                        <h3 className="category-products-row__title text-2xl font-bold text-text font-serif">
                          {categoryName}
                        </h3>
                        <Link
                          href={`/shop/${categorySlug}`}
                          className="category-products-row__view-all flex items-center gap-2 text-coral hover:text-coral-dark font-semibold transition-colors group"
                        >
                          View All
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                      <CategoryProductsCarousel products={categoryProducts.map(toCardProduct)} />
                    </div>
                  );
                })}
            </div>
          </section>
        )
      )}

      {/* 6. MARQUEE */}
      <section className="marquee-section bg-coral py-6 overflow-hidden">
        <div className="marquee-section__content flex animate-scroll whitespace-nowrap">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="marquee-section__text text-white text-xl font-semibold mx-8">
              Welcome to our store
            </span>
          ))}
        </div>
      </section>

      {/* 7. ABOUT SECTION */}
      <section className="about-section bg-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="about-section__content grid md:grid-cols-2 gap-10 items-center">
            <div className="about-section__image-wrapper relative aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="https://placehold.co/600x750/F5E6D3/1A1A1A?text=Our+Heritage"
                alt="Khadi Vasthra Heritage"
                fill
                className="object-cover"
              />
            </div>
            <div className="about-section__text space-y-4">
              <span className="about-section__badge inline-block px-4 py-2 bg-orange text-white text-sm font-semibold uppercase tracking-wider rounded-full">
                Since 2007
              </span>
              <h2 className="about-section__title text-3xl md:text-4xl font-bold text-text font-serif leading-tight">
                Preserving Kerala&apos;s Handloom Heritage
              </h2>
              <p className="about-section__description text-base text-text-muted leading-relaxed">
                Khadi Vasthra is more than just a store; it&apos;s a celebration of Kerala&apos;s rich textile heritage.
                Located in the heart of Aluva, we have been bridging the gap between traditional weavers and modern lifestyles since 2007.
              </p>
              <p className="about-section__description text-base text-text-muted leading-relaxed">
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

// Static Banner Card (fallback)
function StaticBannerCard({ title, overlay, image }: { title: string; overlay: string; image: string }) {
  const overlayClass = overlay === "coral" ? "bg-coral/40" : overlay === "orange" ? "bg-orange/40" : "bg-cream/40";
  return (
    <div className="banner-card relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
      <Image src={image} alt={title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
      <div className={`absolute inset-0 ${overlayClass} flex items-center justify-center`}>
        <h3 className="banner-card__title text-2xl md:text-3xl font-bold text-white text-center">{title}</h3>
      </div>
    </div>
  );
}

// Dynamic Banner Card (from admin)
function DynamicBannerCard({ banner }: { banner: Banner }) {
  const getBannerHref = (): string | null => {
    if (banner.link_type === "none" || !banner.link_value) return null;
    if (banner.link_type === "product") return `/product/${banner.link_value}`;
    if (banner.link_type === "category") return `/shop/${banner.link_value}`;
    return banner.link_value;
  };

  const href = getBannerHref();
  const spanClass = banner.size === "hero" ? "md:col-span-3" : banner.size === "wide" ? "md:col-span-2" : "";
  const aspectClass = banner.size === "hero" ? "aspect-video" : banner.size === "wide" ? "aspect-[3/1]" : banner.size === "tall" ? "aspect-[2/3]" : "aspect-[4/3]";

  const content = (
    <div className={`banner-card relative ${aspectClass} rounded-2xl overflow-hidden shadow-lg group cursor-pointer ${spanClass}`}>
      <Image src={banner.image_url} alt={banner.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="banner-card__title text-xl md:text-2xl font-bold text-white drop-shadow-md">{banner.title}</h3>
        {banner.subtitle && (
          <p className="text-white/80 text-sm mt-1 drop-shadow-sm">{banner.subtitle}</p>
        )}
        {href && (
          <span className="inline-flex items-center gap-1 mt-2 text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            Shop Now <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${spanClass}`}>
        {content}
      </Link>
    );
  }
  return <div className={spanClass}>{content}</div>;
}

function slugifyCategory(text: string) {
  return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

type CardProduct = { id: string; name: string; slug: string; price: number; image: string; category: string };

// Trending Carousel
function TrendingCarousel({ products }: { products: CardProduct[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", slidesToScroll: 1, loop: false });
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="trending-carousel relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6 items-stretch">
          {products.map((product) => (
            <div key={product.id} className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0 h-auto">
              <ProductCard product={product} showHeart={true} />
            </div>
          ))}
        </div>
      </div>
      {products.length > 4 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="icon" onClick={scrollPrev} disabled={prevBtnDisabled} className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Previous products"><ChevronLeft className="h-6 w-6" /></Button>
          <Button variant="outline" size="icon" onClick={scrollNext} disabled={nextBtnDisabled} className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Next products"><ChevronRight className="h-6 w-6" /></Button>
        </div>
      )}
    </div>
  );
}

// Best Selling Carousel
function BestSellingCarousel({ products }: { products: CardProduct[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", slidesToScroll: 1, loop: false });
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="bestselling-carousel relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {products.map((product) => (
            <div key={product.id} className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0">
              <ProductCard product={product} variant="white" />
            </div>
          ))}
        </div>
      </div>
      {products.length > 4 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="icon" onClick={scrollPrev} disabled={prevBtnDisabled} className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Previous"><ChevronLeft className="h-6 w-6" /></Button>
          <Button variant="outline" size="icon" onClick={scrollNext} disabled={nextBtnDisabled} className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Next"><ChevronRight className="h-6 w-6" /></Button>
        </div>
      )}
    </div>
  );
}

// Category Products Carousel
function CategoryProductsCarousel({ products }: { products: CardProduct[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", slidesToScroll: 1, loop: false });
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  if (products.length === 0) return null;

  return (
    <div className="category-products-carousel relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6 items-stretch">
          {products.map((product) => (
            <div key={product.id} className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(33.333%-16px)] lg:flex-[0_0_calc(25%-18px)] xl:flex-[0_0_calc(20%-19px)] min-w-0 h-auto">
              <ProductCard product={product} variant="white" />
            </div>
          ))}
        </div>
      </div>
      {products.length > 4 && (
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button variant="outline" size="icon" onClick={scrollPrev} disabled={prevBtnDisabled} className="rounded-full w-10 h-10 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Previous"><ChevronLeft className="h-5 w-5" /></Button>
          <Button variant="outline" size="icon" onClick={scrollNext} disabled={nextBtnDisabled} className="rounded-full w-10 h-10 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Next"><ChevronRight className="h-5 w-5" /></Button>
        </div>
      )}
    </div>
  );
}

// Categories Carousel
function CategoriesCarousel({ categories }: { categories: Category[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", slidesToScroll: 1, loop: false });
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="categories-carousel relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {categories.map((category) => (
            <div key={category.id} className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(33.333%-16px)] lg:flex-[0_0_calc(25%-18px)] xl:flex-[0_0_calc(20%-19px)] min-w-0">
              <Link href={`/shop/${category.slug}`} className="category-card group aspect-[3/5] flex flex-col bg-cream/30 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="relative w-full flex-[1.5] min-h-[300px] overflow-hidden bg-white/50 flex-shrink-0">
                  {category.image_url ? (
                    <Image src={category.image_url} alt={category.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw" className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                      <ImageOff className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-3 text-center flex-shrink-0 bg-cream/20 backdrop-blur-sm">
                  <h3 className="text-base font-bold text-text font-serif mb-1 group-hover:text-coral transition-colors line-clamp-2 leading-tight">{category.name}</h3>
                  {category.description && <p className="text-xs text-text-muted line-clamp-1 leading-relaxed mt-0.5">{category.description}</p>}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      {categories.length > 4 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="icon" onClick={scrollPrev} disabled={prevBtnDisabled} className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Previous categories"><ChevronLeft className="h-6 w-6" /></Button>
          <Button variant="outline" size="icon" onClick={scrollNext} disabled={nextBtnDisabled} className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" aria-label="Next categories"><ChevronRight className="h-6 w-6" /></Button>
        </div>
      )}
    </div>
  );
}
