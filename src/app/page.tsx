"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import products from "@/data/products.json";
import categoriesData from "../../public/data/categories.json";
import { ArrowRight, Heart, ChevronLeft, ChevronRight, Loader2, ImageOff } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  isFeatured?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder?: number;
  isActive?: boolean;
}

export default function Home() {
  // State for featured products (from API)
  // Start with static fallback so thumbnails are visible immediately
  const initialTrending = (products as Product[]).filter(p => {
    const isFeatured: any = p.isFeatured;
    if (isFeatured === true) return true;
    if (typeof isFeatured === 'number' && isFeatured === 1) return true;
    if (typeof isFeatured === 'string') {
      const s = isFeatured.toLowerCase().trim();
      return s === 'true' || s === '1';
    }
    return false;
  }).slice(0, 8);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>(initialTrending);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);

  // State for categories
  // Use static categories immediately as fallback
  const [categories, setCategories] = useState<Category[]>(categoriesData?.categories || []);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // State for products grouped by category
  // Initialize from static `products` so UI shows thumbnails immediately
  const initialGrouped: Record<string, Product[]> = {};
  (products as Product[]).forEach((product) => {
    const category = product.category || 'Other';
    if (!initialGrouped[category]) initialGrouped[category] = [];
    initialGrouped[category].push(product);
  });
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>(initialGrouped);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Get best selling products
  const bestSelling = products.filter((p: any) => p.isBestSeller === true || p.isBestSeller === "true").slice(0, 8);

  // Fetch featured products from API
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        // Priority order: Production API → Local Dev API → Static JSON
        let response: Response | null = null;

        // 1. Try production API first (khadivasthra.com)
        // Try multiple possible API paths
        const productionApiUrls = [
          'https://khadivasthra.com/api/products.php?featured=true',
          'https://khadivasthra.com/public/api/products.php?featured=true',
          'https://khadivasthra.com/admin/api/products.php?featured=true',
        ];

        for (const apiUrl of productionApiUrls) {
          try {
            response = await fetch(apiUrl, {
              mode: 'cors',
            });
            if (response.ok) {
              // Production API succeeded, skip to processing
              break;
            } else {
              response = null; // Try next URL
            }
          } catch (prodError) {
            // This URL failed, try next one
            response = null;
          }
        }

        // 2. If production API failed, try local dev API (port 8080)
        if (!response || !response.ok) {
          try {
            response = await fetch('http://localhost:8080/api/products.php?featured=true', {
              mode: 'cors',
            });
          } catch (apiError) {
            // Local dev API not available, will try static JSON fallback
            response = null;
          }
        }

        // 3. If both APIs failed, try static JSON file
        if (!response || !response.ok) {
          try {
            response = await fetch('/data/products.json');
          } catch (staticError) {
            response = null;
          }
        }

        if (!response) {
          throw new Error('No response from API or static JSON');
        }

        if (response.ok) {
          const contentType = response.headers.get('content-type');

          // Only parse as JSON if content-type is correct (prevents parsing PHP code as JSON)
          if (contentType && contentType.includes('application/json')) {
            let data;
            try {
              data = await response.json();

              let featuredProductsList: Product[] = [];

              // Handle API response format (with success flag)
              if (data.success && data.products && Array.isArray(data.products)) {
                featuredProductsList = data.products;
              }
              // Handle static JSON format (direct products array or wrapped in products key)
              else if (data.products && Array.isArray(data.products)) {
                featuredProductsList = data.products;
              } else if (Array.isArray(data)) {
                featuredProductsList = data;
              }

              // Filter for featured products - ONLY show products marked as featured
              const filteredFeatured = featuredProductsList.filter((p: Product) => {
                const isFeatured: any = p.isFeatured;

                // Handle boolean, string, and numeric values for isFeatured
                // Only return true if isFeatured is explicitly true/1/'true'/'1'
                // Handle runtime type checking (API might return string/number despite TypeScript type)
                let result = false;
                if (isFeatured === true) {
                  result = true;
                } else if (typeof isFeatured === 'number' && isFeatured === 1) {
                  result = true;
                } else if (typeof isFeatured === 'string') {
                  const lowerStr = isFeatured.toLowerCase().trim();
                  result = (lowerStr === 'true' || lowerStr === '1');
                }

                // If isFeatured is false, undefined, null, or any other value, exclude it
                return result;
              });

              // Take first 8 featured products
              if (filteredFeatured.length > 0) {
                setTrendingProducts(filteredFeatured.slice(0, 8));
                setIsLoadingTrending(false);
                return;
              }
            } catch (parseError: any) {
              // Continue to fallback instead of throwing
            }
          } else {
            // Content-type is not JSON (likely PHP being served as static), skip and use fallback
          }
        }

        // Fallback to static imported products if API/JSON fails - ONLY show featured
        const fallbackProducts = products.filter(p => {
          const isFeatured = p.isFeatured;
          // Only return true if isFeatured is explicitly true/1/'true'/'1'
          // Handle runtime type checking (JSON might have string/number despite TypeScript type)
          const featuredValue: any = isFeatured;
          if (featuredValue === true) {
            return true;
          }
          if (typeof featuredValue === 'number' && featuredValue === 1) {
            return true;
          }
          if (typeof featuredValue === 'string') {
            const lowerStr = featuredValue.toLowerCase().trim();
            return lowerStr === 'true' || lowerStr === '1';
          }
          // Exclude if false, undefined, null, or any other value
          return false;
        }).slice(0, 8);

        setTrendingProducts(fallbackProducts);
      } catch (error) {
        console.error('Failed to fetch featured products from API:', error);
        // Fallback to static JSON on error - ONLY show featured
        const fallbackProducts = products.filter(p => {
          const isFeatured = p.isFeatured;
          // Only return true if isFeatured is explicitly true/1/'true'/'1'
          // Handle runtime type checking (JSON might have string/number despite TypeScript type)
          const featuredValue: any = isFeatured;
          if (featuredValue === true) {
            return true;
          }
          if (typeof featuredValue === 'number' && featuredValue === 1) {
            return true;
          }
          if (typeof featuredValue === 'string') {
            const lowerStr = featuredValue.toLowerCase().trim();
            return lowerStr === 'true' || lowerStr === '1';
          }
          // Exclude if false, undefined, null, or any other value
          return false;
        }).slice(0, 8);

        setTrendingProducts(fallbackProducts);
      } finally {
        setIsLoadingTrending(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Priority order: Production API → Local Dev API → Static JSON
        let response: Response | null = null;

        // 1. Try production API first (khadivasthra.com)
        const productionApiUrls = [
          'https://khadivasthra.com/api/categories.php?active=true',
          'https://khadivasthra.com/public/api/categories.php?active=true',
          'https://khadivasthra.com/admin/api/categories.php?active=true',
        ];

        for (const apiUrl of productionApiUrls) {
          try {
            response = await fetch(apiUrl, { mode: 'cors' });
            if (response.ok) break;
            else response = null;
          } catch (prodError) {
            response = null;
          }
        }

        // 2. If production API failed, try local dev API (port 8080)
        if (!response || !response.ok) {
          try {
            response = await fetch('http://localhost:8080/api/categories.php?active=true', {
              mode: 'cors',
            });
          } catch (apiError) {
            response = null;
          }
        }

        // 3. If both APIs failed, try static JSON
        if (!response || !response.ok) {
          response = await fetch('/data/categories.json');
        }

        if (response && response.ok) {
          const data = await response.json();
          const categoriesList = data.categories || (Array.isArray(data) ? data : []);
          // Sort by displayOrder and filter active
          const activeCategories = categoriesList
            .filter((cat: Category) => cat.isActive !== false)
            .sort((a: Category, b: Category) => (a.displayOrder || 999) - (b.displayOrder || 999));
          setCategories(activeCategories);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch and group products by category
  useEffect(() => {
    const fetchProductsByCategory = async () => {
      try {
        let allProducts: Product[] = [];
        let response: Response | null = null;

        // Priority order: Production API → Local Dev API → Static Products
        // 1. Try production API first (khadivasthra.com)
        const productionApiUrls = [
          'https://khadivasthra.com/api/products.php',
          'https://khadivasthra.com/public/api/products.php',
          'https://khadivasthra.com/admin/api/products.php',
        ];

        for (const apiUrl of productionApiUrls) {
          try {
            response = await fetch(apiUrl, { mode: 'cors' });
            if (response.ok) break;
            else response = null;
          } catch (prodError) {
            response = null;
          }
        }

        // 2. If production API failed, try local dev API (port 8080)
        if (!response || !response.ok) {
          try {
            response = await fetch('http://localhost:8080/api/products.php', {
              mode: 'cors',
            });
          } catch (apiError) {
            response = null;
          }
        }

        // 3. If API succeeded, parse products
        if (response && response.ok) {
          try {
            const data = await response.json();
            if (data.success && data.products && Array.isArray(data.products)) {
              allProducts = data.products;
            } else if (Array.isArray(data.products)) {
              allProducts = data.products;
            } else if (Array.isArray(data)) {
              allProducts = data;
            }
          } catch (parseError) {
            console.error('Failed to parse products API response:', parseError);
          }
        }

        // 4. If API didn't return products, use static
        if (allProducts.length === 0) {
          allProducts = products as Product[];
        }

        // Group products by category
        const grouped: Record<string, Product[]> = {};
        allProducts.forEach((product) => {
          const category = product.category || 'Other';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(product);
        });

        setProductsByCategory(grouped);
      } catch (error) {
        console.error('Failed to fetch products by category:', error);
        // Fallback: group static products
        const grouped: Record<string, Product[]> = {};
        products.forEach((product: any) => {
          const category = product.category || 'Other';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(product);
        });
        setProductsByCategory(grouped);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProductsByCategory();
  }, []);

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
      <section className="hero-section relative -mt-20 pt-32 pb-20 min-h-[calc(100vh+5rem)] flex items-center justify-center overflow-hidden">
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
            <Link href="/shop" className="hero-section__cta-primary">
              <Button size="lg" className="bg-orange hover:bg-orange-dark text-white font-bold min-w-[200px] h-14 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. TRENDING PRODUCTS - Cream bg, carousel */}
      <section className="trending-section bg-cream py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="trending-section__title text-3xl font-bold text-text font-serif text-center mb-8">
            Trending Products
          </h2>
          {isLoadingTrending ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          ) : trendingProducts.length > 0 ? (
            <div className="trending-section__carousel">
              <TrendingCarousel products={trendingProducts} />
            </div>
          ) : (
            <div className="text-center py-20 text-text-muted">
              <p>No featured products available at the moment.</p>
              <p className="text-sm mt-2">Mark products as featured in the admin dashboard to display them here.</p>
            </div>
          )}
        </div>
      </section>

      {/* 3. THREE BANNERS - White bg */}
      <section className="banners-section bg-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="banners-section__grid grid md:grid-cols-3 gap-6">
            <BannerCard
              title="Festival Collection"
              overlay="coral"
              image="/images/card covers/festival collection.png"
            />
            <BannerCard
              title="25% Off"
              overlay="orange"
              image="/images/card covers/offer.png"
            />
            <BannerCard
              title="New Arrivals"
              overlay="cream"
              image="/images/card covers/new-arrivals.png"
            />
          </div>
        </div>
      </section>

      {/* 4. SHOP BY CATEGORY - White bg, carousel */}
      <section className="categories-carousel-section bg-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="categories-carousel-section__title text-3xl font-bold text-text font-serif text-center mb-8">
            Shop by Category
          </h2>
          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          ) : categories.length > 0 ? (
            <CategoriesCarousel categories={categories} />
          ) : (
            <div className="text-center py-20 text-text-muted">
              <p>No categories available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. BEST SELLING - Cream bg, carousel */}
      <section className="bestselling-section bg-cream py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="bestselling-section__title text-3xl font-bold text-text font-serif text-center mb-8">
            Best Selling
          </h2>
          {bestSelling.length > 0 ? (
            <BestSellingCarousel products={bestSelling} />
          ) : (
            <div className="text-center py-20 text-text-muted">
              <p>No best selling products available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5.5. PRODUCTS BY CATEGORY - White bg, rows for each category (only categories with 5+ products) */}
      {isLoadingProducts ? (
        <section className="products-by-category-section bg-white py-20">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
            </div>
          </div>
        </section>
      ) : (
        Object.keys(productsByCategory).filter((categoryName) => productsByCategory[categoryName].length >= 5).length > 0 && (
          <section className="products-by-category-section bg-white py-12">
            <div className="container mx-auto px-4 max-w-7xl space-y-12">
              {Object.keys(productsByCategory)
                .filter((categoryName) => productsByCategory[categoryName].length >= 5)
                .sort((a, b) => {
                  // Sort by category displayOrder if available, otherwise alphabetically
                  const categoryA = categories.find((cat) => cat.name === a);
                  const categoryB = categories.find((cat) => cat.name === b);
                  const orderA = categoryA?.displayOrder ?? 999;
                  const orderB = categoryB?.displayOrder ?? 999;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.localeCompare(b);
                })
                .map((categoryName) => {
                  const categoryProducts = productsByCategory[categoryName].slice(0, 8);
                  // Try to find matching category from categories state, otherwise use category name
                  const matchedCategory = categories.find((cat) => cat.name === categoryName);
                  const categorySlug = matchedCategory?.slug || slugifyCategory(categoryName);
                  const displayName = matchedCategory?.name || categoryName;

                  return (
                    <div key={categoryName} className="category-products-row">
                      <div className="category-products-row__header flex items-center justify-between mb-6">
                        <h3 className="category-products-row__title text-2xl font-bold text-text font-serif">
                          {displayName}
                        </h3>
                        <Link
                          href={`/shop/${categorySlug}`}
                          className="category-products-row__view-all flex items-center gap-2 text-coral hover:text-coral-dark font-semibold transition-colors group"
                        >
                          View All
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                      <CategoryProductsCarousel products={categoryProducts} />
                    </div>
                  );
                })}
            </div>
          </section>
        )
      )}

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
      <section className="about-section bg-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="about-section__content grid md:grid-cols-2 gap-10 items-center">
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
            <div className="about-section__text space-y-4">
              <span className="about-section__badge inline-block px-4 py-2 bg-orange text-white text-sm font-semibold uppercase tracking-wider rounded-full">
                Since 1990
              </span>
              <h2 className="about-section__title text-3xl md:text-4xl font-bold text-text font-serif leading-tight">
                Preserving Kerala's Handloom Heritage
              </h2>
              <p className="about-section__description text-base text-text-muted leading-relaxed">
                Khadi Vasthra is more than just a store; it's a celebration of Kerala's rich textile heritage.
                Located in the heart of Aluva, we have been bridging the gap between traditional weavers and modern lifestyles since 1990.
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

// Banner Card Component
function BannerCard({ title, overlay, image }: { title: string; overlay: string; image: string }) {
  const overlayClass = overlay === "coral" ? "bg-coral/40" : overlay === "orange" ? "bg-orange/40" : "bg-cream/40";

  return (
    <div className="banner-card relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
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
        <div className="trending-carousel__container flex gap-6 items-stretch">
          {products.map((product) => (
            <div
              key={product.id}
              className="trending-carousel__slide flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0 h-auto"
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

// Best Selling Carousel Component
function BestSellingCarousel({ products }: { products: Array<{ id: string; name: string; price: number; image: string; category: string }> }) {
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
    <div className="bestselling-carousel relative">
      <div className="bestselling-carousel__viewport overflow-hidden" ref={emblaRef}>
        <div className="bestselling-carousel__container flex gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bestselling-carousel__slide flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] xl:flex-[0_0_calc(25%-18px)] min-w-0"
            >
              <ProductCard product={product} variant="white" />
            </div>
          ))}
        </div>
      </div>

      {products.length > 4 && (
        <div className="bestselling-carousel__navigation flex items-center justify-center gap-4 mt-8">
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

// Helper function to slugify category names (matches shop route)
function slugifyCategory(text: string) {
  return text.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
}

// Category Products Carousel Component - displays products for a single category in a row
function CategoryProductsCarousel({ products }: { products: Product[] }) {
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

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="category-products-carousel relative">
      <div className="category-products-carousel__viewport overflow-hidden" ref={emblaRef}>
        <div className="category-products-carousel__container flex gap-6 items-stretch">
          {products.map((product) => (
            <div
              key={product.id}
              className="category-products-carousel__slide flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(33.333%-16px)] lg:flex-[0_0_calc(25%-18px)] xl:flex-[0_0_calc(20%-19px)] min-w-0 h-auto"
            >
              <ProductCard product={product} variant="white" />
            </div>
          ))}
        </div>
      </div>

      {products.length > 4 && (
        <div className="category-products-carousel__navigation flex items-center justify-end gap-4 mt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="rounded-full w-10 h-10 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Previous products"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="rounded-full w-10 h-10 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Next products"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Categories Carousel Component
function CategoriesCarousel({ categories }: { categories: Category[] }) {
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
    <div className="categories-carousel relative">
      <div className="categories-carousel__viewport overflow-hidden" ref={emblaRef}>
        <div className="categories-carousel__container flex gap-6">
          {categories.map((category) => {
            // Use category slug if available, otherwise slugify the name
            const categorySlug = category.slug || slugifyCategory(category.name);
            return (
              <div
                key={category.id}
                className="categories-carousel__slide flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] md:flex-[0_0_calc(33.333%-16px)] lg:flex-[0_0_calc(25%-18px)] xl:flex-[0_0_calc(20%-19px)] min-w-0"
              >
                <Link
                  href={`/shop/${categorySlug}`}
                  className="category-card group aspect-[3/5] flex flex-col bg-cream/30 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="category-card__image-wrapper relative w-full flex-[1.5] min-h-[300px] overflow-hidden bg-white/50 flex-shrink-0">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        unoptimized
                        priority={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                        <ImageOff className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="category-card__content p-3 text-center flex-shrink-0 bg-cream/20 backdrop-blur-sm">
                    <h3 className="category-card__name text-base font-bold text-text font-serif mb-1 group-hover:text-coral transition-colors line-clamp-2 leading-tight">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="category-card__description text-xs text-text-muted line-clamp-1 leading-relaxed mt-0.5">
                        {category.description}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {categories.length > 4 && (
        <div className="categories-carousel__navigation flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Previous categories"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="rounded-full w-12 h-12 border-2 border-coral text-coral hover:bg-coral hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Next categories"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
