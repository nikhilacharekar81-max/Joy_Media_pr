import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Grid, 
  List, 
  Briefcase, 
  Star, 
  Heart,
  Clock,
  Send,
  Flame,
  Sparkles,
  DollarSign,
  Check,
  SlidersHorizontal,
  ArrowUpDown,
  Zap
} from 'lucide-react';
import { Gig, Project, Review } from '../../types';
import { DEFAULT_AVATAR, DEFAULT_GIG_IMAGE, RATINGS_ENABLED } from '../../constants';
import { Avatar, GigImage } from '../../components/ui';
import { AgencyHomePage } from './AgencyHomePage';
import { AGENCY_MODE, SITE_CONFIG } from '../../siteConfig';

interface MarketplaceGigsViewProps {
  filteredGigs: Gig[];
  allGigs?: Gig[];
  projects?: Project[];
  reviews?: Review[];
  currentCategory: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (d: string | null) => void;
  serviceOptionFilter: string;
  setServiceOptionFilter: (f: string) => void;
  sellerLevelFilter: string;
  setSellerLevelFilter: (f: string) => void;
  budgetFilter: string;
  setBudgetFilter: (f: string) => void;
  deliveryTimeFilter: number | null;
  setDeliveryTimeFilter: (d: number | null) => void;
  onlineNowOnly: boolean;
  setOnlineNowOnly: (b: boolean) => void;
  gigViewMode: 'grid' | 'list';
  setGigViewMode: (m: 'grid' | 'list') => void;
  likedGigIds: string[];
  handleToggleLike: (gigId: string, e: React.MouseEvent) => void;
  navigate: (path: string, e?: React.MouseEvent) => void;
  getGigUrl: (gig: Gig) => string;
  currentUser: any;
  setIsSignupModalOpen: (b: boolean) => void;
  slugify: (name: string) => string;
  CATEGORY_SLUGS: Record<string, string>;
  isHomePage?: boolean;
}

type SortOption = 'recommended' | 'bestselling' | 'rating' | 'price_asc' | 'price_desc' | 'newest';

