import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Code2,
  FileText,
  Globe,
  Grid,
  Heart,
  HelpCircle,
  Layers,
  Layout,
  List,
  Megaphone,
  Newspaper,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Video
} from 'lucide-react';
import type { Gig, Project, Review } from '../../types';
import { Avatar, GigImage } from '../ui';
import { RATINGS_ENABLED } from '../../constants';
import { AGENCY_MODE, SITE_CONFIG } from '../../siteConfig';
import HERO_SHOWCASE_IMG from '../../assets/images/hero_editorial_pr_showcase_1794840970197.webp';
import WHY_CHOOSE_US_IMG from '../../assets/images/why_choose_agency_studio_1794840972210.webp';
import WEB_DEV_SHOWCASE_IMG from '../../assets/images/web_dev_shopify_showcase_1794840973193.webp';

export interface AgencyHomePageProps {
  gigs: Gig[];
  projects?: Project[];
  reviews?: Review[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  likedGigIds: string[];
  handleToggleLike: (gigId: string, e: React.MouseEvent) => void;
  navigate: (path: string, e?: React.MouseEvent) => void;
  getGigUrl: (gig: Gig) => string;
  slugify: (name: string) => string;
  onSelectCategoryFilter?: (category: string) => void;
}

type PlacementFilterTab = 'all' | 'pr_seo' | 'ugc_ai' | 'development' | 'design_ai';

function cleanListingTitle(title: string): string {
  const trimmed = (title || '').trim();
  if (trimmed.toLowerCase().startsWith('i will ')) {
    const rest = trimmed.slice(7).trim();
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return trimmed;
}

export const AgencyHomePage: React.FC<AgencyHomePageProps> = React.memo(({
  gigs,
  reviews = [],
  searchQuery,
  setSearchQuery,
  likedGigIds,
  handleToggleLike,
  navigate,
  getGigUrl,
  slugify,
  onSelectCategoryFilter
}) => {
  const [activePlacementTab, setActivePlacementTab] = useState<PlacementFilterTab>('all');
  const [placementViewMode, setPlacementViewMode] = useState<'list' | 'grid'>('list');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [studioImgFailed, setStudioImgFailed] = useState(false);
  const [webDevImgFailed, setWebDevImgFailed] = useState(false);

  // Filter real marketplace gigs for Section 5 (Featured Media Placements & Agency Services)
  const featuredPlacements = useMemo(() => {
    const activeList = gigs.filter(g => !g.status || g.status === 'active');
    let filtered = [...activeList];

    if (activePlacementTab === 'pr_seo') {
      const matches = activeList.filter(g => {
        const hay = `${g.title} ${g.category} ${g.subcategory || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
        return (
          hay.includes('seo') ||
          hay.includes('backlink') ||
          hay.includes('marketing') ||
          hay.includes('guest') ||
          hay.includes('press') ||
          hay.includes('media') ||
          hay.includes('authority') ||
          hay.includes('pr')
        );
      });
      if (matches.length > 0) filtered = matches;
    } else if (activePlacementTab === 'ugc_ai') {
      const matches = activeList.filter(g => {
        const hay = `${g.title} ${g.category} ${g.subcategory || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
        return (
          hay.includes('ugc') ||
          hay.includes('video') ||
          hay.includes('tiktok') ||
          hay.includes('reels') ||
          hay.includes('avatar') ||
          hay.includes('ad')
        );
      });
      if (matches.length > 0) filtered = matches;
    } else if (activePlacementTab === 'development') {
      const matches = activeList.filter(g => {
        const hay = `${g.title} ${g.category} ${g.subcategory || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
        return (
          hay.includes('web') ||
          hay.includes('react') ||
          hay.includes('node') ||
          hay.includes('technology') ||
          hay.includes('programming') ||
          hay.includes('mobile') ||
          hay.includes('shopify') ||
          hay.includes('app')
        );
      });
      if (matches.length > 0) filtered = matches;
    } else if (activePlacementTab === 'design_ai') {
      const matches = activeList.filter(g => {
        const hay = `${g.title} ${g.category} ${g.subcategory || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
        return (
          hay.includes('design') ||
          hay.includes('brand') ||
          hay.includes('ui') ||
          hay.includes('ai') ||
          hay.includes('llm') ||
          hay.includes('agent') ||
          hay.includes('ugc')
        );
      });
      if (matches.length > 0) filtered = matches;
    }

    // Prioritize featured, Digital Marketing / PR / SEO, and UGC AI Video listings first when viewing 'all'
    return filtered.sort((a, b) => {
      const aIsMedia = /marketing|seo|backlink|press|pr|writing|ugc|video/i.test(`${a.category} ${a.title}`);
      const bIsMedia = /marketing|seo|backlink|press|pr|writing|ugc|video/i.test(`${b.category} ${b.title}`);
      if (activePlacementTab === 'all') {
        if (aIsMedia && !bIsMedia) return -1;
        if (!aIsMedia && bIsMedia) return 1;
      }
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });
  }, [gigs, activePlacementTab]);

  // Filter real marketplace listings for Section 9 (Digital Products, Scripts & Technical Assets)
  const digitalProductListings = useMemo(() => {
    const activeList = gigs.filter(g => !g.status || g.status === 'active');
    const techAndResourceMatches = activeList.filter(g => {
      const hay = `${g.title} ${g.category} ${g.subcategory || ''} ${g.description || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
      return (
        hay.includes('script') ||
        hay.includes('ebook') ||
        hay.includes('system') ||
        hay.includes('pipeline') ||
        hay.includes('template') ||
        hay.includes('figma') ||
        hay.includes('react') ||
        hay.includes('ai') ||
        hay.includes('architecture')
      );
    });
    return (techAndResourceMatches.length > 0 ? techAndResourceMatches : activeList).slice(0, 4);
  }, [gigs]);

  // Authentic reviews from database (if any exist)
  const authenticReviews = useMemo(() => {
    return reviews.filter(r => !r.isCancelledOrder && (r.comment || r.review) && r.rating >= 4).slice(0, 3);
  }, [reviews]);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/services');
  };

  const handleServiceNavigation = (path: string, categoryFilter?: string, e?: React.MouseEvent) => {
    if (categoryFilter && onSelectCategoryFilter) {
      onSelectCategoryFilter(categoryFilter);
    }
    navigate(path, e);
  };

  const scrollToPlacements = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof document !== 'undefined') {
      const el = document.getElementById('media-placements');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate('/services', e);
  };

  const coreServices = [
    {
      index: '01.',
      title: 'Guest Posting',
      categoryMeta: 'Editorial Outreach · Contextual Backlinks',
      description: 'Explore guest posting opportunities across relevant media websites to strengthen organic visibility and domain authority.',
      cta: 'Explore Guest Posting',
      path: '/categories/seo',
      icon: Newspaper,
      featuredSpan: true
    },
    {
      index: '02.',
      title: 'Press Release Distribution',
      categoryMeta: 'Corporate Announcements · Media Syndication',
      description: 'Share your business announcements, product launches, and milestones through available press release services.',
      cta: 'Explore Press Releases',
      path: '/categories/pr-press-releases',
      icon: Megaphone,
      featuredSpan: true
    },
    {
      index: '03.',
      title: 'Digital PR & Media Placement',
      categoryMeta: 'Brand Authority · Online Reputation',
      description: 'Discover curated media placement opportunities designed to support long-term brand credibility and executive positioning.',
      cta: 'Browse Media Placements',
      path: '/categories/digital-marketing',
      icon: Globe,
      featuredSpan: false
    },
    {
      index: '04.',
      title: 'UGC AI Video Creation',
      categoryMeta: 'AI Creators · Short-Form Video Ads',
      description: 'Launch scroll-stopping UGC AI video ads, realistic AI spokesperson commercials, and short-form social creatives for TikTok, Reels, and paid campaigns.',
      cta: 'Explore UGC AI Videos',
      path: '/categories/ugc-ai-videos',
      icon: Video,
      featuredSpan: false
    },
    {
      index: '05.',
      title: 'Custom Website Development',
      categoryMeta: 'Full-Stack Engineering · Web Architecture',
      description: 'Build a professional, high-converting website or custom web application tailored to your business objectives.',
      cta: 'Explore Web Development',
      path: '/categories/web-development',
      icon: Code2,
      featuredSpan: false
    },
    {
      index: '06.',
      title: 'Shopify Store Setup',
      categoryMeta: 'Ecommerce Engineering · Conversion Design',
      description: 'Launch or improve your online store with custom Shopify theme development, storefront setup, and checkout optimization.',
      cta: 'Explore Shopify Services',
      path: '/categories/ecommerce',
      icon: ShoppingBag,
      featuredSpan: false
    },
    {
      index: '07.',
      title: 'Ready-Made Website Scripts',
      categoryMeta: 'Production Codebases · Turnkey Platforms',
      description: 'Explore ready-made scripts, full-stack starter architectures, and deployable digital solutions for faster launches.',
      cta: 'Browse Website Scripts',
      path: '/categories/software-development',
      icon: Layers,
      featuredSpan: false
    },
    {
      index: '08.',
      title: 'Ebooks & Digital Products',
      categoryMeta: 'Design Systems · Playbooks & Frameworks',
      description: 'Access practical digital resources, UI design systems, and technical assets built for entrepreneurs and marketers.',
      cta: 'Explore Digital Products',
      path: '/categories/ai-services',
      icon: BookOpen,
      featuredSpan: false
    }
  ];

  const faqItems = [
    {
      question: 'What services does your agency offer?',
      answer:
        `${SITE_CONFIG.brandName} is an independent digital PR, media placement, and growth agency. Our primary focus is delivering curated guest posting, press release distribution, and digital PR placements on established media websites. Alongside media services, we provide UGC AI videos, custom website development, Shopify store setup, ready-made website scripts, and digital products.`
    },
    {
      question: 'How can I explore guest posting opportunities?',
      answer:
        'You can browse live guest posting and SEO link-building listings directly in our Featured Media Placements section or navigate to the Guest Posting category. Each listing displays the delivery timeframe, included scope, and transparent fixed pricing before you order.'
    },
    {
      question: 'How do press release services work?',
      answer:
        'Select a press release or digital PR service listing that matches your campaign goals, or submit a custom project brief. Once your order is confirmed, you can share your announcement draft, brand guidelines, and target URLs directly inside a private order workspace.'
    },
    {
      question: 'Can I order a custom website?',
      answer:
        'Yes. You can either purchase a fixed-price web development package from our engineering team or click "Get a Custom Quote" to submit a custom project specification with your exact tech stack, timeline, and budget range.'
    },
    {
      question: 'Do you offer Shopify store development?',
      answer:
        'Yes. Our ecommerce specialists handle complete Shopify store setups, custom storefront design, catalog configuration, and performance optimization. You can browse available development services or submit a custom ecommerce brief.'
    },
    {
      question: 'How do I purchase a media placement?',
      answer:
        'Click "View Placement" on any service listing to review the complete deliverable breakdown and optional add-ons. Complete secure online checkout and track every update, invoice, and deliverable directly inside your private order workspace.'
    },
    {
      question: 'Can I request a custom service?',
      answer:
        'Absolutely. If your campaign requires a tailored multi-placement media package, bespoke software architecture, or custom deliverables, use the "Get a Custom Quote" button to submit a custom project request or open a direct inquiry with a specialist.'
    },
    {
      question: 'How can I contact your team?',
      answer:
        'You can reach our support desk at any time via the Contact link in the navigation bar or footer. For order-specific questions, every active order and inquiry includes a dedicated real-time Workstream with file sharing and direct messaging.'
    }
  ];

  return (
    <div className="w-full bg-slate-50 text-slate-900 font-sans selection:bg-emerald-600 selection:text-white">
      {/* ===================================================================== */}
      {/* SECTION 2 — HERO SECTION (LIGHT THEME BANNER)                         */}
      {/* ===================================================================== */}
      <section className="relative bg-gradient-to-b from-white via-orange-50/20 to-slate-100/50 text-slate-900 border-b border-slate-200/80 overflow-hidden">
        {/* Subtle warm orange & emerald radial wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50/75 via-orange-50/40 to-transparent"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-stretch">
            {/* Left Column: Core Agency Value Proposition & CTAs */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 tracking-wide">
                  <span>Digital PR &amp; Media Placement Agency</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-orange-600 font-semibold">Direct Agency Fulfillment</span>
                </div>

                <h1
                  className="font-extrabold tracking-tight text-slate-900 leading-[1.08] text-balance"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)' }}
                >
                  Get Your Brand Featured. Build Authority.{' '}
                  <span className="font-serif italic font-normal text-emerald-700">
                    Grow Your{' '}
                  </span>
                  <span className="font-serif italic font-normal text-orange-600">
                    Digital Presence.
                  </span>
                </h1>

                <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
                  Discover premium guest posting and press release opportunities on established media websites. From digital PR and brand visibility to custom websites and Shopify development, we help businesses build a stronger online presence.
                </p>
              </div>

              <div className="space-y-6">
                {/* Primary & Secondary CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <a
                    href="#media-placements"
                    onClick={scrollToPlacements}
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all duration-150 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Explore Media Placements</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/post-project"
                    onClick={(e) => navigate('/post-project', e)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-xs transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Get a Custom Quote</span>
                  </a>
                </div>

                {/* Direct Marketplace Search Bar */}
                <form
                  onSubmit={handleHeroSearchSubmit}
                  className="flex items-center bg-white border border-slate-200/90 shadow-xs focus-within:border-orange-500/60 focus-within:ring-4 focus-within:ring-orange-500/10 rounded-xl p-1.5 max-w-xl transition-all"
                >
                  <Search className="w-4 h-4 text-orange-500 ml-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search guest posts, press releases, Shopify, React..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Search Catalog
                  </button>
                </form>

                {/* Quiet Unboxed Quick Links */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                  <span className="text-slate-400">Popular solutions:</span>
                  <a
                    href="/categories/seo"
                    onClick={(e) => handleServiceNavigation('/categories/seo', 'Digital Marketing', e)}
                    className="text-slate-700 hover:text-emerald-700 font-medium transition-colors underline-offset-4 hover:underline whitespace-nowrap"
                  >
                    High-Authority Guest Posts
                  </a>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <a
                    href="/categories/pr-press-releases"
                    onClick={(e) => handleServiceNavigation('/categories/pr-press-releases', 'Digital Marketing', e)}
                    className="text-slate-700 hover:text-emerald-700 font-medium transition-colors underline-offset-4 hover:underline whitespace-nowrap"
                  >
                    Press Release Distribution
                  </a>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <a
                    href="/categories/ugc-ai-videos"
                    onClick={(e) => handleServiceNavigation('/categories/ugc-ai-videos', 'UGC AI Videos', e)}
                    className="text-orange-600 hover:text-orange-700 font-semibold transition-colors underline-offset-4 hover:underline whitespace-nowrap"
                  >
                    UGC AI Video Ads
                  </a>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <a
                    href="/categories/web-development"
                    onClick={(e) => handleServiceNavigation('/categories/web-development', 'Technology & Programming', e)}
                    className="text-slate-700 hover:text-emerald-700 font-medium transition-colors underline-offset-4 hover:underline whitespace-nowrap"
                  >
                    Custom Web Engineering
                  </a>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <a
                    href="/categories/ecommerce"
                    onClick={(e) => handleServiceNavigation('/categories/ecommerce', 'Technology & Programming', e)}
                    className="text-slate-700 hover:text-emerald-700 font-medium transition-colors underline-offset-4 hover:underline whitespace-nowrap"
                  >
                    Shopify Store Setup
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Light-Mode Editorial & Media Interface Composition */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div className="h-full rounded-2xl border border-slate-200/90 bg-white shadow-xs p-3.5 sm:p-4 flex flex-col justify-between space-y-3.5">
                {/* Editorial Showcase Frame */}
                <div className="relative aspect-[16/10] w-full rounded-xl border border-slate-200/70 bg-slate-100 overflow-hidden">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_SHOWCASE_IMG}
                      alt="Editorial media placement and press release distribution desk"
                      referrerPolicy="no-referrer"
                      fetchPriority="high"
                      decoding="async"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 via-white to-emerald-50 flex items-center justify-center p-8">
                      <Newspaper className="w-16 h-16 text-emerald-600/30" />
                    </div>
                  )}
                </div>

                {/* Structured Editorial Architecture Details (Light Mode) */}
                <div className="space-y-3">
                  <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Editorial Placement Workflow</span>
                      <span className="font-mono font-semibold text-emerald-700">Secure Payment</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-snug">
                      Direct Media Outreach, Press Distribution &amp; Full-Stack Digital Execution
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                      <span>Curated Agency Services</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>Real-Time Order Workstream</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-3.5">
                      <div className="text-xs text-emerald-700 font-medium mb-0.5">Primary Focus</div>
                      <div className="text-sm font-bold text-slate-900">Guest Posts &amp; PR</div>
                      <div className="text-xs text-slate-500 mt-0.5">Editorial media visibility</div>
                    </div>
                    <div className="bg-orange-50/50 border border-orange-200/70 rounded-xl p-3.5">
                      <div className="text-xs text-orange-700 font-medium mb-0.5">Digital &amp; Video</div>
                      <div className="text-sm font-bold text-slate-900">Web, Shopify &amp; UGC</div>
                      <div className="text-xs text-slate-500 mt-0.5">Custom sites, AI ads &amp; scripts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3 — TRUST / VALUE PROPOSITION STRIP                           */}
      {/* ===================================================================== */}
      <section className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Newspaper className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Curated Media Opportunities</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Access guest posting and editorial placement services in one catalog.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Transparent Service Listings</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Review clear deliverables, turnaround windows, and USD pricing upfront.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Multiple Digital Growth Solutions</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Combine media placements with custom web and Shopify development.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Easy Ordering Process</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Secure online checkout with real-time order workspace tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Dedicated Customer Support</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Direct communication channels and support assistance for every order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 4 — CORE SERVICES                                             */}
      {/* ===================================================================== */}
      <section id="core-services" className="cv-auto py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold text-emerald-700 mb-2">
              Agency Capabilities &amp; Service Catalog
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
              Everything You Need to Grow Your Digital Presence
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md leading-relaxed">
            From editorial authority and brand mentions to full-stack web engineering and ready-to-launch digital assets.
          </p>
        </div>

        {/* Top Row: 2 Primary Marquee Services (Guest Posting & Press Release Distribution) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {coreServices.slice(0, 2).map((service, idx) => {
            const IconComponent = service.icon;
            const isOrangeAccent = idx === 1;
            return (
              <div
                key={service.index}
                onClick={(e) => navigate(service.path, e)}
                className={`bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-8 flex flex-col justify-between transition-all duration-150 group cursor-pointer ${
                  isOrangeAccent ? 'hover:border-orange-300' : 'hover:border-emerald-300'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      <span className={isOrangeAccent ? 'text-orange-600' : 'text-emerald-600'}>{service.index}</span> {service.categoryMeta}
                    </span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isOrangeAccent
                        ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'
                        : 'bg-slate-900 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className={`text-xl sm:text-2xl font-bold text-slate-900 transition-colors ${
                    isOrangeAccent ? 'group-hover:text-orange-600' : 'group-hover:text-emerald-700'
                  }`}>
                    {service.title}
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Primary Agency Service</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 transition-colors whitespace-nowrap ${
                    isOrangeAccent ? 'group-hover:text-orange-600' : 'group-hover:text-emerald-700'
                  }`}>
                    <span>{service.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Second Row: Complementary PR, UGC AI Videos, Web, Shopify & Digital Product Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreServices.slice(2).map((service, idx) => {
            const IconComponent = service.icon;
            const isWideCard = idx === 4;
            const isOrangeCard = idx % 2 === 1;
            return (
              <div
                key={service.index}
                onClick={(e) => navigate(service.path, e)}
                className={`bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 flex flex-col justify-between transition-all duration-150 group cursor-pointer ${
                  isOrangeCard ? 'hover:border-orange-300' : 'hover:border-emerald-300'
                } ${
                  isWideCard ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">
                      <span className={`font-semibold ${isOrangeCard ? 'text-orange-600' : 'text-emerald-600'}`}>{service.index}</span> {service.categoryMeta}
                    </span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isOrangeCard
                        ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'
                        : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className={`text-lg font-bold text-slate-900 transition-colors ${
                    isOrangeCard ? 'group-hover:text-orange-600' : 'group-hover:text-emerald-700'
                  }`}>
                    {service.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 transition-colors whitespace-nowrap ${
                    isOrangeCard ? 'group-hover:text-orange-600' : 'group-hover:text-emerald-700'
                  }`}>
                    <span>{service.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 5 — FEATURED MEDIA PLACEMENTS                                 */}
      {/* ===================================================================== */}
      <section id="media-placements" className="cv-auto py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <div className="text-xs font-semibold text-emerald-700 mb-2">
                Available Agency Services
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
                Explore Media Opportunities
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
                Find relevant media placement opportunities and digital growth services for your next campaign.
              </p>
            </div>

            {/* Interactive Segmented Filter Tabs & Listicle/Grid Toggle */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 overflow-x-auto scrollbar-none">
                {[
                  { id: 'all', label: 'All Listings' },
                  { id: 'pr_seo', label: 'Guest Posting & SEO' },
                  { id: 'ugc_ai', label: 'UGC AI Videos' },
                  { id: 'development', label: 'Web & Ecommerce' },
                  { id: 'design_ai', label: 'Brand & AI Solutions' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivePlacementTab(tab.id as PlacementFilterTab)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activePlacementTab === tab.id
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setPlacementViewMode('list')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    placementViewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Listicle View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlacementViewMode('grid')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    placementViewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Real Marketplace Listings (Default: Listicle View) */}
          {featuredPlacements.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center max-w-lg mx-auto space-y-4">
              <Newspaper className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Loading Media Placements</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Explore our full catalog of media placements, guest posting opportunities, and digital services.
              </p>
              <button
                type="button"
                onClick={(e) => navigate('/services', e)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Browse All Media Placements
              </button>
            </div>
          ) : placementViewMode === 'list' ? (
            <div className="space-y-4">
              {featuredPlacements.slice(0, 6).map((gig) => {
                const gigUrl = getGigUrl(gig);
                const isLiked = likedGigIds.includes(gig.id);
                const serviceType = gig.subcategory || gig.category || 'Media Placement';

                return (
                  <article
                    key={gig.id}
                    onClick={(e) => navigate(gigUrl, e)}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 hover:shadow-md transition-all duration-150 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 group cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full md:w-auto flex-1 min-w-0">
                      <div className="relative w-full sm:w-52 aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <GigImage
                          src={gig.image}
                          title={gig.title}
                          category={gig.category}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(gig.id, e)}
                          className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                            isLiked
                              ? 'bg-white text-red-500'
                              : 'bg-slate-950/60 hover:bg-white text-white hover:text-red-500 backdrop-blur-xs'
                          }`}
                          title={isLiked ? 'Remove from Saved' : 'Save Placement'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </div>

                      <div className="space-y-2 flex-1 min-w-0 w-full">
                        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-emerald-700">{gig.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{serviceType}</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{SITE_CONFIG.brandName}</span>
                            <span className="text-slate-400">(Agency Team)</span>
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 sm:line-clamp-1 leading-snug">
                          {cleanListingTitle(gig.title)}
                        </h3>

                        {gig.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed max-w-3xl">
                            {gig.description}
                          </p>
                        )}

                        <div className="pt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
                          {RATINGS_ENABLED && (
                            <>
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span>{(gig.rating || 5.0).toFixed(1)}</span>
                                <span className="text-slate-400 font-normal">({gig.reviewsCount || 0})</span>
                              </span>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                            </>
                          )}
                          <span className="inline-flex items-center gap-1 text-slate-600 font-sans">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="tabular-nums">{gig.deliveryDays || 3}d turnaround</span>
                          </span>
                          {gig.tags && gig.tags.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="font-sans text-slate-500 truncate max-w-[220px]">
                                {gig.tags.slice(0, 3).join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 gap-3 shrink-0">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Starting at</span>
                        <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
                          ${gig.price}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-4 py-2.5 bg-slate-900 group-hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
                        <span>View Placement</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPlacements.slice(0, 6).map((gig) => {
                const gigUrl = getGigUrl(gig);
                const isLiked = likedGigIds.includes(gig.id);
                const serviceType = gig.subcategory || gig.category || 'Media Placement';

                return (
                  <article
                    key={gig.id}
                    onClick={(e) => navigate(gigUrl, e)}
                    className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden hover:border-slate-300 transition-all duration-150 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Thumbnail Container */}
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                        <GigImage
                          src={gig.image}
                          title={gig.title}
                          category={gig.category}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(gig.id, e)}
                          className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                            isLiked
                              ? 'bg-white text-red-500'
                              : 'bg-slate-950/60 hover:bg-white text-white hover:text-red-500 backdrop-blur-xs'
                          }`}
                          title={isLiked ? 'Remove from Saved' : 'Save Placement'}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 space-y-3.5">
                        {/* Unboxed Category & Service Type Metadata */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                          <span className="font-medium text-emerald-700 truncate">{gig.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{serviceType}</span>
                        </div>

                        {/* Listing Headline */}
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                          {cleanListingTitle(gig.title)}
                        </h3>

                        {/* Short Real Description */}
                        {gig.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {gig.description}
                          </p>
                        )}

                        {/* Stored Database Metrics Row (Rating, Reviews, Delivery Turnaround) */}
                        <div className="pt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
                          {RATINGS_ENABLED && (
                            <>
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span>{(gig.rating || 5.0).toFixed(1)}</span>
                                <span className="text-slate-400 font-normal">({gig.reviewsCount || 0})</span>
                              </span>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                            </>
                          )}
                          <span className="inline-flex items-center gap-1 text-slate-600 font-sans">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="tabular-nums">{gig.deliveryDays || 3}d turnaround</span>
                          </span>
                          {gig.tags && gig.tags.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="font-sans text-slate-500 truncate max-w-[140px]">
                                {gig.tags.slice(0, 2).join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Provider, Real Database Price & CTA */}
                    <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {SITE_CONFIG.brandName}
                          </span>
                          <span className="text-xs text-slate-500 block truncate">
                            Agency Team
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block leading-none">Price</span>
                          <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                            ${gig.price}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 group-hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
                          <span>View Placement</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Section Bottom CTA */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-600">
              Showing live services from our catalog. Every order includes secure online payment and direct team support.
            </p>
            <a
              href="/services"
              onClick={(e) => navigate('/services', e)}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Browse All Media Placements</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 6 — WHY CHOOSE US                                             */}
      {/* ===================================================================== */}
      <section className="cv-auto py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Column: Agency Value Proposition & Benefits */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <div className="text-xs font-semibold text-emerald-700">
                Why Choose {SITE_CONFIG.brandName}
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
                Your Digital Growth Partner
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                We combine the strategic focus of an international digital PR agency with transparent upfront pricing, secure online checkout, and dedicated delivery management.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  num: '01.',
                  title: 'Multiple Digital Services Under One Roof',
                  desc: 'Coordinate guest posts, press release distribution, custom web applications, and Shopify builds with one accountable agency team.'
                },
                {
                  num: '02.',
                  title: 'Transparent Media Placement Options',
                  desc: 'Inspect service scope, turnaround times, and exact pricing before funding an order—no hidden retainer fees.'
                },
                {
                  num: '03.',
                  title: 'Flexible Solutions for Businesses and Agencies',
                  desc: 'Order individual placements on demand or submit custom project briefs for multi-site campaigns and agency white-label execution.'
                },
                {
                  num: '04.',
                  title: 'Streamlined Ordering Experience',
                  desc: 'Every purchase opens a dedicated Workstream for sharing editorial guidelines, anchor text, files, and milestone approvals.'
                },
                {
                  num: '05.',
                  title: 'Professional Website and Ecommerce Solutions',
                  desc: 'Pair your brand authority campaigns with high-converting web architecture and Shopify storefronts built by vetted engineers.'
                }
              ].map((benefit) => (
                <div key={benefit.num} className="flex items-start gap-4">
                  <span className="text-xs font-mono font-bold text-emerald-700 mt-1 shrink-0">
                    {benefit.num}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{benefit.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="/post-project"
                onClick={(e) => navigate('/post-project', e)}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Submit a Campaign Brief</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/support"
                onClick={(e) => navigate('/support', e)}
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Speak With Support</span>
              </a>
            </div>
          </div>

          {/* Right Column: Editorial Studio Visual & Escrow Workflow Card */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="relative h-full min-h-[420px] rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 flex flex-col justify-end">
              {!studioImgFailed ? (
                <img
                  src={WHY_CHOOSE_US_IMG}
                  alt={`${SITE_CONFIG.brandName} digital agency strategy and editorial team workspace`}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onError={() => setStudioImgFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                  <Globe className="w-16 h-16 text-emerald-400/30" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />

              <div className="relative z-10 p-6 sm:p-8 space-y-4 text-white">
                <div className="text-xs font-medium text-emerald-400">
                  Built for Global Brands, Startups &amp; SEO Agencies
                </div>
                <blockquote className="text-lg sm:text-xl font-serif italic text-slate-100 leading-snug">
                  “Structured editorial placements, transparent deliverables, and milestone-tracked execution inside a single collaborative workspace.”
                </blockquote>
                <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
                  <span>Secure Online Payments</span>
                  <span aria-hidden="true">·</span>
                  <span>Direct Team Collaboration</span>
                  <span aria-hidden="true">·</span>
                  <span>Verified Deliverables</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 7 — HOW IT WORKS                                              */}
      {/* ===================================================================== */}
      <section className="cv-auto py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-semibold text-emerald-700 mb-2">
              Platform Workflow
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
              Simple. Transparent. Efficient.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              How campaigns, media placements, and development projects move from discovery to completion.
            </p>
          </div>

          {/* Horizontal Timeline on Desktop / Vertical Timeline on Mobile */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Desktop Horizontal Connecting Line */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-6 left-[16%] right-[16%] h-px bg-slate-200 pointer-events-none"
            />

            {[
              {
                step: '01',
                title: 'Explore Services',
                description:
                  'Browse media placements, PR services, development solutions, and digital products across our verified catalog.',
                actionLabel: 'Browse Catalog',
                actionPath: '/services'
              },
              {
                step: '02',
                title: 'Choose Your Solution',
                description:
                  'Select a relevant media placement with fixed pricing or submit a custom project inquiry tailored to your campaign.',
                actionLabel: 'Request Custom Quote',
                actionPath: '/post-project'
              },
              {
                step: '03',
                title: 'Place Your Order',
                description:
                  'Complete secure online checkout and collaborate directly with our team inside your real-time order workspace.',
                actionLabel: 'Open Workstreams',
                actionPath: '/workstream'
              }
            ].map((item, idx) => {
              const isMiddleStep = idx === 1;
              return (
              <div
                key={item.step}
                className="relative bg-slate-50 rounded-2xl border border-slate-200/90 p-7 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`w-11 h-11 rounded-xl font-mono text-sm font-bold flex items-center justify-center relative z-10 ${
                      isMiddleStep
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-900 text-emerald-400'
                    }`}>
                      {item.step}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      Step {item.step} of 03
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-200/70">
                  <a
                    href={item.actionPath}
                    onClick={(e) => navigate(item.actionPath, e)}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 transition-colors ${
                      isMiddleStep ? 'hover:text-orange-600' : 'hover:text-emerald-700'
                    }`}
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 8 — WEB DEVELOPMENT & SHOPIFY FEATURE (LIGHT THEME)           */}
      {/* ===================================================================== */}
      <section className="cv-auto py-16 sm:py-24 bg-slate-50 text-slate-900 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            {/* Left Column: Web Development & Ecommerce Narrative */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <span>Engineering &amp; Ecommerce Division</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-600 font-medium">Custom Builds &amp; Turnkey Code</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
                  Need More Than Media Exposure?
                </h2>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  From business websites to ecommerce stores and custom digital platforms, turn your ideas into professional online experiences. Ensure the traffic generated by your PR campaigns lands on a fast, conversion-engineered destination.
                </p>
              </div>

              {/* 4 Development Capabilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Custom Website Development',
                    desc: 'Full-stack React, Node.js, and modern corporate web applications.',
                    path: '/categories/web-development',
                    icon: Code2
                  },
                  {
                    title: 'Shopify Store Setup',
                    desc: 'High-converting storefront design, catalog setup, and checkout flows.',
                    path: '/categories/ecommerce',
                    icon: ShoppingBag
                  },
                  {
                    title: 'Website Redesign',
                    desc: 'Modern UI/UX overhauls, Figma design systems, and responsive polish.',
                    path: '/categories/design',
                    icon: Layout
                  },
                  {
                    title: 'Ready-Made Scripts',
                    desc: 'Deployable web scripts, SaaS starters, and automation workflows.',
                    path: '/categories/software-development',
                    icon: Layers
                  }
                ].map((cap) => {
                  const CapIcon = cap.icon;
                  return (
                    <div
                      key={cap.title}
                      onClick={(e) => navigate(cap.path, e)}
                      className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 rounded-xl p-5 transition-colors cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <CapIcon className="w-4 h-4 text-emerald-600" />
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {cap.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{cap.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="/categories/technology-programming"
                  onClick={(e) => navigate('/categories/technology-programming', e)}
                  className="inline-flex items-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <span>Explore Development Services</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="/post-project"
                  onClick={(e) => navigate('/post-project', e)}
                  className="inline-flex items-center gap-2 px-5 py-4 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300/90 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Request Custom Development</span>
                </a>
              </div>
            </div>

            {/* Right Column: Light-Mode Browser & Architecture Interface Preview */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div className="h-full min-h-[380px] rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col">
                {/* Sleek Light Browser Window Top Chrome */}
                <div className="px-4 py-3 bg-slate-100/90 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="font-mono text-xs text-slate-600 truncate">
                    {SITE_CONFIG.domain} / engineering-and-shopify
                  </span>
                  <span className="text-xs text-emerald-700 font-mono font-semibold">Production Ready</span>
                </div>

                <div className="relative flex-1 min-h-[320px] bg-slate-50">
                  {!webDevImgFailed ? (
                    <img
                      src={WEB_DEV_SHOWCASE_IMG}
                      alt="Custom web application and Shopify ecommerce storefront preview"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={() => setWebDevImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-12 bg-gradient-to-br from-slate-50 to-emerald-50/50">
                      <Code2 className="w-16 h-16 text-emerald-600/30" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 9 — DIGITAL PRODUCTS                                          */}
      {/* ===================================================================== */}
      <section id="digital-products" className="cv-auto py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="text-xs font-semibold text-orange-600 mb-2">
              Digital Assets, Scripts &amp; Systems
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
              Resources for Builders, Marketers &amp; Entrepreneurs
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">
              Explore ready-made digital solutions, design systems, AI workflows, and technical implementations built by our team.
            </p>
          </div>
          <a
            href="/services"
            onClick={(e) => navigate('/services', e)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Explore Digital Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {digitalProductListings.map((item) => {
            const itemUrl = getGigUrl(item);
            return (
              <div
                key={item.id}
                onClick={(e) => navigate(itemUrl, e)}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden hover:border-orange-300 transition-all duration-150 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <GigImage
                      src={item.image}
                      title={item.title}
                      category={item.category}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-5 space-y-2.5">
                    <div className="text-xs text-slate-500 truncate">
                      <span className="text-orange-600 font-semibold">{item.category}</span>
                      {item.subcategory && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{item.subcategory}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                      {cleanListingTitle(item.title)}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block leading-none">Price</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                      ${item.price}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors whitespace-nowrap">
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 10 — TESTIMONIALS OR SERVICE TRANSPARENCY & ESCROW TRUST      */}
      {/* ===================================================================== */}
      <section className="cv-auto py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold text-emerald-700 mb-2">
              {RATINGS_ENABLED && authenticReviews.length > 0 ? 'Verified Client Feedback & Order Protection' : 'Order Transparency & Client Protection'}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
              {RATINGS_ENABLED && authenticReviews.length > 0
                ? 'Verified Client Reviews & Delivery Standards'
                : 'Built on Service Transparency, Secure Payments & Direct Support'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Every media placement, guest post, and development order follows a structured delivery and review workflow designed to keep your campaign transparent and on schedule.
            </p>
          </div>

          {RATINGS_ENABLED && authenticReviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {authenticReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-slate-50 rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-900">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{Number(rev.rating).toFixed(1)}</span>
                      {rev.orderTitle && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-sans font-normal text-slate-500 truncate">
                            {rev.orderTitle}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      “{rev.comment || rev.review}”
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-slate-900">
                      {rev.reviewerName || rev.buyerName || rev.userName || 'Verified Client'}
                    </span>
                    <span>Verified Order</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Service Transparency, Ordering Process & Customer Support Architecture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-7 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Secure &amp; Structured Ordering Process
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When you order a guest post, press release, or web development package, your payment is processed securely with itemized invoices and clear milestone tracking through final delivery.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Protected milestone &amp; order funding</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Structured delivery inspection window</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-7 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Complete Service Transparency
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every listing clearly states its category, turnaround days, base price, and optional extras upfront. Track every file, message, and revision inside a unified order Workstream.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Upfront USD pricing &amp; fee breakdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Timestamped deliverable version history</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-7 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Dedicated Customer Support
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Need help selecting the right media placement or coordinating a custom technical build? Our support team and dispute resolution specialists are accessible directly from your account.
              </p>
              <div className="pt-2">
                <a
                  href="/support"
                  onClick={(e) => navigate('/support', e)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <span>Open Customer Support Desk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 11 — FAQ ACCORDION                                            */}
      {/* ===================================================================== */}
      <section id="faq" className="cv-auto py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-emerald-700 mb-2">
            Frequently Asked Questions
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
            Everything You Need to Know Before Ordering
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Clear answers about media placements, custom development, and how our ordering and delivery workflow operates.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={item.question}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 12 — FINAL CTA (LIGHT THEME BANNER)                           */}
      {/* ===================================================================== */}
      <section className="cv-auto py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-emerald-50/50 via-white to-orange-50/50 text-slate-900 border border-orange-200/60 shadow-xs p-8 sm:p-14 lg:p-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="text-xs font-semibold text-orange-600">
              Start Your Next Campaign With {SITE_CONFIG.brandName}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 text-balance">
              Ready to Put Your Brand in the Spotlight?
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Explore media opportunities, discover digital growth solutions, or tell us about your next project.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <a
                href="/services"
                onClick={(e) => navigate('/services', e)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Explore Media Placements</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/post-project"
                onClick={(e) => navigate('/post-project', e)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Start Your Project</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
});
AgencyHomePage.displayName = 'AgencyHomePage';
