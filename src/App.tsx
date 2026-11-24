/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppData } from './hooks/useAppData';
import { useWorkstream } from './hooks/workstream/useWorkstream';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';
import { ImpersonationBanner } from './layout/ImpersonationBanner';
import { SERVICE_CATEGORIES } from './components/HeaderCategoriesNav';
import { AgencyHomePage } from './components/marketplace/AgencyHomePage';
import { slugify, getGigUrl } from './utils/slugify';
import { getAuthToken, setAuthToken, clearAuthToken, requestDemoSession, isTokenStructurallyValid } from './utils/authToken';
import { getDeviceId } from './utils/deviceId';
import { DEFAULT_GIG_IMAGE } from './constants';
import { RESERVED_ROUTES } from './shared/routes';
import { initiateGatewayCheckout } from './utils/gatewayCheckout';
import { AGENCY_MODE, SITE_CONFIG } from './siteConfig';
import { isStaffRole, type UserAccount, type Gig, type Order, type GigExtra } from './types';

// Resilient lazy loader: recovers automatically when a container restart or rebuild invalidates old hashed chunk URLs
function isChunkLoadError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(msg);
}

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (typeof window !== 'undefined' && isChunkLoadError(err)) {
        try {
          const key = 'agency_chunk_reload_ts';
          const lastReload = Number(sessionStorage.getItem(key) || '0');
          if (Date.now() - lastReload > 10_000) {
            sessionStorage.setItem(key, String(Date.now()));
            window.location.reload();
            return await new Promise<{ default: T }>(() => {});
          }
        } catch {}
      }
      throw err;
    }
  });
}

// Lazy-load secondary public views, authenticated application modules, and modals so '/' stays lean
const MarketplaceGigsView = lazyWithRetry(() =>
  import('./components/marketplace/MarketplaceGigsView').then(m => ({ default: m.MarketplaceGigsView }))
);
const FreelancerSearchView = lazyWithRetry(() =>
  import('./components/marketplace/FreelancerSearchView').then(m => ({ default: m.FreelancerSearchView }))
);
const ProjectSearchView = lazyWithRetry(() =>
  import('./components/marketplace/ProjectSearchView').then(m => ({ default: m.ProjectSearchView }))
);
const ProjectDetailView = lazyWithRetry(() =>
  import('./components/marketplace/ProjectDetailView').then(m => ({ default: m.ProjectDetailView }))
);
const GigDetailView = lazyWithRetry(() =>
  import('./components/gigs/GigDetailView').then(m => ({ default: m.GigDetailView }))
);
const FreelancerProfileView = lazyWithRetry(() =>
  import('./components/profile/FreelancerProfileView').then(m => ({ default: m.FreelancerProfileView }))
);
const LegalPage = lazyWithRetry(() =>
  import('./pages/LegalPage').then(m => ({ default: m.LegalPage }))
);
const BuyerActivityView = lazyWithRetry(() =>
  import('./components/marketplace/BuyerActivityView').then(m => ({ default: m.BuyerActivityView }))
);
const FreelancerActivityView = lazyWithRetry(() =>
  import('./components/marketplace/FreelancerActivityView').then(m => ({ default: m.FreelancerActivityView }))
);
const CreateGigView = lazyWithRetry(() =>
  import('./components/gigs/CreateGigView').then(m => ({ default: m.CreateGigView }))
);
const EditProfilePage = lazyWithRetry(() =>
  import('./components/profile/EditProfilePage').then(m => ({ default: m.EditProfilePage }))
);
const AdminPage = lazyWithRetry(() =>
  import('./pages/AdminPage').then(m => ({ default: m.AdminPage }))
);
const SettingsPage = lazyWithRetry(() =>
  import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
);
const WorkstreamWorkspace = lazyWithRetry(() =>
  import('./components/workstream/WorkstreamWorkspace').then(m => ({ default: m.WorkstreamWorkspace }))
);
const WorkstreamList = lazyWithRetry(() =>
  import('./components/workstream/WorkstreamList').then(m => ({ default: m.WorkstreamList }))
);
const PaymentsModule = lazyWithRetry(() =>
  import('./components/PaymentsModule').then(m => ({ default: m.PaymentsModule }))
);
const CheckoutResultView = lazyWithRetry(() =>
  import('./components/checkout/CheckoutResultView').then(m => ({ default: m.CheckoutResultView }))
);

const LoginModal = lazyWithRetry(() =>
  import('./components/modals/LoginModal').then(m => ({ default: m.LoginModal }))
);
const SignupModal = lazyWithRetry(() =>
  import('./components/modals/SignupModal').then(m => ({ default: m.SignupModal }))
);
const ForgotPasswordModal = lazyWithRetry(() =>
  import('./components/modals/ForgotPasswordModal').then(m => ({ default: m.ForgotPasswordModal }))
);
const VerifyModal = lazyWithRetry(() =>
  import('./components/modals/VerifyModal').then(m => ({ default: m.VerifyModal }))
);
const SupportModal = lazyWithRetry(() =>
  import('./components/modals/SupportModal').then(m => ({ default: m.SupportModal }))
);
const WishlistModal = lazyWithRetry(() =>
  import('./components/modals/WishlistModal').then(m => ({ default: m.WishlistModal }))
);
const EmailNotificationsModal = lazyWithRetry(() =>
  import('./components/modals/EmailNotificationsModal').then(m => ({ default: m.EmailNotificationsModal }))
);

export interface AppProps {
  initialPath?: string;
  initialData?: any;
}

const CATEGORY_SLUGS: Record<string, string> = {
  'All': 'all',
  'UGC AI Videos': 'ugc-ai-videos',
  'Development & IT': 'technology-programming',
  'AI & Data': 'ai-services',
  'Design & Creative': 'design',
  'Mobile Apps': 'technology-programming'
};

SERVICE_CATEGORIES.forEach(cat => {
  CATEGORY_SLUGS[cat.name] = cat.slug;
  cat.subcategories?.forEach(sub => {
    CATEGORY_SLUGS[sub.name] = sub.slug;
  });
});