function formatServiceTitle(title: string): string {
  const trimmed = title.trim();
  const stripped = trimmed.replace(/^i\s+will\s+/i, '').trim();
  if (!stripped) return trimmed;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function formatReviewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

export const MarketplaceGigsView: React.FC<MarketplaceGigsViewProps> = ({
  filteredGigs,
  allGigs,
  projects = [],
  reviews = [],
  currentCategory,
  searchQuery,
  setSearchQuery,
  activeDropdown,
  setActiveDropdown,
  serviceOptionFilter,
  setServiceOptionFilter,
  sellerLevelFilter,
  setSellerLevelFilter,
  budgetFilter,
  setBudgetFilter,
  deliveryTimeFilter,
  setDeliveryTimeFilter,
  onlineNowOnly,
  setOnlineNowOnly,
  gigViewMode,
  setGigViewMode,
  likedGigIds,
  handleToggleLike,
  navigate,
  getGigUrl,
  currentUser,
  setIsSignupModalOpen,
  slugify,
  CATEGORY_SLUGS,
  isHomePage = false
}) => {
  // Sort State
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Custom budget inputs
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');

  // Per-gig carousel index state
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  const handleNextSlide = (gigId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndices(prev => ({
      ...prev,
      [gigId]: ((prev[gigId] || 0) + 1) % 3
    }));
  };

  const handlePrevSlide = (gigId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndices(prev => ({
      ...prev,
      [gigId]: ((prev[gigId] || 0) - 1 + 3) % 3
    }));
  };

  // Filter & Sort Logic
  const sortedAndFilteredGigs = useMemo(() => {
    let list = [...filteredGigs];

    // Custom budget range if set
    if (budgetFilter.startsWith('custom:')) {
      const parts = budgetFilter.replace('custom:', '').split('-');
      const min = parseFloat(parts[0]) || 0;
      const max = parseFloat(parts[1]) || Infinity;
      list = list.filter(g => g.price >= min && g.price <= max);
    }

    // Sort order
    switch (sortBy) {
      case 'bestselling':
        list.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        break;
      case 'recommended':
      default:
        list.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.rating * (b.reviewsCount || 1)) - (a.rating * (a.reviewsCount || 1));
        });
        break;
    }

    return list;
  }, [filteredGigs, budgetFilter, sortBy]);

  const sortLabels: Record<SortOption, string> = {
    recommended: 'Recommended',
    bestselling: 'Best Selling',
    rating: 'Top Rated',
    price_asc: 'Price: Low to High',
    price_desc: 'Price: High to Low',
    newest: 'Newest Arrivals'
  };

  const handleApplyCustomBudget = () => {
    const min = parseFloat(customMin) || 0;
    const max = parseFloat(customMax) || 0;
    if (max > 0 && max >= min) {
      setBudgetFilter(`custom:${min}-${max}`);
    } else if (min > 0) {
      setBudgetFilter(`custom:${min}-999999`);
    } else {
      setBudgetFilter('All');
    }
    setActiveDropdown(null);
  };

  if (isHomePage) {
    return (
      <AgencyHomePage
        gigs={allGigs && allGigs.length > 0 ? allGigs : filteredGigs}
        projects={projects}
        reviews={reviews}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        likedGigIds={likedGigIds}
        handleToggleLike={handleToggleLike}
        navigate={navigate}
        getGigUrl={getGigUrl}
        slugify={slugify}
        onSelectCategoryFilter={setServiceOptionFilter}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans text-slate-800">
      {/* ========================================================= */}
      {/* EXPLORE GIGS HEADER: Breadcrumbs & Page Headline          */}
      {/* ========================================================= */}
      <div className="mb-6">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
          <a 
            href="/" 
            onClick={(e) => navigate('/', e)} 
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            {SITE_CONFIG.brandName}
          </a>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700 dark:text-slate-300 capitalize">
              {currentCategory === 'All' ? 'Services' : currentCategory}
            </span>
          </div>

          {/* Category Title & Description */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {currentCategory === 'All' ? 'Explore Agency Services' : `${currentCategory} Services`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {`Explore fixed-price guest posting, press releases, UGC AI videos, web development, Shopify, and digital services from ${SITE_CONFIG.brandName} with secure online checkout.`}
              </p>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search services..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 shadow-xs"
              />
            </div>
          </div>
        </div>

      {/* ========================================================= */}
      {/* SEGMENTED CATEGORY CONTROL STRIP                          */}
      {/* ========================================================= */}
      <div className="p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none border border-slate-200/60 dark:border-slate-800/80">
        {['All', 'UGC AI Videos', 'Development & IT', 'AI & Data', 'Design & Creative', 'Mobile Apps'].map(catName => {
          const slug = CATEGORY_SLUGS[catName];
          const catUrl = slug === 'all' ? '/services' : `/categories/${slug}`;
          const isActive = currentCategory === catName;
          return (
            <a
              key={catName}
              href={catUrl}
              onClick={(e) => navigate(catUrl, e)}
              className={`px-4 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'bg-orange-500 text-white shadow-sm font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white'
              }`}
            >
              {catName}
            </a>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* SERVICE FILTER TOOLBAR                                    */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Service Options Filter */}
            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'service' ? null : 'service')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  serviceOptionFilter !== 'All'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>Service options {serviceOptionFilter !== 'All' ? `(${serviceOptionFilter})` : ''}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'service' ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              {activeDropdown === 'service' && (
                <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1">
                  {['All', 'Development & IT', 'AI & Data', 'Design & Creative', 'Mobile Apps'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setServiceOptionFilter(opt); setActiveDropdown(null); }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        serviceOptionFilter === opt ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt}</span>
                      {serviceOptionFilter === opt && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Filter with Custom Range */}
            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'budget' ? null : 'budget')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  budgetFilter && budgetFilter !== 'All'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>
                  Budget {budgetFilter && budgetFilter !== 'All' ? `(${budgetFilter.replace('custom:', '$')})` : ''}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'budget' ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              {activeDropdown === 'budget' && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 space-y-2.5">
                  <div className="space-y-1">
                    {[
                      { label: 'Any Budget', value: 'All' },
                      { label: 'Value (Under $50)', value: 'under25' },
                      { label: 'Mid-range ($50 - $100)', value: '50to100' },
                      { label: 'High-end ($100+)', value: 'over100' },
                    ].map(b => (
                      <button
                        key={b.value}
                        onClick={() => { setBudgetFilter(b.value); setActiveDropdown(null); }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          budgetFilter === b.value ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{b.label}</span>
                        {budgetFilter === b.value && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>

                  {/* Custom Min / Max USD */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-700 mb-1.5">Custom Budget ($ USD)</div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          placeholder="Min"
                          value={customMin}
                          onChange={e => setCustomMin(e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                        />
                      </div>
                      <span className="text-slate-400 text-xs">-</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={customMax}
                          onChange={e => setCustomMax(e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCustomBudget}
                      className="mt-2 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Time Filter */}
            <div className="relative">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'delivery' ? null : 'delivery')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  deliveryTimeFilter !== null
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>Delivery time {deliveryTimeFilter !== null ? `(≤ ${deliveryTimeFilter}d)` : ''}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'delivery' ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              {activeDropdown === 'delivery' && (
                <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1">
                  {[
                    { label: 'Any Delivery Time', value: null },
                    { label: 'Express 24H (1 day)', value: 1 },
                    { label: 'Up to 3 Days', value: 3 },
                    { label: 'Up to 7 Days', value: 7 },
                    { label: 'Up to 14 Days', value: 14 },
                  ].map(d => (
                    <button
                      key={String(d.value)}
                      onClick={() => { setDeliveryTimeFilter(d.value); setActiveDropdown(null); }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        deliveryTimeFilter === d.value ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{d.label}</span>
                      {deliveryTimeFilter === d.value && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Filter Toggles (Online Now) */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            {/* Online Now Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div 
                onClick={() => setOnlineNowOnly(!onlineNowOnly)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                  onlineNowOnly ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <div 
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    onlineNowOnly ? 'left-4.5' : 'left-0.5'
                  }`}
                />
              </div>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Online now</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CATALOG META BAR: Count, Sort Dropdown & View Mode Switch */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between gap-4 mb-5 text-xs">
        <div className="text-slate-500 font-medium">
          <strong className="text-slate-900 font-bold">{sortedAndFilteredGigs.length.toLocaleString()}</strong> services available
        </div>

        <div className="flex items-center gap-3">
          {/* Sort By Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 transition"
            >
              <span className="text-slate-500 font-normal">Sort by:</span>
              <span>{sortLabels[sortBy]}</span>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSortDropdown ? '-rotate-90' : 'rotate-90'}`} />
            </button>

            {showSortDropdown && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 space-y-0.5">
                {(Object.keys(sortLabels) as SortOption[]).filter(key => RATINGS_ENABLED || key !== 'rating').map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortBy(key);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      sortBy === key ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{sortLabels[key]}</span>
                    {sortBy === key && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid / Listicle Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setGigViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                gigViewMode === 'grid' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setGigViewMode('list')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                gigViewMode === 'list' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SERVICE GRID VIEW                                         */}
      {/* ========================================================= */}
      {sortedAndFilteredGigs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Services Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Try adjusting your search query, budget parameters, or delivery time to discover more services.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBudgetFilter('All');
                setSellerLevelFilter('All');
                setServiceOptionFilter('All');
                setDeliveryTimeFilter(null);
                setOnlineNowOnly(false);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : gigViewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAndFilteredGigs.map(gig => {
            const currentSlide = carouselIndices[gig.id] || 0;
            const gigUrl = getGigUrl(gig);
            const isLiked = likedGigIds.includes(gig.id);
            const isTopSeller = gig.freelancerLevel?.toLowerCase().includes('top') || gig.rating >= 4.9;

            return (
              <div 
                key={gig.id} 
                onClick={(e) => navigate(gigUrl, e)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer relative"
              >
                {/* 16:10 Card Aspect Ratio Image Container */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800 select-none">
                  <GigImage 
                    src={gig.image} 
                    title={gig.title} 
                    category={gig.category}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300 object-cover" 
                  />

                  {/* Top-Left Featured Badge: Choice */}
                  {gig.featured && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="bg-orange-500 text-white font-bold text-xs px-2 py-0.5 rounded-sm tracking-wide uppercase shadow-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-white" />
                        <span>Featured Choice</span>
                      </span>
                    </div>
                  )}

                  {/* Top-Right Heart Wishlist Button */}
                  <button 
                    type="button"
                    onClick={(e) => handleToggleLike(gig.id, e)}
                    className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                      isLiked 
                        ? 'bg-white text-red-500 fill-red-500 scale-105' 
                        : 'bg-white/80 hover:bg-white text-slate-700 hover:text-red-500 backdrop-blur-xs'
                    }`}
                    title={isLiked ? 'Remove from Saved' : 'Save to List'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>

                  {/* Hover Left / Right Carousel Navigation Arrows */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      type="button"
                      onClick={(e) => handlePrevSlide(gig.id, e)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleNextSlide(gig.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Carousel Indicator Dots */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === 0 ? 'bg-white scale-125' : 'bg-white/50'}`} />
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === 1 ? 'bg-white scale-125' : 'bg-white/50'}`} />
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${currentSlide === 2 ? 'bg-white scale-125' : 'bg-white/50'}`} />
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Agency Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {SITE_CONFIG.brandName}
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                        {gig.category}
                      </span>
                    </div>

                    {/* Gig Title: Exactly "I will ..." */}
                    <h3 className="text-sm sm:text-base leading-snug font-normal text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 min-h-[44px] mb-2.5">
                      <a
                        href={gigUrl}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(gigUrl, e);
                        }}
                        className="text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block"
                      >
                        {formatServiceTitle(gig.title)}
                      </a>
                    </h3>

                    {/* Rating & Review Count */}
                    {RATINGS_ENABLED && (
                      <div className="flex items-center gap-1 text-xs mb-3">
                        <Star className="w-3.5 h-3.5 fill-slate-900 dark:fill-amber-400 text-slate-900 dark:text-amber-400 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                          {(gig.rating || 5.0).toFixed(1)}
                        </span>
                        <span className="text-slate-400 font-normal">
                          ({formatReviewCount(gig.reviewsCount || 1)})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Delivery Badge & Pricing */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{gig.deliveryDays || 3}d delivery</span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">From</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">${gig.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================= */
        /* SERVICE LIST VIEW                                         */
        /* ========================================================= */
        <div className="space-y-4">
          {sortedAndFilteredGigs.map(gig => {
            const gigUrl = getGigUrl(gig);
            const isLiked = likedGigIds.includes(gig.id);

            return (
              <div 
                key={gig.id} 
                onClick={(e) => navigate(gigUrl, e)}
                className="bg-white rounded-xl border border-slate-200/90 p-4 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 group cursor-pointer overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto flex-1 min-w-0">
                  <div className="relative w-full sm:w-48 aspect-[16/10] rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <GigImage 
                      src={gig.image} 
                      title={gig.title} 
                      category={gig.category}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300 object-cover" 
                    />
                    <button 
                      type="button"
                      onClick={(e) => handleToggleLike(gig.id, e)}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                        isLiked 
                          ? 'bg-white text-red-500 fill-red-500' 
                          : 'bg-black/30 text-white hover:bg-white hover:text-red-500'
                      }`}
                      title={isLiked ? 'Remove from Saved' : 'Save to List'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0 w-full">
                    {/* Agency row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 truncate">{SITE_CONFIG.brandName}</span>
                      <span className="text-[11px] text-slate-400">• {gig.category}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 sm:line-clamp-1">
                      <a
                        href={gigUrl}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(gigUrl, e);
                        }}
                        className="text-slate-900 hover:text-emerald-600 transition-colors block"
                      >
                        {formatServiceTitle(gig.title)}
                      </a>
                    </h3>

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {RATINGS_ENABLED && (
                        <>
                          <div className="flex items-center gap-1 font-bold text-slate-900">
                            <Star className="w-3.5 h-3.5 fill-slate-900 text-slate-900" />
                            <span>{(gig.rating || 5.0).toFixed(1)}</span>
                            <span className="text-slate-400 font-normal">({formatReviewCount(gig.reviewsCount || 1)})</span>
                          </div>
                          <span className="text-slate-300">•</span>
                        </>
                      )}
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {gig.deliveryDays || 3} days delivery
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 gap-3 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Starting at</span>
                    <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">${gig.price}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(gigUrl, e);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-orange-500 group-hover:bg-orange-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
