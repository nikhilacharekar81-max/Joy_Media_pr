import React from 'react';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import { SITE_CONFIG } from '../siteConfig';

interface FooterProps {
  navigate: (to: string, e?: React.MouseEvent) => void;
}

/** Site footer with brand blurb and agency service link columns. */
export const Footer = React.memo(function Footer({ navigate }: FooterProps) {
  return (
    <footer className="bg-white border-t border-slate-200/80 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
        {/* Col 1: Brand Identity & Agency Description */}
        <div className="lg:col-span-2 pr-0 lg:pr-8">
          <a
            href="/"
            onClick={(e) => navigate('/', e)}
            className="inline-block text-xl font-extrabold tracking-tight text-slate-900 hover:text-emerald-700 transition-colors mb-4"
          >
            {SITE_CONFIG.brandWordmark}
          </a>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-sm">
            {SITE_CONFIG.brandName} is a digital PR and growth agency specializing in guest posting, press release distribution, UGC AI videos, custom website development, Shopify solutions, and digital products.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Secure Online Payments</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Live Order Updates</span>
          </div>
        </div>

        {/* Col 2: Media Placement Services */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 mb-4">Media Placement Services</h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>
              <a
                href="/categories/seo"
                onClick={(e) => navigate('/categories/seo', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Guest Posting
              </a>
            </li>
            <li>
              <a
                href="/categories/pr-press-releases"
                onClick={(e) => navigate('/categories/pr-press-releases', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Press Release Distribution
              </a>
            </li>
            <li>
              <a
                href="/categories/digital-marketing"
                onClick={(e) => navigate('/categories/digital-marketing', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Digital PR &amp; Media
              </a>
            </li>
            <li>
              <a
                href="/gigs"
                onClick={(e) => navigate('/gigs', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Explore All Placements
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Web Development & Digital Products */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 mb-4">Web &amp; Digital Solutions</h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>
              <a
                href="/categories/web-development"
                onClick={(e) => navigate('/categories/web-development', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Custom Website Development
              </a>
            </li>
            <li>
              <a
                href="/categories/ecommerce"
                onClick={(e) => navigate('/categories/ecommerce', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Shopify Store Setup
              </a>
            </li>
            <li>
              <a
                href="/categories/software-development"
                onClick={(e) => navigate('/categories/software-development', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Ready-Made Scripts
              </a>
            </li>
            <li>
              <a
                href="/categories/ugc-ai-videos"
                onClick={(e) => navigate('/categories/ugc-ai-videos', e)}
                className="hover:text-slate-900 transition-colors"
              >
                UGC AI Video Creation
              </a>
            </li>
            <li>
              <a
                href="/categories/ai-services"
                onClick={(e) => navigate('/categories/ai-services', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Ebooks &amp; Digital Products
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Agency, Support & Platform */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 mb-4">Agency &amp; Support</h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>
              <a
                href="/post-project"
                onClick={(e) => navigate('/post-project', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Get a Custom Quote
              </a>
            </li>
            <li>
              <a
                href="/orders"
                onClick={(e) => navigate('/orders', e)}
                className="hover:text-slate-900 transition-colors"
              >
                My Orders
              </a>
            </li>
            <li>
              <a
                href="/messages"
                onClick={(e) => navigate('/messages', e)}
                className="hover:text-slate-900 transition-colors"
              >
                Order Updates
              </a>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => navigate('/support', e)}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Contact Support</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal & Utility Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p className="mb-0">{SITE_CONFIG.copyright}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={(e) => navigate('/support', e)}
            className="font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Contact</span>
          </button>
          <span aria-hidden="true">·</span>
          <a
            href="/terms"
            onClick={(e) => navigate('/terms', e)}
            className="hover:text-slate-900 cursor-pointer"
          >
            Terms of Service
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="/privacy"
            onClick={(e) => navigate('/privacy', e)}
            className="hover:text-slate-900 cursor-pointer"
          >
            Privacy Policy
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="/refund-policy"
            onClick={(e) => navigate('/refund-policy', e)}
            className="hover:text-slate-900 cursor-pointer"
          >
            Refund Policy
          </a>
        </div>
      </div>
    </footer>
  );
});