export default function App({ initialPath = '/', initialData }: AppProps) {
  // Navigation / Route state
  const [currentPath, setCurrentPath] = useState<string>(initialPath);

  const navigate = useCallback((to: string, e?: React.MouseEvent) => {
    if (e && (e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)) {
      return;
    }
    if (e) {
      e.preventDefault();
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', to);
      window.scrollTo(0, 0);
    }
    setCurrentPath(to);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Coordinate session resolution so useAppData, Header, and WebSocket avoid waterfalls and duplicate calls
  const [sessionReady, setSessionReady] = useState(false);
  const sessionPromiseRef = useRef<Promise<boolean> | null>(null);
  const waitForSession = useCallback(() => {
    return sessionPromiseRef.current ?? Promise.resolve(true);
  }, []);

  // Application Data
  const appData = useAppData(initialData, {
    waitForSession,
    activePath: currentPath
  });
  const {
    users,
    setUsers,
    gigs,
    setGigs,
    projects,
    setProjects,
    proposals,
    setProposals,
    offers,
    setOffers,
    orders,
    setOrders,
    reviews,
    setReviews,
    messages,
    setMessages,
    disputes,
    setDisputes,
    refunds,
    setRefunds,
    payouts,
    setPayouts,
    categories,
    setCategories,
    supportTickets,
    setSupportTickets,
    auditLogs,
    setAuditLogs,
    userEmails,
    setUserEmails,
    fetchUserEmails,
    platformFee,
    clientServiceFee,
    smallOrderFeeThreshold,
    smallOrderFeeAmount,
    escrowProtectionDays,
    refresh
  } = appData;

  // Active / Impersonated User state (initialized identically on server and client to prevent hydration mismatch)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  const [impersonatedUser, setImpersonatedUser] = useState<UserAccount | null>(null);
  const activeUser = impersonatedUser || currentUser;

  // Keep currentUser in sync with canonical users list without overwriting private session fields
  useEffect(() => {
    if (currentUser?.id && users.length > 0) {
      const freshUser = users.find(u => u.id === currentUser.id);
      if (freshUser) {
        let hasDiff = false;
        const freshEntries = Object.entries(freshUser) as [keyof UserAccount, unknown][];
        for (const [key, nextVal] of freshEntries) {
          const prevVal = (currentUser as any)[key];
          if (prevVal === nextVal) continue;
          if (
            prevVal !== null &&
            nextVal !== null &&
            typeof prevVal === 'object' &&
            typeof nextVal === 'object'
          ) {
            if (JSON.stringify(prevVal) === JSON.stringify(nextVal)) continue;
          }
          hasDiff = true;
          break;
        }
        if (hasDiff) {
          const mergedUser = { ...currentUser, ...freshUser };
          setCurrentUser(mergedUser);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('current_user', JSON.stringify(mergedUser)); } catch {}
          }
        }
      }
    }
  }, [users, currentUser]);

  const clearPrivateSessionState = useCallback(() => {
    setOrders(prev => (prev.length > 0 ? [] : prev));
    setMessages(prev => (prev.length > 0 ? [] : prev));
    setOffers(prev => (prev.length > 0 ? [] : prev));
    setProposals(prev => (prev.length > 0 ? [] : prev));
    setDisputes(prev => (prev.length > 0 ? [] : prev));
    setRefunds(prev => (prev.length > 0 ? [] : prev));
    setPayouts(prev => (prev.length > 0 ? [] : prev));
    setSupportTickets(prev => (prev.length > 0 ? [] : prev));
    setAuditLogs(prev => (prev.length > 0 ? [] : prev));
    setUserEmails(prev => (prev.length > 0 ? [] : prev));
  }, [setOrders, setMessages, setOffers, setProposals, setDisputes, setRefunds, setPayouts, setSupportTickets, setAuditLogs, setUserEmails]);

  const updateCurrentUser = useCallback(
    (u: UserAccount | null | ((prev: UserAccount | null) => UserAccount | null)) => {
      setCurrentUser(prev => {
        const next = typeof u === 'function' ? u(prev) : u;
        if (typeof window !== 'undefined') {
          try {
            if (next) {
              localStorage.setItem('current_user', JSON.stringify(next));
            } else {
              localStorage.removeItem('current_user');
            }
          } catch {}
        }
        return next;
      });
      if (u === null) {
        clearPrivateSessionState();
      }
    },
    [clearPrivateSessionState]
  );

  useEffect(() => {
    if (!activeUser) {
      clearPrivateSessionState();
    }
  }, [activeUser, clearPrivateSessionState]);

  const loadUserSession = useCallback(async (): Promise<boolean> => {
    const existingToken = getAuthToken();
    if (existingToken && isTokenStructurallyValid(existingToken)) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${existingToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            updateCurrentUser(data.user);
            return true;
          }
        }
      } catch {}
      clearAuthToken();
    } else if (existingToken) {
      clearAuthToken();
    }

    updateCurrentUser(null);
    return false;
  }, [updateCurrentUser]);

  // Concurrent initial client hydration: defer background API calls until after initial paint when SSR data is present
  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let timerHandle: any = null;

    const startClientHydration = () => {
      if (cancelled) return;
      const rawToken = getAuthToken();
      if (rawToken && !isTokenStructurallyValid(rawToken)) {
        clearAuthToken();
      }
      const tokenBefore = getAuthToken();

      const sessionPromise = loadUserSession().then((ok) => {
        if (!cancelled) {
          setSessionReady(true);
        }
        return ok;
      });
      sessionPromiseRef.current = sessionPromise;

      const cleanNow = (initialPath || '/').split('?')[0].replace(/\/+$/, '').toLowerCase() || '/';
      const isPublicLanding =
        cleanNow === '/' || cleanNow === '/services' || cleanNow === '/gigs' || cleanNow.startsWith('/categories/');
      const canSkipAnonymousLandingRefresh =
        Boolean(initialData?.ssrHydrated) && isPublicLanding && !tokenBefore;

      if (!canSkipAnonymousLandingRefresh) {
        void refresh();
      }

      if (tokenBefore) {
        sessionPromise.then(() => {
          const tokenAfter = getAuthToken();
          if (!cancelled && tokenAfter && tokenAfter !== tokenBefore) {
            void refresh();
          }
        });
      }
    };

    const hasSsrPublicData = Boolean(
      initialData && (initialData.pageType === 'home' || (Array.isArray(initialData.gigs) && initialData.gigs.length > 0))
    );
    const cleanInitPath = (initialPath || '/').split('?')[0].replace(/\/+$/, '') || '/';
    const isPublicCatalogLanding =
      cleanInitPath === '/' ||
      cleanInitPath === '/services' ||
      cleanInitPath === '/gigs' ||
      cleanInitPath.startsWith('/categories/');

    if (hasSsrPublicData && isPublicCatalogLanding && typeof window !== 'undefined') {
      const ric = (window as any).requestIdleCallback;
      if (typeof ric === 'function') {
        idleHandle = ric(() => startClientHydration(), { timeout: 250 });
      } else {
        timerHandle = setTimeout(startClientHydration, 120);
      }
    } else {
      startClientHydration();
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window !== 'undefined' && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleHandle);
      }
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
      }
    };
  }, [loadUserSession, refresh]);

  // Liked Gigs state
  const [likedGigIds, setLikedGigIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        let stored = localStorage.getItem('joymediapr_liked_gigs');
        if (stored === null) {
          const legacy = localStorage.getItem('worksphere_liked_gigs');
          if (legacy !== null) {
            stored = legacy;
            localStorage.setItem('joymediapr_liked_gigs', legacy);
          }
        }
        if (stored) setLikedGigIds(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const handleToggleLike = useCallback((gigId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLikedGigIds(prev => {
      const next = prev.includes(gigId) ? prev.filter(id => id !== gigId) : [...prev, gigId];
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('joymediapr_liked_gigs', JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, []);

  // Modal open states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isEmailNotificationsModalOpen, setIsEmailNotificationsModalOpen] = useState(false);

  // Authentication form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginRequiresCode, setLoginRequiresCode] = useState(false);
  const [loginVerificationMessage, setLoginVerificationMessage] = useState('');
  const [mockEmailCodeDisplay, setMockEmailCodeDisplay] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);

  const [verificationMode, setVerificationMode] = useState<'email' | 'sms'>('email');
  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [smsCodeInput, setSmsCodeInput] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');

  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotQuery, setForgotQuery] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [mockForgotCodeDisplay, setMockForgotCodeDisplay] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');

  // Marketplace filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [serviceOptionFilter, setServiceOptionFilter] = useState('All');
  const [sellerLevelFilter, setSellerLevelFilter] = useState('All');
  const [budgetFilter, setBudgetFilter] = useState('All');
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState<number | null>(null);
  const [onlineNowOnly, setOnlineNowOnly] = useState(false);
  const [gigViewMode, setGigViewMode] = useState<'grid' | 'list'>('list');

  // Workstream & Selected Order state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [starredOrderIds, setStarredOrderIds] = useState<string[]>([]);
  const [workstreamSearch, setWorkstreamSearch] = useState('');
  const [orderFeedback, setOrderFeedback] = useState<{ type: 'success' | 'error'; message: string; orderId?: string } | null>(null);

  useEffect(() => {
    if (!orderFeedback) return;
    const timer = setTimeout(() => {
      setOrderFeedback(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [orderFeedback]);

  const toggleStarOrder = useCallback((orderId: string) => {
    setStarredOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  }, []);

  const workstream = useWorkstream({
    orders,
    setOrders,
    usersList: users,
    gigs,
    messages,
    setMessages,
    reviews,
    setReviews,
    currentUser: activeUser,
    impersonatedUser,
    selectedOrder,
    setSelectedOrder,
    sessionReady,
    refresh
  });

  // Create Gig state
  const [newGigTitle, setNewGigTitle] = useState('');
  const [newGigCat, setNewGigCat] = useState('Development & IT');
  const [newGigDesc, setNewGigDesc] = useState('');
  const [newGigPrice, setNewGigPrice] = useState(25);
  const [newGigDays, setNewGigDays] = useState(3);
  const [newGigImage, setNewGigImage] = useState('');
  const [isOptimizingGig, setIsOptimizingGig] = useState(false);
  const [newGigExtras, setNewGigExtras] = useState<GigExtra[]>([]);
  const [extraTitleInput, setExtraTitleInput] = useState('');
  const [extraPriceInput, setExtraPriceInput] = useState(10);

  const handleOptimizeGigWithAI = async () => {
    if (!newGigTitle.trim()) return;
    setIsOptimizingGig(true);
    try {
      const res = await fetch('/api/gigs/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newGigTitle, category: newGigCat })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) setNewGigTitle(data.title);
        if (data.description) setNewGigDesc(data.description);
      }
    } catch (e) {
      console.warn('AI optimize error:', e);
    } finally {
      setIsOptimizingGig(false);
    }
  };

  const handleAddGigExtra = () => {
    if (!extraTitleInput.trim()) return;
    setNewGigExtras(prev => [
      ...prev,
      { id: 'extra_' + Date.now(), title: extraTitleInput.trim(), price: extraPriceInput }
    ]);
    setExtraTitleInput('');
    setExtraPriceInput(10);
  };

  const handleRemoveGigExtra = (id: string) => {
    setNewGigExtras(prev => prev.filter(e => e.id !== id));
  };

  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('Technology & Programming');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectBudgetMin, setNewProjectBudgetMin] = useState(50);
  const [newProjectBudgetMax, setNewProjectBudgetMax] = useState(250);
  const [newProjectMaxHires, setNewProjectMaxHires] = useState(1);
  const [postProjectError, setPostProjectError] = useState<string | null>(null);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  const handlePublishGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      let token = getAuthToken();
      const isPrivileged = ['admin', 'super_admin', 'support'].includes(activeUser.role || '');
      if (!token && !isPrivileged) {
        const session = await requestDemoSession(activeUser.id);
        if (session?.token) {
          token = session.token;
          setAuthToken(token);
        }
      }
      if (!token) {
        setIsLoginModalOpen(true);
        return;
      }
      const res = await fetch('/api/gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newGigTitle,
          category: newGigCat,
          description: newGigDesc,
          price: newGigPrice,
          deliveryDays: newGigDays,
          image: newGigImage || DEFAULT_GIG_IMAGE,
          extras: newGigExtras
        })
      });
      if (res.ok) {
        const created = await res.json();
        await refresh();
        navigate(getGigUrl(created));
      }
    } catch (err) {
      console.error('Publish service failed:', err);
    }
  };

  const handlePostProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setPostProjectError(null);
    setIsSubmittingProject(true);
    try {
      let token = getAuthToken();
      const isPrivileged = ['admin', 'super_admin', 'support'].includes(activeUser.role || '');
      if (!token && !isPrivileged) {
        const session = await requestDemoSession(activeUser.id);
        if (session?.token) {
          token = session.token;
          setAuthToken(token);
        }
      }
      if (!token) {
        setIsLoginModalOpen(true);
        return;
      }
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newProjectTitle,
          category: newProjectCategory,
          description: newProjectDesc,
          budgetMin: Number(newProjectBudgetMin),
          budgetMax: Number(newProjectBudgetMax),
          maxHires: Number(newProjectMaxHires) || 1
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostProjectError(data.error || 'Failed to post project.');
        return;
      }
      setNewProjectTitle('');
      setNewProjectDesc('');
      await refresh();
      navigate(`/projects/${data.id}`);
    } catch (err: any) {
      setPostProjectError(err?.message || 'Failed to post project.');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  // Auth Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLogin(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          code: loginCode
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed.');
        return;
      }
      if (data.requiresVerification || data.requires2FA) {
        setLoginRequiresCode(true);
        setLoginVerificationMessage(data.message || 'Verification required');
        if (data.mockEmailCode) setMockEmailCodeDisplay(data.mockEmailCode);
        return;
      }
      if (data.token) {
        setAuthToken(data.token);
        updateCurrentUser(data.user);
        setIsLoginModalOpen(false);
        setLoginPassword('');
        setLoginCode('');
        refresh();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Network error.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSignup(true);
    setSignupError(null);
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.');
      setIsSubmittingSignup(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          mobile: signupMobile,
          password: signupPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSignupError(data.error || 'Signup failed.');
        return;
      }
      setIsSignupModalOpen(false);
      if (data.requiresVerification) {
        setVerifyEmail(signupEmail);
        if (data.mockEmailCode) setMockEmailCodeDisplay(data.mockEmailCode);
        setIsVerifyModalOpen(true);
      } else if (data.token) {
        setAuthToken(data.token);
        updateCurrentUser(data.user);
        refresh();
      }
    } catch (err: any) {
      setSignupError(err.message || 'Network error.');
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, code: emailCodeInput })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAuthToken(data.token);
        updateCurrentUser(data.user);
        setIsVerifyModalOpen(false);
        refresh();
      }
    } catch (e) {
      console.error('Verify error:', e);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotQuery, email: forgotQuery })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.mockCode || data.mockEmailCode) {
          setMockForgotCodeDisplay(data.mockCode || data.mockEmailCode);
        }
        setForgotStep('verify');
      }
    } catch (err) {
      console.error('Forgot password request error:', err);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotCode.trim().length === 6) {
      setForgotStep('reset');
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmNewPassword) return;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotQuery,
          email: forgotQuery,
          code: forgotCode,
          newPassword
        })
      });
      if (res.ok) {
        setIsForgotPasswordModalOpen(false);
        setForgotStep('request');
        setForgotCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsLoginModalOpen(true);
      }
    } catch (err) {
      console.error('Reset password error:', err);
    }
  };

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const isCreatingOrderRef = useRef(false);
  const handleCreateOrder = useCallback(
    async (orderTitle: string, priceUSD: number, sellerId: string, gigId?: string, extraIds?: string[]) => {
      if (!activeUser) {
        setIsLoginModalOpen(true);
        return;
      }
      if (isCreatingOrderRef.current || isCreatingOrder) return;
      isCreatingOrderRef.current = true;
      setIsCreatingOrder(true);
      setOrderFeedback(null);

      const normalizedExtraIds = Array.isArray(extraIds)
        ? Array.from(new Set(extraIds.map(String).filter(Boolean))).sort()
        : [];
      const payloadKey = `agency_patt_${activeUser.id}_${sellerId}_${gigId || 'custom'}_${encodeURIComponent(orderTitle)}_${priceUSD}_${normalizedExtraIds.join(',')}`;
      let clientRequestId = '';
      try {
        clientRequestId = sessionStorage.getItem(payloadKey) || '';
      } catch {}
      if (!clientRequestId) {
        clientRequestId = 'req_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        try {
          sessionStorage.setItem(payloadKey, clientRequestId);
        } catch {}
      }

      try {
        let token = getAuthToken();
        const isPrivileged = ['admin', 'super_admin', 'support'].includes(activeUser.role || '');
        if (!token && !isPrivileged) {
          const session = await requestDemoSession(activeUser.id);
          if (session?.token) {
            token = session.token;
            setAuthToken(token);
          }
        }
        if (!token) {
          setIsLoginModalOpen(true);
          return;
        }

        const sendOrderRequest = (tok: string) =>
          fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-device-id': getDeviceId(),
              'x-idempotency-key': clientRequestId,
              Authorization: `Bearer ${tok}`
            },
            body: JSON.stringify({
              title: orderTitle,
              amount: priceUSD,
              buyerId: activeUser.id,
              sellerId,
              gigId,
              extraIds: normalizedExtraIds
            })
          });

        let res = await sendOrderRequest(token);
        if (res.status === 401 && !isPrivileged) {
          const recovered = await requestDemoSession(activeUser.id);
          if (recovered?.token) {
            token = recovered.token;
            setAuthToken(token);
            res = await sendOrderRequest(token);
          }
        }
        if (res.ok) {
          const newOrder = await res.json();
          try { sessionStorage.removeItem(payloadKey); } catch {}
          setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
          setSelectedOrder(newOrder);
          workstream.fetchMessages(newOrder.id);
          setOrderFeedback({
            type: 'success',
            message: `Order #${newOrder.id} placed successfully! Payment confirmed.`,
            orderId: newOrder.id
          });
          navigate(`/workstream/${newOrder.id}`);
          void refresh(activeUser.id);
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || errData.message || `Failed to place order (HTTP ${res.status})`;
          if (res.status === 400 || res.status === 403 || res.status === 409 || res.status === 422) {
            try { sessionStorage.removeItem(payloadKey); } catch {}
          }
          if (
            res.status === 400 &&
            (errData.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(String(errMsg)))
          ) {
            const topUpAmount = Number(errData.shortfall || errData.requiredAmount || priceUSD);
            setOrderFeedback({
              type: 'success',
              message: `Redirecting to PayPal Checkout to fund $${topUpAmount.toFixed(2)} USD for "${orderTitle}"...`
            });
            await initiateGatewayCheckout({
              amount: topUpAmount,
              purpose: 'order_payment',
              description: `Service Order: ${orderTitle}`,
              metadata: {
                returnAction: 'create_gig_order',
                returnPath: typeof window !== 'undefined' ? window.location.pathname : '/',
                title: orderTitle,
                gigOrderPayload: {
                  title: orderTitle,
                  amount: priceUSD,
                  buyerId: activeUser.id,
                  sellerId,
                  gigId,
                  extraIds: normalizedExtraIds
                }
              }
            });
            return;
          }
          setOrderFeedback({
            type: 'error',
            message: errMsg
          });
        }
      } catch (e: any) {
        console.error('Order creation failed:', e);
        setOrderFeedback({
          type: 'error',
          message: e?.message || 'Network error while placing order. Please check your connection and retry.'
        });
      } finally {
        isCreatingOrderRef.current = false;
        setIsCreatingOrder(false);
      }
    },
    [activeUser, isCreatingOrder, navigate, refresh, setOrders, workstream]
  );

  const handleContactSeller = useCallback(
    async (freelancerId: string, freelancerName: string, gigTitle?: string, gigId?: string, projectId?: string) => {
      if (!activeUser) {
        setIsLoginModalOpen(true);
        return;
      }
      if (activeUser.id === freelancerId) {
        setOrderFeedback({
          type: 'error',
          message: 'You cannot open an inquiry with yourself.'
        });
        return;
      }

      const rawTitle = (gigTitle || `Consultation with ${freelancerName || SITE_CONFIG.brandName}`).trim();
      const inquiryTitle = /^inquiry:/i.test(rawTitle) ? rawTitle : `Inquiry: ${rawTitle}`;

      try {
        let token = getAuthToken();
        const isPrivileged = ['admin', 'super_admin', 'support'].includes(activeUser.role || '');
        if (!token && !isPrivileged) {
          const session = await requestDemoSession(activeUser.id);
          if (session?.token) {
            token = session.token;
            setAuthToken(token);
          }
        }
        if (!token) {
          setIsLoginModalOpen(true);
          return;
        }

        const sendInquiryRequest = (tok: string) =>
          fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-device-id': getDeviceId(),
              Authorization: `Bearer ${tok}`
            },
            body: JSON.stringify({
              title: inquiryTitle,
              amount: 0,
              isInquiry: true,
              buyerId: activeUser.id,
              sellerId: freelancerId,
              ...(gigId ? { gigId } : {}),
              ...(projectId ? { projectId } : {}),
              ...(!gigId && !projectId ? { originType: 'profile' } : {})
            })
          });

        let res = await sendInquiryRequest(token);
        if (res.status === 401 && !isPrivileged) {
          const recovered = await requestDemoSession(activeUser.id);
          if (recovered?.token) {
            token = recovered.token;
            setAuthToken(token);
            res = await sendInquiryRequest(token);
          }
        }

        if (res.ok) {
          const inquiryOrder = await res.json();
          setOrders(prev => [inquiryOrder, ...prev.filter(o => o.id !== inquiryOrder.id)]);
          setSelectedOrder(inquiryOrder);
          workstream.fetchMessages(inquiryOrder.id);
          navigate(`/workstream/${inquiryOrder.id}`);
          void refresh(activeUser.id);
        } else {
          const errData = await res.json().catch(() => ({}));
          setOrderFeedback({
            type: 'error',
            message: errData.error || 'Failed to open inquiry WorkStream.'
          });
        }
      } catch (err: any) {
        console.error('Contact team inquiry failed:', err);
        setOrderFeedback({
          type: 'error',
          message: err?.message || 'Network error while opening inquiry.'
        });
      }
    },
    [activeUser, navigate, refresh, setOrders, workstream]
  );

  // Parse path & route segments
  let rawCleanPath = currentPath.split('?')[0].replace(/\/+$/, '') || '/';
  if (rawCleanPath === '/index.html') {
    rawCleanPath = '/';
  }
  const cleanPath = rawCleanPath;
  const pathParts = cleanPath.split('/').filter(Boolean);

  // Client-side canonical redirects for legacy /gigs, /gig/*, /service/:id, /create-gig, /post-gig paths
  useEffect(() => {
    const querySuffix = currentPath.includes('?') ? currentPath.slice(currentPath.indexOf('?')) : '';
    let redirectTarget: string | null = null;

    if (cleanPath === '/gigs') {
      redirectTarget = `/services${querySuffix}`;
    } else if (cleanPath === '/create-gig' || cleanPath === '/post-gig') {
      redirectTarget = `/add-service${querySuffix}`;
    } else if (
      pathParts.length >= 2 &&
      (pathParts[0].toLowerCase() === 'gig' || pathParts[0].toLowerCase() === 'service')
    ) {
      const param = pathParts[1];
      const slugParam = pathParts[2];
      const matched = gigs.find(
        g =>
          g.id === param ||
          (g.slug && g.slug.toLowerCase() === param.toLowerCase()) ||
          (slugParam && g.slug && g.slug.toLowerCase() === slugParam.toLowerCase())
      );
      if (matched) {
        redirectTarget = `${getGigUrl(matched)}${querySuffix}`;
      } else if (slugParam) {
        redirectTarget = `/services/${slugParam}${querySuffix}`;
      } else if (gigs.length > 0) {
        redirectTarget = `/services/${param}${querySuffix}`;
      }
    }

    if (redirectTarget && redirectTarget !== currentPath) {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', redirectTarget);
      }
      setCurrentPath(redirectTarget);
    }
  }, [cleanPath, currentPath, pathParts, gigs]);

  // Check modal trigger routes
  useEffect(() => {
    if (cleanPath === '/login') setIsLoginModalOpen(true);
    if (cleanPath === '/signup') setIsSignupModalOpen(true);
    if (cleanPath === '/support') setIsSupportModalOpen(true);
    if (cleanPath === '/wishlist') setIsWishlistModalOpen(true);
    if (cleanPath === '/notifications') setIsEmailNotificationsModalOpen(true);
    if (cleanPath === '/verify') setIsVerifyModalOpen(true);
    if (cleanPath === '/forgot-password') setIsForgotPasswordModalOpen(true);
  }, [cleanPath]);

  // Fetch route-skipped datasets if user navigates away from a legal page or into a category-dependent route
  const prevCleanPathRef = useRef(cleanPath);
  useEffect(() => {
    const prev = prevCleanPathRef.current;
    prevCleanPathRef.current = cleanPath;
    if (prev === cleanPath) return;

    const wasLegal = prev === '/terms' || prev === '/privacy' || prev === '/refund-policy';
    const isLegal = cleanPath === '/terms' || cleanPath === '/privacy' || cleanPath === '/refund-policy';
    const needsCats =
      cleanPath === '/freelance-activity' ||
      cleanPath === '/freelancer' ||
      cleanPath.startsWith('/admin');
    const needsProjects =
      cleanPath === '/buyer-activity' ||
      cleanPath === '/projects' ||
      cleanPath === '/search-projects' ||
      cleanPath === '/project-search' ||
      cleanPath === '/freelance-jobs' ||
      cleanPath.startsWith('/projects/') ||
      cleanPath.startsWith('/project/');

    const wasLanding = prev === '/' || prev === '/services' || prev === '/gigs' || prev.startsWith('/categories/');
    const needsAdminData = cleanPath.startsWith('/admin');
    const needsWorkstreamOrActivity =
      cleanPath === '/buyer-activity' ||
      cleanPath === '/freelance-activity' ||
      cleanPath === '/freelancer' ||
      cleanPath === '/workstream' ||
      cleanPath.startsWith('/workstream/') ||
      cleanPath === '/payments' ||
      cleanPath === '/dashboard';

    if (
      (wasLegal && !isLegal && gigs.length === 0) ||
      (needsCats && categories.length === 0) ||
      (needsProjects && projects.length === 0) ||
      (wasLanding && (needsAdminData || needsWorkstreamOrActivity) && Boolean(activeUser?.id || getAuthToken()))
    ) {
      void refresh(activeUser?.id);
    }
  }, [cleanPath, gigs.length, categories.length, projects.length, refresh, activeUser?.id]);

  const resolveOrderFromRouteParam = useCallback(
    (targetId: string | null) => {
      if (!targetId) return null;
      let decodedId = targetId;
      try {
        decodedId = decodeURIComponent(targetId);
      } catch {}

      const allItems = workstream.hydratedWorkstreamItems.length > 0 ? workstream.hydratedWorkstreamItems : orders;
      // 1. Exact Order ID match
      const exactMatch =
        allItems.find(
          o =>
            o.id === targetId ||
            o.id === decodedId ||
            (o as any).gigOrderId === targetId ||
            (o as any).gigOrderId === decodedId ||
            (o as any).projectOrderId === targetId ||
            (o as any).projectOrderId === decodedId
        );
      if (exactMatch) return exactMatch;

      // 2. Workspace ID match -> resolve deterministically to the most recently updated / active order in that Workspace
      const wsMatches = allItems.filter(
        o => o.workspaceId === targetId || o.workspaceId === decodedId
      );
      if (wsMatches.length > 0) {
        const sorted = [...wsMatches].sort((a, b) => {
          const tA = new Date((a as any).updatedAt || a.createdAt || 0).getTime();
          const tB = new Date((b as any).updatedAt || b.createdAt || 0).getTime();
          if (tA !== tB) return tA - tB;
          return a.id.localeCompare(b.id);
        });
        return sorted[sorted.length - 1];
      }
      return null;
    },
    [orders, workstream.hydratedWorkstreamItems]
  );

  useEffect(() => {
    if (!activeUser) {
      if (selectedOrder !== null) {
        setSelectedOrder(null);
      }
      return;
    }
    if (
      (cleanPath.startsWith('/workstream/') ||
        cleanPath.startsWith('/workspace/') ||
        cleanPath.startsWith('/messages/') ||
        cleanPath.startsWith('/orders/')) &&
      pathParts.length >= 2
    ) {
      const targetOrderId = pathParts[1];
      if (targetOrderId) {
        const matched = resolveOrderFromRouteParam(targetOrderId);
        if (matched && selectedOrder?.id !== matched.id) {
          setSelectedOrder(matched);
        }
      }
    } else if (
      cleanPath === '/workstream' ||
      cleanPath === '/workspace' ||
      cleanPath === '/messages' ||
      cleanPath === '/orders'
    ) {
      if (selectedOrder !== null) {
        setSelectedOrder(null);
      }
    }
  }, [activeUser, cleanPath, pathParts, resolveOrderFromRouteParam, selectedOrder]);

  // Route flags
  const isGigsList = cleanPath === '/services' || cleanPath === '/gigs' || cleanPath.startsWith('/categories');
  const isProjectsList = ['/projects', '/search-projects', '/project-search', '/freelance-jobs'].includes(cleanPath);
  const isFreelancersList = ['/freelancers', '/search-freelancers', '/freelancer-search'].includes(cleanPath);
  const isCategoryRoute = cleanPath.startsWith('/categories');
  const isProjectDetail = pathParts.length === 2 && (pathParts[0].toLowerCase() === 'projects' || pathParts[0].toLowerCase() === 'project');
  const isGigDetail =
    (pathParts.length >= 2 && ['services', 'service', 'gig', 'gigs'].includes(pathParts[0].toLowerCase())) ||
    (pathParts.length === 2 && !RESERVED_ROUTES.includes(pathParts[0].toLowerCase()));

  // Active Category detection
  const currentCategory = useMemo(() => {
    if (cleanPath.startsWith('/categories/')) {
      const slug = cleanPath.replace('/categories/', '').toLowerCase();
      for (const [name, s] of Object.entries(CATEGORY_SLUGS)) {
        if (s.toLowerCase() === slug) return name;
      }
      return slug;
    }
    return 'All';
  }, [cleanPath]);

  // Filtered Gigs
  const filteredGigs = useMemo(() => {
    const matchesCategoryOrParent = (g: Gig, targetCat: string): boolean => {
      if (!targetCat || targetCat === 'All') return true;
      const gCatSlug = CATEGORY_SLUGS[g.category] || slugify(g.category);
      const gSubSlug = g.subcategory ? (CATEGORY_SLUGS[g.subcategory] || slugify(g.subcategory)) : '';
      const targetSlug = CATEGORY_SLUGS[targetCat] || slugify(targetCat);
      const lowerTarget = targetCat.toLowerCase();

      if (
        gCatSlug === targetSlug ||
        (gSubSlug && gSubSlug === targetSlug) ||
        g.category.toLowerCase() === lowerTarget ||
        (g.subcategory && g.subcategory.toLowerCase() === lowerTarget)
      ) {
        return true;
      }

      // Check parent category relationship in SERVICE_CATEGORIES
      const parentObj = SERVICE_CATEGORIES.find(
        c =>
          c.slug === targetSlug ||
          c.name.toLowerCase() === lowerTarget ||
          c.subcategories?.some(s => s.slug === targetSlug || s.name.toLowerCase() === lowerTarget)
      );
      if (parentObj) {
        if (gCatSlug === parentObj.slug || g.category.toLowerCase() === parentObj.name.toLowerCase()) {
          return true;
        }
        // Map PR / Marketing / SEO subcategories to Digital Marketing listings
        if (
          ['marketing-branding-sales', 'digital-marketing', 'writing-translation', 'social-media'].includes(parentObj.slug) &&
          (gCatSlug === 'digital-marketing' || g.category.toLowerCase().includes('marketing'))
        ) {
          return true;
        }
        // Map E-commerce / Web / Software subcategories to Technology & Programming listings
        if (
          parentObj.slug === 'technology-programming' &&
          (gCatSlug === 'technology-programming' || g.category.toLowerCase().includes('technology') || g.category.toLowerCase().includes('development'))
        ) {
          return true;
        }
        // Map UGC AI Videos / AI Services / Video subcategories
        if (
          ['ugc-ai-videos', 'ai-services', 'video-photo-image'].includes(parentObj.slug) &&
          (gCatSlug === 'ugc-ai-videos' || gCatSlug === 'ai-services' || g.category.toLowerCase().includes('ugc') || g.category.toLowerCase().includes('ai'))
        ) {
          return true;
        }
      }

      return false;
    };

    return gigs.filter(g => {
      if (currentCategory && currentCategory !== 'All') {
        if (!matchesCategoryOrParent(g, currentCategory)) {
          return false;
        }
      }
      if (serviceOptionFilter && serviceOptionFilter !== 'All') {
        if (!matchesCategoryOrParent(g, serviceOptionFilter)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchDesc = g.description?.toLowerCase().includes(q);
        const matchSeller = g.freelancerName?.toLowerCase().includes(q);
        const matchTags = g.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchSeller && !matchTags) return false;
      }
      if (budgetFilter && budgetFilter !== 'All') {
        if (budgetFilter === 'under25' && g.price >= 50) return false;
        if (budgetFilter === '50to100' && (g.price < 50 || g.price > 100)) return false;
        if (budgetFilter === 'over100' && g.price <= 100) return false;
        if (budgetFilter.startsWith('custom:')) {
          const parts = budgetFilter.replace('custom:', '').split('-');
          const min = parseFloat(parts[0]) || 0;
          const max = parseFloat(parts[1]) || Infinity;
          if (g.price < min || g.price > max) return false;
        }
      }
      if (deliveryTimeFilter) {
        if (g.deliveryDays > deliveryTimeFilter) return false;
      }
      if (sellerLevelFilter && sellerLevelFilter !== 'All' && g.freelancerLevel && !g.freelancerLevel.toLowerCase().includes(sellerLevelFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [gigs, currentCategory, serviceOptionFilter, searchQuery, budgetFilter, deliveryTimeFilter, sellerLevelFilter]);

  const isBuyerOnlyUser = Boolean(
    activeUser &&
    activeUser.role === 'buyer' &&
    !['admin', 'super_admin', 'support'].includes(activeUser.role)
  );

  // Buyers can strictly only see their own projects
  const visibleProjects = useMemo(() => {
    if (isBuyerOnlyUser && activeUser) {
      return projects.filter(p => p.buyerId === activeUser.id);
    }
    return projects;
  }, [projects, isBuyerOnlyUser, activeUser]);

  // Determine current active view
  let mainContent: React.ReactNode = null;
  const currentSearchQuery = currentPath.includes('?')
    ? currentPath.slice(currentPath.indexOf('?'))
    : (initialData?.query ? `?${initialData.query}` : '');

  if (cleanPath.startsWith('/admin')) {
    mainContent = (
      <AdminPage
        currentUser={activeUser}
        impersonatedUser={impersonatedUser}
        updateCurrentUser={updateCurrentUser}
        setImpersonatedUser={setImpersonatedUser}
        usersList={users}
        setUsersList={setUsers}
        projects={projects}
        gigs={gigs}
        orders={orders}
        proposals={proposals}
        platformFee={platformFee}
        clientServiceFee={clientServiceFee}
        smallOrderFeeThreshold={smallOrderFeeThreshold}
        smallOrderFeeAmount={smallOrderFeeAmount}
        escrowProtectionDays={escrowProtectionDays}
        navigate={navigate}
        refresh={refresh}
        getDeviceId={getDeviceId}
      />
    );
  } else if (cleanPath.startsWith('/checkout')) {
    const checkoutMode = cleanPath.startsWith('/checkout/cancel')
      ? 'cancel'
      : cleanPath.startsWith('/checkout/pay')
      ? 'pay'
      : 'success';
    mainContent = (
      <CheckoutResultView
        mode={checkoutMode}
        currentPath={currentPath}
        navigate={navigate}
        onRefreshUser={() => refresh(activeUser?.id)}
      />
    );
  } else if (cleanPath === '/settings') {
    mainContent = (
      <SettingsPage
        currentUser={activeUser}
        updateCurrentUser={updateCurrentUser}
        navigate={navigate}
      />
    );
  } else if (cleanPath === '/terms' || cleanPath === '/privacy' || cleanPath === '/refund-policy') {
    const docType = cleanPath === '/privacy' ? 'privacy' : cleanPath === '/refund-policy' ? 'refund-policy' : 'terms';
    mainContent = <LegalPage type={docType} navigate={navigate} />;
  } else if (cleanPath === '/edit-profile') {
    mainContent = (
      <EditProfilePage
        currentUser={activeUser}
        updateCurrentUser={updateCurrentUser}
        navigate={navigate}
      />
    );
  } else if (cleanPath === '/add-service' || cleanPath === '/create-gig' || cleanPath === '/post-gig') {
    if (!activeUser || !isStaffRole(activeUser.role)) {
      mainContent = (
        <div className="max-w-xl mx-auto py-16 px-4 text-center font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">Agency Staff Area</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Only authorized {SITE_CONFIG.brandName} team members can publish or edit agency services.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => navigate('/services', e)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Explore Services
              </button>
              <button
                type="button"
                onClick={(e) => navigate('/post-project', e)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Request a Custom Quote
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      mainContent = (
        <div className="max-w-4xl mx-auto py-8 px-4">
          <CreateGigView
            newGigTitle={newGigTitle}
            setNewGigTitle={setNewGigTitle}
            newGigCat={newGigCat}
            setNewGigCat={setNewGigCat}
            newGigDesc={newGigDesc}
            setNewGigDesc={setNewGigDesc}
            newGigPrice={newGigPrice}
            setNewGigPrice={setNewGigPrice}
            newGigDays={newGigDays}
            setNewGigDays={setNewGigDays}
            newGigImage={newGigImage}
            setNewGigImage={setNewGigImage}
            isOptimizingGig={isOptimizingGig}
            handleOptimizeGigWithAI={handleOptimizeGigWithAI}
            newGigExtras={newGigExtras}
            extraTitleInput={extraTitleInput}
            setExtraTitleInput={setExtraTitleInput}
            extraPriceInput={extraPriceInput}
            setExtraPriceInput={setExtraPriceInput}
            handleAddGigExtra={handleAddGigExtra}
            handleRemoveGigExtra={handleRemoveGigExtra}
            handlePublishGig={handlePublishGig}
          />
        </div>
      );
    }
  } else if (cleanPath === '/post-project') {
    mainContent = (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Request a Custom Quote
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Describe your project requirements and budget to receive a custom quote from {SITE_CONFIG.brandName}.
            </p>
          </div>
          {postProjectError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
              {postProjectError}
            </div>
          )}
          <form onSubmit={handlePostProject} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Project Title
              </label>
              <input
                type="text"
                placeholder="e.g. Digital PR campaign, guest posting package, or Shopify storefront..."
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={newProjectCategory}
                onChange={(e) => setNewProjectCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="Technology & Programming">Technology & Programming</option>
                <option value="Design & Creative">Design & Creative</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Writing & Translation">Writing & Translation</option>
                <option value="Video & Animation">Video & Animation</option>
                <option value="AI & Data">AI & Data</option>
                <option value="Business">Business</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Min Budget ($ USD)
                </label>
                <input
                  type="number"
                  min={5}
                  step="1"
                  value={newProjectBudgetMin}
                  onChange={(e) => setNewProjectBudgetMin(Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Max Budget ($ USD)
                </label>
                <input
                  type="number"
                  min={5}
                  step="1"
                  value={newProjectBudgetMax}
                  onChange={(e) => setNewProjectBudgetMax(Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Project Description & Deliverables
              </label>
              <textarea
                rows={5}
                placeholder="Describe the project scope, deliverables, and timeline expectations..."
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => navigate('/services', e)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingProject}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                {isSubmittingProject ? 'Submitting Request...' : 'Submit Custom Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  } else if (cleanPath === '/buyer-activity') {
    mainContent = (
      <BuyerActivityView
        projects={visibleProjects}
        orders={orders}
        offers={offers}
        gigs={gigs}
        users={users}
        proposals={proposals}
        currentUser={activeUser}
        navigate={navigate}
        onOpenWorkstream={(ord) => {
          setSelectedOrder(ord);
          navigate(`/workstream/${ord.id}`);
        }}
      />
    );
  } else if (cleanPath === '/freelance-activity' || cleanPath === '/freelancer') {
    if (AGENCY_MODE && (!activeUser || !isStaffRole(activeUser.role))) {
      mainContent = (
        <div className="max-w-xl mx-auto py-16 px-4 text-center font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">Agency Staff Area</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              This dashboard is reserved for the {SITE_CONFIG.brandName} team. View and track your orders from your client dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => navigate('/orders', e)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                View My Orders
              </button>
              <button
                type="button"
                onClick={(e) => navigate('/services', e)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Browse Services
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      mainContent = (
        <FreelancerActivityView
          currentUser={activeUser}
          orders={orders}
          allGigs={gigs}
          categories={categories}
          projects={projects}
          proposals={proposals}
          users={users}
          navigate={navigate}
          onRefresh={refresh}
        />
      );
    }
  } else if (
    cleanPath === '/orders' ||
    cleanPath === '/messages' ||
    cleanPath === '/workstream' ||
    cleanPath === '/workspace' ||
    cleanPath.startsWith('/messages/') ||
    cleanPath.startsWith('/orders/') ||
    cleanPath.startsWith('/workstream/') ||
    cleanPath.startsWith('/workspace/')
  ) {
    if (!activeUser) {
      mainContent = !sessionReady ? (
        <div className="max-w-xl mx-auto py-20 px-4 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-600 shadow-xs">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Checking your session...</span>
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto py-16 px-4 text-center font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">Sign In Required</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Order workspaces, messages, and invoices are private to signed-in accounts. Please sign in to access your orders.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsSignupModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={(e) => navigate('/', e)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      const routeOrderId = pathParts.length >= 2 ? pathParts[1] : null;
      const rawActiveOrder = routeOrderId
        ? resolveOrderFromRouteParam(routeOrderId) ||
          (selectedOrder?.id === routeOrderId || selectedOrder?.workspaceId === routeOrderId ? selectedOrder : null)
        : null;

      if (rawActiveOrder) {
      const hydratedActiveOrder = {
        ...rawActiveOrder,
        seller: (rawActiveOrder as any).seller || users.find(u => u.id === rawActiveOrder.sellerId),
        buyer: (rawActiveOrder as any).buyer || users.find(u => u.id === rawActiveOrder.buyerId),
        gig: (rawActiveOrder as any).gig || gigs.find(g => g.id === rawActiveOrder.gigId)
      };
      const workstreamPartner = users.find(
        u => u.id === (activeUser?.id === hydratedActiveOrder.buyerId ? hydratedActiveOrder.sellerId : hydratedActiveOrder.buyerId)
      );
      const workspaceOrders = hydratedActiveOrder.workspaceId
        ? workstream.hydratedWorkstreamItems
            .filter(
              o =>
                o.workspaceId === hydratedActiveOrder.workspaceId &&
                o.buyerId === hydratedActiveOrder.buyerId &&
                o.sellerId === hydratedActiveOrder.sellerId
            )
            .sort((a, b) => {
              const tA = new Date((a as any).updatedAt || a.createdAt || 0).getTime();
              const tB = new Date((b as any).updatedAt || b.createdAt || 0).getTime();
              if (tA !== tB) return tA - tB;
              return a.id.localeCompare(b.id);
            })
        : [hydratedActiveOrder as any];
      const workspaceOrderIds = new Set(workspaceOrders.map(o => o.id));
      workspaceOrderIds.add(hydratedActiveOrder.id);

      const workspaceMessages = workstream.messages
        .filter(
          m =>
            (m.orderId && workspaceOrderIds.has(m.orderId)) ||
            (Boolean(hydratedActiveOrder.workspaceId) &&
              (m.workspaceId === hydratedActiveOrder.workspaceId ||
               m.metadata?.workspaceId === hydratedActiveOrder.workspaceId ||
               m.orderId === hydratedActiveOrder.workspaceId))
        )
        .sort((a, b) => {
          const tA = a.timestamp ? new Date(a.timestamp).getTime() : NaN;
          const tB = b.timestamp ? new Date(b.timestamp).getTime() : NaN;
          const validA = !isNaN(tA);
          const validB = !isNaN(tB);
          if (!validA && !validB) return String(a.id || '').localeCompare(String(b.id || ''));
          if (!validA) return 1;
          if (!validB) return -1;
          if (tA !== tB) return tA - tB;
          return String(a.id || '').localeCompare(String(b.id || ''));
        });

      mainContent = (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <WorkstreamWorkspace
            order={hydratedActiveOrder as any}
            workspaceOrders={workspaceOrders as any}
            onSelectOrder={(oid) => {
              const matched = orders.find(o => o.id === oid);
              if (matched) setSelectedOrder(matched);
              navigate(`/workstream/${oid}`);
            }}
            messages={workspaceMessages as any}
            files={workstream.activeSharedFiles}
            currentUser={activeUser}
            usersList={users}
            partner={workstreamPartner}
            onBack={() => {
              setSelectedOrder(null);
              navigate('/workstream');
            }}
            onSendMessage={workstream.sendMessage}
            onAttachFile={(file) => workstream.sendMessage(`Attached file: ${file.name}`, 'file', file)}
            sendEvent={workstream.sendEvent}
            onOrderChanged={(updatedOrder, newOrder) => {
              const targetOrder = newOrder || updatedOrder;
              if (targetOrder && targetOrder.id) {
                setOrders(prev => {
                  const withoutTarget = prev.filter(
                    o =>
                      o.id !== targetOrder.id &&
                      !(targetOrder.workspaceId && (o as any).isInquiry && o.id === targetOrder.workspaceId)
                  );
                  return [targetOrder, ...withoutTarget];
                });
                setSelectedOrder(targetOrder);
                if (newOrder?.id && newOrder.id !== hydratedActiveOrder.id) {
                  workstream.fetchMessages(newOrder.id);
                  navigate(`/workstream/${newOrder.id}`);
                }
              }
              if (activeUser?.id) void refresh(activeUser.id);
            }}
            onReleaseEscrow={workstream.handleReleaseEscrow}
            onDeliverWork={workstream.handleDeliverWork}
            onRequestRevision={workstream.handleRequestRevision}
            isReviewModalOpen={workstream.isReviewModalOpen}
            setIsReviewModalOpen={workstream.setIsReviewModalOpen}
            handleSubmitReview={workstream.handleSubmitReview}
          />
        </div>
      );
    } else {
      mainContent = (
        <div className="max-w-7xl mx-auto py-8 px-4">
          <WorkstreamList
            workstreams={workstream.hydratedWorkstreamItems}
            currentUser={activeUser}
            selectedOrderId={selectedOrder?.id}
            onSelectOrder={(id: string) => {
              const matched = orders.find(o => o.id === id);
              setSelectedOrder(matched || null);
              navigate(`/workstream/${id}`);
            }}
            starredIds={starredOrderIds}
            onToggleStar={toggleStarOrder}
            searchQuery={workstreamSearch}
            onSearchChange={setWorkstreamSearch}
            onStartNewWorkstream={() => navigate('/services')}
          />
        </div>
      );
      }
    }
  } else if (isProjectsList) {
    if (AGENCY_MODE && (!activeUser || !isStaffRole(activeUser.role))) {
      mainContent = (
        <div className="max-w-xl mx-auto py-16 px-4 text-center font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">Custom Project Quotes</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every project request at {SITE_CONFIG.brandName} is handled privately by our in-house team. Submit a brief or view your existing requests.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => navigate('/post-project', e)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Request a Custom Quote
              </button>
              <button
                type="button"
                onClick={(e) => navigate('/buyer-activity', e)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                View My Requests
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      mainContent = (
        <ProjectSearchView
          projects={visibleProjects}
          navigate={navigate}
          currentUser={activeUser}
          query={currentSearchQuery}
        />
      );
    }
  } else if (isFreelancersList) {
    if (AGENCY_MODE && (!activeUser || !isStaffRole(activeUser.role))) {
      mainContent = (
        <div className="max-w-xl mx-auto py-16 px-4 text-center font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">Work Directly With Our Team</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {SITE_CONFIG.brandName} is a dedicated digital PR and growth agency. All services are delivered directly by our in-house specialists.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => navigate('/services', e)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Explore Our Services
              </button>
              <button
                type="button"
                onClick={(e) => navigate('/post-project', e)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Get a Custom Quote
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      mainContent = (
        <FreelancerSearchView
          usersList={users}
          gigs={gigs}
          navigate={navigate}
          currentUser={activeUser}
          setIsSignupModalOpen={setIsSignupModalOpen}
          slugify={slugify}
          query={currentSearchQuery}
        />
      );
    }
  } else if (isProjectDetail) {
    const projId = pathParts[1];
    const project = projects.find(
      p => p.id === projId || (p.slug && p.slug.toLowerCase() === projId.toLowerCase())
    );
    if (project) {
      mainContent = (
        <ProjectDetailView
          project={project}
          currentUser={activeUser as any}
          navigate={navigate}
          allProjects={visibleProjects}
          proposals={proposals}
          orders={orders}
          onRefresh={refresh}
        />
      );
    } else if (isBuyerOnlyUser) {
      mainContent = (
        <div className="max-w-xl mx-auto py-16 px-4 text-center font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs space-y-5">
            <h1 className="text-2xl font-bold text-slate-900">
              Request Access Restricted
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              As a client, you can only view and manage your own custom requests.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => navigate('/buyer-activity', e)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                View My Requests
              </button>
              <button
                type="button"
                onClick={(e) => navigate('/post-project', e)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Request Custom Quote
              </button>
            </div>
          </div>
        </div>
      );
    }
  } else if (isGigDetail) {
    let gig: Gig | undefined;
    const firstSeg = pathParts[0].toLowerCase();
    if (['services', 'service', 'gig', 'gigs'].includes(firstSeg)) {
      const gigParam = pathParts[1];
      const gigSlugParam = pathParts[2];
      gig = gigs.find(
        g =>
          (g.slug && g.slug.toLowerCase() === gigParam.toLowerCase()) ||
          g.id === gigParam ||
          (gigSlugParam && g.slug && g.slug.toLowerCase() === gigSlugParam.toLowerCase()) ||
          slugify(g.title) === gigParam.toLowerCase()
      );
    } else if (pathParts.length === 2) {
      const [, gigSlug] = pathParts;
      gig = gigs.find(
        g =>
          (g.slug && g.slug.toLowerCase() === gigSlug.toLowerCase()) ||
          g.id === gigSlug ||
          slugify(g.title) === gigSlug.toLowerCase()
      );
    }
    if (gig) {
      mainContent = (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <GigDetailView
            currentGig={gig}
            gigs={gigs}
            reviews={reviews}
            orders={orders}
            currentUser={activeUser}
            navigate={navigate}
            handleContactSeller={handleContactSeller}
            handleCreateOrder={handleCreateOrder}
            isCreatingOrder={isCreatingOrder}
            orderFeedback={orderFeedback}
            onDismissOrderFeedback={() => setOrderFeedback(null)}
            slugify={slugify}
          />
        </div>
      );
    }
  } else if (cleanPath === '/payments' || cleanPath.startsWith('/payments')) {
    mainContent = (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <PaymentsModule
          currentUser={activeUser}
          orders={orders}
          offers={offers}
          gigs={gigs}
          projects={projects}
          proposals={proposals}
          users={users}
          platformFee={platformFee}
          clientServiceFee={clientServiceFee}
          smallOrderFeeThreshold={smallOrderFeeThreshold}
          smallOrderFeeAmount={smallOrderFeeAmount}
          escrowProtectionDays={escrowProtectionDays}
          navigate={navigate}
          onOpenWorkstream={(ord) => {
            setSelectedOrder(ord);
            navigate(`/workstream/${ord.id}`);
          }}
          onBalanceUpdate={refresh}
        />
      </div>
    );
  } else if (
    (pathParts.length === 1 && !RESERVED_ROUTES.includes(pathParts[0].toLowerCase())) ||
    (pathParts.length === 2 && ['profile', 'freelancer', 'user', 'freelancers'].includes(pathParts[0].toLowerCase()))
  ) {
    const usernameParam = (pathParts.length === 2 ? pathParts[1] : pathParts[0]).toLowerCase();
    const matchedUser = users.find(
      u =>
        (u.username && u.username.toLowerCase() === usernameParam) ||
        slugify(u.name) === usernameParam ||
        u.id === usernameParam
    );
    if (matchedUser) {
      mainContent = (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <FreelancerProfileView
            profileUser={matchedUser}
            currentUser={activeUser}
            gigs={gigs}
            reviews={reviews}
            onNavigate={navigate}
            onEditProfile={() => navigate('/edit-profile')}
            onContact={(targetId) => handleContactSeller(targetId || matchedUser.id, matchedUser.name, `Consultation with ${matchedUser.name}`)}
          />
        </div>
      );
    }
  }

  // Fallback to AgencyHomePage on '/' or MarketplaceGigsView on catalog routes
  if (!mainContent) {
    if (cleanPath === '/') {
      mainContent = (
        <AgencyHomePage
          gigs={gigs.length > 0 ? gigs : filteredGigs}
          projects={visibleProjects}
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
    } else {
      mainContent = (
        <MarketplaceGigsView
          filteredGigs={filteredGigs}
          allGigs={gigs}
          projects={visibleProjects}
          reviews={reviews}
          currentCategory={currentCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          serviceOptionFilter={serviceOptionFilter}
          setServiceOptionFilter={setServiceOptionFilter}
          sellerLevelFilter={sellerLevelFilter}
          setSellerLevelFilter={setSellerLevelFilter}
          budgetFilter={budgetFilter}
          setBudgetFilter={setBudgetFilter}
          deliveryTimeFilter={deliveryTimeFilter}
          setDeliveryTimeFilter={setDeliveryTimeFilter}
          onlineNowOnly={onlineNowOnly}
          setOnlineNowOnly={setOnlineNowOnly}
          gigViewMode={gigViewMode}
          setGigViewMode={setGigViewMode}
          likedGigIds={likedGigIds}
          handleToggleLike={handleToggleLike}
          navigate={navigate}
          getGigUrl={getGigUrl}
          currentUser={activeUser}
          setIsSignupModalOpen={setIsSignupModalOpen}
          slugify={slugify}
          CATEGORY_SLUGS={CATEGORY_SLUGS}
          isHomePage={false}
        />
      );
    }
  }

  const handleStopImpersonation = () => {
    setImpersonatedUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Impersonation Banner for Super Admin */}
      <ImpersonationBanner
        impersonatedUser={impersonatedUser}
        onStop={handleStopImpersonation}
      />

      {/* Main Global Header */}
      <Header
        navigate={navigate}
        currentUser={activeUser}
        sessionReady={sessionReady}
        orders={orders}
        likedGigIds={likedGigIds}
        isGigsList={isGigsList}
        isGigDetail={isGigDetail}
        isProjectsList={isProjectsList}
        isProjectDetail={isProjectDetail}
        isCategoryRoute={isCategoryRoute}
        loadUserSession={loadUserSession}
        updateCurrentUser={updateCurrentUser}
        setImpersonatedUser={setImpersonatedUser}
        setSelectedOrder={setSelectedOrder}
        setPath={setCurrentPath}
        fetchMessages={workstream.fetchMessages}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenSignup={() => setIsSignupModalOpen(true)}
      />

      {/* Order Purchase Status Banner */}
      {orderFeedback && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 shadow-sm flex items-center justify-between gap-4 text-xs font-medium ${
              orderFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  orderFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              />
              <span className="font-bold">{orderFeedback.message}</span>
              {orderFeedback.orderId && cleanPath !== `/workstream/${orderFeedback.orderId}` && cleanPath !== `/messages/${orderFeedback.orderId}` && (
                <button
                  type="button"
                  onClick={(e) => navigate(`/workstream/${orderFeedback.orderId}`, e)}
                  className="underline font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer ml-1"
                >
                  View Workstream #{orderFeedback.orderId}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOrderFeedback(null)}
              className="text-slate-500 hover:text-slate-900 font-bold px-2 py-0.5 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Page Content Body */}
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto py-16 px-4 flex items-center justify-center">
              <div
                className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"
                aria-label="Loading view"
              />
            </div>
          }
        >
          {mainContent}
        </Suspense>
      </main>

      {/* Global Footer */}
      <Footer navigate={navigate} />

      {/* Auth & Utility Modals (lazily loaded on demand) */}
      {isLoginModalOpen && (
        <Suspense fallback={null}>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            loginRequiresCode={loginRequiresCode}
            loginVerificationMessage={loginVerificationMessage}
            mockEmailCodeDisplay={mockEmailCodeDisplay}
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            loginCode={loginCode}
            setLoginCode={setLoginCode}
            handleLoginSubmit={handleLoginSubmit}
            setLoginRequiresCode={setLoginRequiresCode}
            usersList={users}
            updateCurrentUser={updateCurrentUser}
            setImpersonatedUser={setImpersonatedUser}
            refresh={refresh}
            setIsForgotPasswordModalOpen={setIsForgotPasswordModalOpen}
            setMockEmailCodeDisplay={setMockEmailCodeDisplay}
            loginError={loginError}
            isSubmittingLogin={isSubmittingLogin}
            onSwitchToSignup={() => {
              setIsLoginModalOpen(false);
              setIsSignupModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {isSignupModalOpen && (
        <Suspense fallback={null}>
          <SignupModal
            isOpen={isSignupModalOpen}
            onClose={() => setIsSignupModalOpen(false)}
            handleSignupSubmit={handleSignupSubmit}
            signupName={signupName}
            setSignupName={setSignupName}
            signupEmail={signupEmail}
            setSignupEmail={setSignupEmail}
            signupMobile={signupMobile}
            setSignupMobile={setSignupMobile}
            signupPassword={signupPassword}
            setSignupPassword={setSignupPassword}
            signupConfirmPassword={signupConfirmPassword}
            setSignupConfirmPassword={setSignupConfirmPassword}
            signupError={signupError}
            isSubmittingSignup={isSubmittingSignup}
            onSwitchToLogin={() => {
              setIsSignupModalOpen(false);
              setIsLoginModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {isForgotPasswordModalOpen && (
        <Suspense fallback={null}>
          <ForgotPasswordModal
            isOpen={isForgotPasswordModalOpen}
            onClose={() => setIsForgotPasswordModalOpen(false)}
            forgotStep={forgotStep}
            setForgotStep={setForgotStep}
            forgotQuery={forgotQuery}
            setForgotQuery={setForgotQuery}
            forgotCode={forgotCode}
            setForgotCode={setForgotCode}
            mockForgotCodeDisplay={mockForgotCodeDisplay}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmNewPassword={confirmNewPassword}
            setConfirmNewPassword={setConfirmNewPassword}
            handleForgotRequest={handleForgotRequest}
            handleForgotVerify={handleForgotVerify}
            handleForgotReset={handleForgotReset}
            setForgotCodeEmpty={() => setForgotCode('')}
          />
        </Suspense>
      )}

      {isVerifyModalOpen && (
        <Suspense fallback={null}>
          <VerifyModal
            isOpen={isVerifyModalOpen}
            onClose={() => setIsVerifyModalOpen(false)}
            verificationMode={verificationMode}
            setVerificationMode={setVerificationMode}
            emailCodeInput={emailCodeInput}
            setEmailCodeInput={setEmailCodeInput}
            smsCodeInput={smsCodeInput}
            setSmsCodeInput={setSmsCodeInput}
            handleVerifyEmailSubmit={handleVerifyEmailSubmit}
            handleVerifySmsSubmit={(e) => e.preventDefault()}
            handleResendEmailCode={() => {}}
            handleResendSmsCode={() => {}}
            verifyEmail={verifyEmail}
            mockEmailCodeDisplay={mockEmailCodeDisplay || undefined}
          />
        </Suspense>
      )}

      {isSupportModalOpen && (
        <Suspense fallback={null}>
          <SupportModal
            isOpen={isSupportModalOpen}
            onClose={() => setIsSupportModalOpen(false)}
            supportSubject={supportSubject}
            setSupportSubject={setSupportSubject}
            supportMessage={supportMessage}
            setSupportMessage={setSupportMessage}
            onSubmitTicket={(e) => {
              e.preventDefault();
              setIsSupportModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {isWishlistModalOpen && (
        <Suspense fallback={null}>
          <WishlistModal
            isOpen={isWishlistModalOpen}
            onClose={() => setIsWishlistModalOpen(false)}
            likedGigIds={likedGigIds}
            gigs={gigs}
            onToggleLike={(id) => handleToggleLike(id)}
            getGigUrl={getGigUrl}
            navigate={navigate}
          />
        </Suspense>
      )}

      {isEmailNotificationsModalOpen && (
        <Suspense fallback={null}>
          <EmailNotificationsModal
            isOpen={isEmailNotificationsModalOpen}
            onClose={() => setIsEmailNotificationsModalOpen(false)}
            userEmails={userEmails as any}
            userEmail={activeUser?.email || ''}
            onMarkAsRead={() => {}}
            onOpenSupport={() => setIsSupportModalOpen(true)}
          />
        </Suspense>
      )}
    </div>
  );
}
