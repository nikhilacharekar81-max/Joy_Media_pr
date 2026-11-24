import React from 'react';
import { LEGAL_DRAFT_NOTICE } from '../constants';
import { SITE_CONFIG } from '../siteConfig';
import { ShieldCheck, FileText, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export type LegalDocType = 'terms' | 'privacy' | 'refund-policy';

interface LegalPageProps {
  type: LegalDocType;
  navigate?: (to: string, e?: React.MouseEvent) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, navigate }) => {
  const handleNav = (to: string, e: React.MouseEvent) => {
    if (navigate) {
      navigate(to, e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => handleNav('/', e)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Version 1.0 (Draft)
          </div>
        </div>

        {/* Prominent Legal Draft Warning Banner */}
        {LEGAL_DRAFT_NOTICE && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold uppercase tracking-wider block text-amber-800 mb-0.5">Notice</span>
              {LEGAL_DRAFT_NOTICE}. The policies set forth on this page represent operational agency mechanics and draft terms subject to official regulatory and legal review.
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-sm gap-2">
          <a
            href="/terms"
            onClick={(e) => handleNav('/terms', e)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              type === 'terms'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </a>
          <a
            href="/privacy"
            onClick={(e) => handleNav('/privacy', e)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              type === 'privacy'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            Privacy Policy
          </a>
          <a
            href="/refund-policy"
            onClick={(e) => handleNav('/refund-policy', e)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              type === 'refund-policy'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Refund Policy
          </a>
        </div>

        {/* Document Body */}
        <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 border-t-0 p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          {type === 'terms' && (
            <>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
                <p className="text-sm text-slate-500 mt-1">Last Updated: November 2026</p>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">1. Client Accounts &amp; Eligibility</h2>
                <p className="text-sm">
                  To place orders or submit custom project briefs with {SITE_CONFIG.brandName}, you must register a client account and be at least 18 years of age. You agree to provide accurate, current, and complete information during registration. Each individual or organization may maintain only one active primary account. Account credentials must remain confidential, and you are responsible for all actions conducted under your account.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">2. Agency Services &amp; Client Orders</h2>
                <p className="text-sm">
                  <strong>{SITE_CONFIG.brandName}</strong> is an independent digital PR, media placement, and growth agency offering guest posting, press release distribution, UGC AI videos, custom web development, Shopify store development, and digital products directly through our team.
                </p>
                <p className="text-sm">
                  <strong>Clients</strong> engage our team by ordering published fixed-price services or approving custom quotes. Clients agree to provide clear briefs, brand guidelines, and required assets, and to complete payment via approved payment methods prior to work commencement.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">3. Secure Payments &amp; Order Confirmation</h2>
                <p className="text-sm">
                  All orders placed with {SITE_CONFIG.brandName} use secure online payment processing. When a client places a service order or accepts a custom quote, the order amount is confirmed and recorded against a dedicated order workspace and digital invoice.
                </p>
                <p className="text-sm">
                  An order is marked finalized when:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>The client reviews the delivered work and confirms acceptance of the invoice; or</li>
                  <li>The 7-day client review period expires without a revision request, cancellation, or support inquiry being initiated (as detailed below); or</li>
                  <li>A formal support review results in an agreed resolution.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">4. Pricing, Fees &amp; Invoices</h2>
                <p className="text-sm">
                  {SITE_CONFIG.brandName} operates with transparent upfront USD pricing:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li><strong>Fixed Service Pricing:</strong> Every published service clearly displays its base price, optional add-ons, and estimated delivery window prior to checkout.</li>
                  <li><strong>Payment Processing Fee:</strong> A nominal processing fee may be displayed at checkout to cover secure payment gateway processing and fraud protection.</li>
                  <li><strong>Small Order Fee:</strong> Fixed micro-charges may apply to transactions below defined minimum order thresholds and are itemized before payment.</li>
                  <li><strong>Invoices &amp; Receipts:</strong> Itemized digital invoices are issued inside your client portal for every confirmed order.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">5. 7-Day Review Window &amp; Revision Pauses</h2>
                <p className="text-sm">
                  When our team submits deliverables and a final invoice inside your order workspace, the client receives a <strong>7-calendar-day review window</strong> to inspect the deliverables, request revisions within scope, or approve the invoice.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                  <p className="font-semibold text-slate-900">How the review window operates:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li>Automated email reminders are sent upon delivery submission, on Day 3, on Day 6, and 24 hours prior to expiration.</li>
                    <li>If the client takes no action by the 7-day deadline, the invoice is automatically marked accepted and the order is completed.</li>
                    <li><strong>Important:</strong> Requesting a revision, opening a support review, or submitting a cancellation request immediately <em>pauses</em> the countdown timer until the matter is resolved.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">6. Content Ownership &amp; Intellectual Property</h2>
                <p className="text-sm">
                  Upon full payment and order completion, all intellectual property rights, title, and interest in bespoke deliverables created specifically for your order transfer to the client, unless expressly agreed otherwise in writing prior to work commencing. {SITE_CONFIG.brandName} retains ownership of pre-existing tools, frameworks, templates, and general background IP.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">7. Prohibited Uses &amp; Conduct</h2>
                <p className="text-sm">
                  Clients may not request, submit, or use our services for:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Unlawful, defamatory, fraudulent, or infringing content, malware, or unauthorized security exploitation;</li>
                  <li>Academic dishonesty, essay cheating, or forged credentials;</li>
                  <li>Circumventing authorized payment or billing workflows;</li>
                  <li>Harassment, abusive conduct, or hate speech toward our team;</li>
                  <li>Artificial review manipulation or fraudulent chargebacks.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">8. Account Suspension &amp; Termination</h2>
                <p className="text-sm">
                  {SITE_CONFIG.brandName} reserves the right to temporarily restrict or terminate client accounts found violating these Terms or engaging in fraudulent activity. In the event of account restriction, any active orders and pending balances are audited to ensure all valid client commitments and eligible refunds are handled fairly.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">9. Contact &amp; Inquiries</h2>
                <p className="text-sm">
                  For legal inquiries, terms clarification, or notices, contact {SITE_CONFIG.brandName} at <span className="font-semibold text-slate-900">{SITE_CONFIG.emails.support}</span>.
                </p>
              </section>
            </>
          )}

          {type === 'privacy' && (
            <>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
                <p className="text-sm text-slate-500 mt-1">Last Updated: November 2026</p>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">1. Personal Data Collected</h2>
                <p className="text-sm">
                  {SITE_CONFIG.brandName} collects only the information necessary to deliver agency services, process secure payments, issue invoices, and maintain account security:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li><strong>Identity Information:</strong> Name, username, email address, phone number, country, profile picture, and company details.</li>
                  <li><strong>Order &amp; Project Data:</strong> Service selections, custom project briefs, brand assets, delivery attachments, order workspace messages, and client feedback.</li>
                  <li><strong>Financial Information:</strong> Order payment histories, invoice records, and payment gateway references (card numbers and payment credentials are processed directly by certified payment gateways such as PayPal or Stripe).</li>
                  <li><strong>Technical &amp; Device Data:</strong> IP addresses, browser user-agent, session tokens, device verification identifiers, and security access logs.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">2. Cookies &amp; Local Storage</h2>
                <p className="text-sm">
                  We use strictly necessary session cookies and local storage tokens to keep you signed in, remember your active session, maintain CSRF defense, and ensure account security. We do not sell your personal browsing information to third-party ad networks.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">3. How We Use Your Data</h2>
                <p className="text-sm">Your data is utilized to:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Fulfill client service orders, manage project deliverables, and issue digital invoices;</li>
                  <li>Deliver transactional email updates (order confirmations, delivery notifications, and 7-day review reminders);</li>
                  <li>Detect and prevent unauthorized access, payment fraud, and abusive activity;</li>
                  <li>Maintain accurate financial and accounting records required for tax and legal compliance.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">4. Data Retention</h2>
                <p className="text-sm">
                  Active client account information is retained for as long as your account remains open. Financial transaction records, payment journals, and order invoices are retained for a minimum statutory period (typically 7 years) in accordance with tax and financial record-keeping obligations.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">5. Deletion &amp; Access Requests</h2>
                <p className="text-sm">
                  You have the right to request a copy of your personal data or to request account deletion. Upon receiving a verified request:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Your client profile and login credentials will be deactivated and anonymized;</li>
                  <li>Active orders with pending deliverables or billing must be settled prior to account closure;</li>
                  <li>Statutory financial and invoice records will be preserved in accordance with applicable regulations.</li>
                </ul>
                <p className="text-sm mt-2">
                  To submit a data access or deletion request, email <span className="font-semibold text-slate-900">{SITE_CONFIG.emails.privacy}</span> with your registered account details.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">6. Contacting Privacy Compliance</h2>
                <p className="text-sm">
                  If you have questions regarding this Privacy Policy or data processing practices, please contact us at <span className="font-semibold text-slate-900">{SITE_CONFIG.emails.privacy}</span>.
                </p>
              </section>
            </>
          )}

          {type === 'refund-policy' && (
            <>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Refund Policy</h1>
                <p className="text-sm text-slate-500 mt-1">Last Updated: November 2026</p>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">1. Client Protection &amp; Delivery Commitment</h2>
                <p className="text-sm">
                  Every order placed with {SITE_CONFIG.brandName} is backed by secure online payments, documented deliverables, and direct team accountability. If our team is unable to deliver the agreed service scope—such as an unavailable editorial placement or an unfulfilled specification—you are entitled to a prompt refund or an approved replacement option.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">2. Refunds &amp; Cancellation Before Delivery</h2>
                <p className="text-sm">
                  If work has not yet commenced or if a cancellation request is approved prior to delivery:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li><strong>Full Refund:</strong> 100% of the eligible order amount is refunded back to your original payment method or applied as client account credit at your preference.</li>
                  <li><strong>Unavailable Placements:</strong> If a selected media publication declines or is unable to publish your submitted content and no replacement is agreed upon, {SITE_CONFIG.brandName} issues a full refund for that placement.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">3. Partial Refunds</h2>
                <p className="text-sm">
                  In multi-deliverable or milestone projects where a portion of the work has already been completed and approved, {SITE_CONFIG.brandName} and the client may agree to a <strong>partial refund</strong>. The client is billed only for completed deliverables, and the remaining balance is refunded.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">4. The 7-Day Review Window &amp; Pausing Conditions</h2>
                <p className="text-sm">
                  Upon delivery and invoice submission inside your order workspace, clients have 7 calendar days to inspect the deliverables.
                </p>
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-sm space-y-2">
                  <p className="font-semibold text-slate-900">Conditions that immediately pause automatic invoice acceptance:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li><strong>Revision Requests:</strong> Submitting a revision request pauses the review countdown until our team submits the updated deliverable.</li>
                    <li><strong>Formal Review:</strong> Opening a formal quality review freezes order completion while our senior support team investigates.</li>
                    <li><strong>Pending Cancellation:</strong> Submitting a cancellation request pauses the countdown until our team responds and finalizes the request.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">5. Formal Review &amp; Resolution Process</h2>
                <p className="text-sm">
                  If you have concerns regarding deliverable quality or alignment with your order brief:
                </p>
                <ol className="list-decimal pl-5 text-sm space-y-1">
                  <li>Open a revision or formal review directly from your order workspace action menu.</li>
                  <li>Share specific notes, workspace messages, or brief references within 72 hours.</li>
                  <li>Senior account managers at {SITE_CONFIG.brandName} audit the deliverables against the confirmed order specifications.</li>
                  <li>We issue a clear resolution: revised delivery, full refund, or partial refund aligned with completed scope.</li>
                </ol>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">6. Inquiries &amp; Refund Support</h2>
                <p className="text-sm">
                  To request assistance with an order cancellation or refund, contact <span className="font-semibold text-slate-900">{SITE_CONFIG.emails.support}</span> with your Order ID.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
