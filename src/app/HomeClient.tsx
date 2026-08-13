"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import { useSupabaseQuery } from "@/hooks/useSupabase";
import { getFeaturedProducts, getBestSellingProducts, getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/categories";
import { getActiveBanners } from "@/lib/services/admin";
import { SiteBanner } from "@/components/SiteBanner";
import { storageImage, IMG } from "@/lib/image";
import { LookCard } from "@/components/shop/LookBrowser";
import type { Banner, Category, Look, ProductWithCategory } from "@/types";
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

export default function HomeClient({
  initialHeroBanner = null,
  initialHeritageUrl = null,
  initialFeaturedLooks = [],
}: {
  initialHeroBanner?: Banner | null;
  initialHeritageUrl?: string | null;
  initialFeaturedLooks?: Look[];
}) {
  const { data: trendingProducts, loading: isLoadingTrending } = useSupabaseQuery(getFeaturedProducts);
  const { data: categories, loading: isLoadingCategories } = useSupabaseQuery(getCategories);
  const { data: allProducts, loading: isLoadingProducts } = useSupabaseQuery(getProducts);
  const { data: bestSellingData } = useSupabaseQuery(getBestSellingProducts);
  const { data: activeBanners } = useSupabaseQuery(() => getActiveBanners("general"), []);
  const { data: heroBanners } = useSupabaseQuery(() => getActiveBanners("hero_background"), []);
  const { data: heritageBanners } = useSupabaseQuery(() => getActiveBanners("heritage"), []);
  // Admin-managed hero cover (separate mobile/desktop images); falls back to
  // the packaged cover when no hero_background banner is set.
  // Hold the packaged cover back until the banner query settles — rendering it
  // immediately made the fallback flash and then swap to the admin image.
  // Rendered from build-time data first so the <img> exists on first paint;
  // the client query only matters if the banner changed since the last build.
  const heroBanner = initialHeroBanner ?? heroBanners?.[0] ?? null;
  const heroDesktop = heroBanner?.image_url || "/Cover KV.webp";
  const heroMobile = heroBanner?.mobile_image_url || heroDesktop;
  // Heritage story photo, admin-managed; falls back to the placeholder art.
  const heritageImage =
    initialHeritageUrl ||
    heritageBanners?.[0]?.image_url ||
    "https://placehold.co/600x750/F5E6D3/1A1A1A?text=Our+Heritage";

  // Group products by category name
  const productsByCategory: Record<string, ProductWithCategory[]> = {};
  if (allProducts) {
    allProducts.forEach((product) => {
      const categoryName = product.category?.name || 'Other';
      if (!productsByCategory[categoryName]) productsByCategory[categoryName] = [];
      productsByCategory[categoryName].push(product);
    });
  }

  // Best Selling excludes anything already shown in Trending above, so the two
  // carousels never surface the same product twice.
  const BEST_SELLING_TARGET = 8;
  const trendingIds = new Set((trendingProducts || []).map((p) => p.id));
  const inStock = (p: ProductWithCategory) => p.in_stock && (p.stock_quantity ?? 0) > 0;
  const flaggedBestSellers = (bestSellingData || [])
    .filter((p) => !trendingIds.has(p.id))
    .filter(inStock);
  // Removing trending duplicates and sold-out items can leave the carousel
  // almost empty, so top it up with other in-stock products rather than
  // showing a stranded row of two.
  const bestSelling = (() => {
    if (flaggedBestSellers.length >= BEST_SELLING_TARGET) return flaggedBestSellers;
    const chosen = new Set(flaggedBestSellers.map((p) => p.id));
    const fillers = (allProducts || []).filter(
      (p) => inStock(p) && !trendingIds.has(p.id) && !chosen.has(p.id)
    );
    return [...flaggedBestSellers, ...fillers.slice(0, BEST_SELLING_TARGET - flaggedBestSellers.length)];
  })();

  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(1);

  // Multilingual logo cycling
  const heroLogos = [
    "/logo-lanuages_hero/Artboard 1.webp",
    "/logo-lanuages_hero/Artboard 2.webp",
    "/logo-lanuages_hero/Artboard 3.webp",
    "/logo-lanuages_hero/Artboard 4.webp",
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
      {/* With an admin hero banner set, size the section to that image's own
          aspect ratio (mobile 1448x1086, desktop 2172x724) so the whole
          creative is visible instead of being cropped by a full-height hero.
          The packaged cover keeps the original full-bleed treatment. */}
      <section
        className={`hero-section relative -mt-20 flex items-center justify-center overflow-hidden ${
          heroBanner
            ? "pt-8 md:pt-10 w-full max-w-full min-h-[62vh] md:min-h-0 md:aspect-[3/2]"
            : "pt-32 pb-20 min-h-[calc(100vh+5rem)]"
        }`}
      >
        {/* Mobile cover */}
        {heroMobile && (
        <Image
          src={storageImage(heroMobile, IMG.bannerMobile)}
          alt="Khadi Vasthra Cover"
          fill
          className="hero-section__background-image object-cover z-0 md:hidden"
          priority
          quality={90}
          unoptimized={!!heroBanner}
        />
        )}
        {/* Desktop cover */}
        {heroDesktop && (
        <Image
          src={storageImage(heroDesktop, IMG.banner)}
          alt="Khadi Vasthra Cover"
          fill
          className="hero-section__background-image object-cover z-0 hidden md:block"
          priority
          quality={90}
          unoptimized={!!heroBanner}
        />
        )}
        <div className="hero-section__overlay absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50 z-0"></div>
        <div className="hero-section__content container mx-auto px-4 max-w-7xl relative z-20 text-center max-w-4xl">
          <div id="hero-logo" className="hero-section__logo-wrapper relative flex justify-center items-center mb-1 md:mb-2 w-full max-w-[55vw] md:max-w-sm lg:max-w-md mx-auto aspect-[5/2]"
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
          <p className="hero-section__description text-sm md:text-lg text-white/80 max-w-lg mx-auto font-light tracking-wide drop-shadow-md mb-4">
            Pure comfort. Timeless style. Crafted in cotton, inspired by kerala heritage.
          </p>
          <div className="hero-section__actions flex flex-col items-center justify-center gap-3 md:gap-4">
            <Link href="/shop" className="hero-section__cta-primary">
              <Button size="lg" className="bg-orange hover:bg-orange/90 text-white font-bold px-10 h-12 text-base rounded-full shadow-lg shadow-orange/30 hover:shadow-orange/50 hover:-translate-y-1 transition-all duration-300">
                Shop Now
              </Button>
            </Link>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Mundu", href: "/shop/group/mundu" },
                { label: "Saree", href: "/shop/group/saree" },
                { label: "Shirt", href: "/shop/group/shirt" },
              ].map(({ label, href }) => (
                <Link key={href} href={href}
                  className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white/90 hover:text-white text-sm font-medium tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 shadow-sm">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 1.5. HOMEPAGE HERO BANNER STRIP (admin managed) */}
      <section className="site-banner-section bg-cream pt-8 md:pt-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <SiteBanner placement="homepage_hero" />
        </div>
      </section>

      {/* 2. SHOP THE LOOK — curated outfits */}
      {initialFeaturedLooks.length > 0 && (
        <section className="looks-section bg-cream pt-10 md:pt-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-coral/10 text-coral text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Shop the Look
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-text font-serif">
                  Styled by Khadi Vasthra
                </h2>
              </div>
              <Link href="/looks" className="text-sm font-medium text-coral hover:underline whitespace-nowrap">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {initialFeaturedLooks.slice(0, 4).map((look) => (
                <LookCard key={look.id} look={look} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. DYNAMIC BANNERS (admin-managed; nothing renders when none are set) */}
      {activeBanners && activeBanners.length > 0 && (
        <section className="banners-section bg-white py-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="banners-section__grid grid md:grid-cols-3 gap-6">
              {activeBanners.slice(0, 6).map((banner) => (
                <DynamicBannerCard key={banner.id} banner={banner} />
              ))}
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

      {/* 5. TRENDING PRODUCTS */}
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

      {/* 6. BEST SELLING */}
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

      {/* 7. PRODUCTS BY CATEGORY */}
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
                  const categorySlug = (matchedCategory?.slug || slugifyCategory(categoryName)).trim();

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

      {/* 8. MARQUEE */}
      <section className="marquee-section bg-coral py-6 overflow-hidden">
        <div className="marquee-section__content flex animate-scroll whitespace-nowrap">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="marquee-section__text text-white text-xl font-semibold mx-8">
              Welcome to our store
            </span>
          ))}
        </div>
      </section>

      {/* 9. ABOUT SECTION */}
      <section className="about-section bg-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="about-section__content grid md:grid-cols-2 gap-10 items-center">
            <div className="about-section__image-wrapper relative aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={storageImage(heritageImage, IMG.hero)}
                alt="Khadi Vasthra Heritage"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                unoptimized
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
      <Image src={storageImage(banner.image_url, IMG.banner)} alt={banner.title || "Banner"} fill className="object-cover [@media(hover:hover)]:group-hover:scale-105 transition-transform duration-500" unoptimized />
      {(banner.title || banner.subtitle || href) && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {banner.title && (
              <h3 className="banner-card__title text-xl md:text-2xl font-bold text-white drop-shadow-md">{banner.title}</h3>
            )}
            {banner.subtitle && (
              <p className="text-white/80 text-sm mt-1 drop-shadow-sm">{banner.subtitle}</p>
            )}
            {href && (
              <span className="inline-flex items-center gap-1 mt-2 text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                Shop Now <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </>
      )}
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
        <div className="flex gap-3 md:gap-6 items-stretch">
          {products.map((product) => (
            <div key={product.id} className="flex-[0_0_calc(50%-6px)] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0 h-auto">
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
        <div className="flex gap-3 md:gap-6">
          {products.map((product) => (
            <div key={product.id} className="flex-[0_0_calc(50%-6px)] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0">
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
        <div className="flex gap-3 md:gap-6 items-stretch">
          {products.map((product) => (
            <div key={product.id} className="flex-[0_0_calc(50%-6px)] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(33.333%-16px)] lg:flex-[0_0_calc(25%-18px)] xl:flex-[0_0_calc(20%-19px)] min-w-0 h-auto">
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
        <div className="flex gap-3 md:gap-6">
          {categories.map((category) => (
            <div key={category.id} className="flex-[0_0_calc(33.333%-8px)] sm:flex-[0_0_calc(25%-9px)] md:flex-[0_0_calc(33.333%-16px)] lg:flex-[0_0_calc(25%-18px)] xl:flex-[0_0_calc(20%-19px)] min-w-0">
              <Link href={`/shop/${category.slug}`} className="category-card group flex flex-col bg-cream/30 rounded-xl md:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 [@media(hover:hover)]:hover:-translate-y-2">
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-white/50 flex-shrink-0">
                  {category.image_url ? (
                    <Image src={storageImage(category.image_url, IMG.card)} alt={category.name} fill sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw" className="object-cover object-top [@media(hover:hover)]:group-hover:scale-110 transition-transform duration-500" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                      <ImageOff className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-1.5 md:p-3 text-center flex-shrink-0 bg-cream/20 backdrop-blur-sm">
                  <h3 className="text-[11px] md:text-base font-bold text-text font-serif group-hover:text-coral transition-colors line-clamp-2 leading-tight">{category.name}</h3>
                  {category.description && <p className="hidden md:block text-xs text-text-muted line-clamp-1 leading-relaxed mt-0.5">{category.description}</p>}
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
