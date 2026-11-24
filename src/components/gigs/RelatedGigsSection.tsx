import React from 'react';
import { Star, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Gig } from '../../types';
import { slugify } from '../../utils/slugify';
import { Avatar, GigImage } from '../../components/ui';
import { RATINGS_ENABLED } from '../../constants';
import { SITE_CONFIG } from '../../siteConfig';

interface RelatedGigsSectionProps {
  currentGig: Gig;
  allGigs?: Gig[];
  onSelectGig?: (gig: Gig) => void;
  onNavigate?: (path: string, e?: React.MouseEvent) => void;
  title?: string;
  maxItems?: number;
}

export const RelatedGigsSection: React.FC<RelatedGigsSectionProps> = ({
  currentGig,
  allGigs,
  onSelectGig,
  onNavigate,
  title = "Related & Similar Services",
  maxItems = 4
}) => {
  const dataset = (allGigs || []).filter(g => g.status !== 'moderation' && g.status !== 'deleted');

  // Find related gigs by category or subcategory
  let related = dataset.filter(g => 
    g.id !== currentGig.id && 
    (g.category === currentGig.category || (g.subcategory && currentGig.subcategory && g.subcategory === currentGig.subcategory))
  );

  // If fewer than maxItems, backfill with other top rated gigs
  if (related.length < maxItems) {
    const remaining = dataset.filter(g => g.id !== currentGig.id && !related.some(r => r.id === g.id));
    related = [...related, ...remaining];
  }

  const itemsToDisplay = related.slice(0, maxItems);

  if (itemsToDisplay.length === 0) return null;


  const getGigUrl = (gig: Gig) => {
    const gslug = (gig.slug || slugify(gig.title)).toLowerCase();
    return `/services/${gslug}`;
  };

  const handleGigClick = (gig: Gig, e: React.MouseEvent) => {
    if (onSelectGig) {
      onSelectGig(gig);
    } else if (onNavigate) {
      onNavigate(getGigUrl(gig), e);
    }
  };

  const formatServiceTitle = (t: string) => {
    const stripped = (t || '').trim().replace(/^i\s+will\s+/i, '').trim();
    if (!stripped) return t || '';
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  };

  const formatReviewCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-1 rounded-full mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Handpicked Matches</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {itemsToDisplay.map((gig) => (
          <div
            key={gig.id}
            onClick={(e) => handleGigClick(gig, e)}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <GigImage
                  src={gig.image}
                  title={gig.title}
                  category={gig.category}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300 object-cover"
                />
              </div>

              <div className="p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar src={gig.freelancerAvatar} name={SITE_CONFIG.brandName} size="xs" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{SITE_CONFIG.brandName}</span>
                </div>

                <h4 className="text-sm sm:text-base leading-snug font-normal text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 min-h-[44px]">
                  {formatServiceTitle(gig.title)}
                </h4>

                {RATINGS_ENABLED && (
                  <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                    <Star className="w-3.5 h-3.5 fill-slate-900 dark:fill-amber-400 text-slate-900 dark:text-amber-400 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {(gig.rating || 5.0).toFixed(1)}
                    </span>
                    <span className="text-slate-400 font-normal">({formatReviewCount(gig.reviewsCount || 1)})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3.5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">From</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">${gig.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
