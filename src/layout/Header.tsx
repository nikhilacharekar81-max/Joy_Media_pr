import React, { useEffect, useRef, useState } from 'react';
import {
  Bell, Briefcase, ChevronDown, FileText, Heart, HelpCircle, LayoutDashboard,
  LogOut, Mail, Menu, Pencil, PlusCircle, Search, Settings, Sparkles, User, Users, Wallet,
  Volume2, VolumeX, X
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../components/HeaderCategoriesNav';
import { slugify } from '../utils/slugify';
import type { Order, UserAccount } from '../types';
import { isStaffRole } from '../types';
import { clearAuthToken, getAuthToken } from '../utils/authToken';
import { DEFAULT_AVATAR, getUserInitialsAvatar } from '../constants';
import { AGENCY_MODE, SITE_CONFIG } from '../siteConfig';

export interface HeaderProps {
  navigate: (to: string, e?: React.MouseEvent) => void;
  currentUser: UserAccount | null;
  orders: Order[];
  likedGigIds: string[];
  /** Route flags used to highlight / scope the category dropdown. */
  isGigsList: boolean;
  isGigDetail: boolean;
  isProjectsList: boolean;
  isProjectDetail: boolean;
  isCategoryRoute: boolean;
  loadUserSession: () => Promise<boolean>;
  updateCurrentUser: (u: UserAccount | null | ((prev: UserAccount | null) => UserAccount | null)) => void;
  setImpersonatedUser: (u: UserAccount | null) => void;
  setSelectedOrder: (o: Order | null) => void;
  setPath: (p: string) => void;
  fetchMessages: (orderId: string) => void | Promise<void>;
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
  sessionReady?: boolean;
}

/** Site header: brand, primary nav, category/search/workstream dropdowns and the user menu. */
export function Header({
  navigate, currentUser, orders, likedGigIds,
  isGigsList, isGigDetail, isProjectsList, isProjectDetail, isCategoryRoute,
  loadUserSession, updateCurrentUser, setImpersonatedUser, setSelectedOrder, setPath, fetchMessages,
  onOpenLogin, onOpenSignup, sessionReady = true
}: HeaderProps) {
  // Dropdown state is local to the header (moved out of App).
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isWorkstreamsDropdownOpen, setIsWorkstreamsDropdownOpen] = useState(false);
  const [isHeaderSearchDropdownOpen, setIsHeaderSearchDropdownOpen] = useState(false);
  const [isHeaderCategoriesDropdownOpen, setIsHeaderCategoriesDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleAvailableNow = () => {
    if (!currentUser) return;
    const updated = { ...currentUser, isAvailableNow: !currentUser.isAvailableNow };
    updateCurrentUser(updated);
  };

  // Close dropdowns on outside click
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        let stored = localStorage.getItem('joymediapr_notif_sound');
        if (stored === null) {
          const legacy = localStorage.getItem('worksphere_notif_sound');
          if (legacy !== null) {
            stored = legacy;
            localStorage.setItem('joymediapr_notif_sound', legacy);
          }
        }
        if (stored === 'false') {
          setSoundEnabled(false);
        }
      } catch {}
    }
  }, []);

  const playNotificationSound = () => {
    try {
      const soundOn = typeof window !== 'undefined'
        ? (localStorage.getItem('joymediapr_notif_sound') ?? localStorage.getItem('worksphere_notif_sound')) !== 'false'
        : true;
      if (!soundOn) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') { ctx.resume(); }
      const now = ctx.currentTime;

      const compressor = ctx.createDynamicsCompressor();
      compressor.connect(ctx.destination);

      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(1.0, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(compressor);
        osc.start(start);
        osc.stop(start + duration);
      };

      playBeep(880, now, 0.18);
      playBeep(1175, now + 0.20, 0.18);
      playBeep(880, now + 0.40, 0.22);
    } catch {}
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('joymediapr_notif_sound', String(next)); } catch {}
    }
  };

  const inFlightNotifsRef = useRef<Promise<void> | null>(null);
  const lastNotifsSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!sessionReady || !currentUser?.id || !token || typeof window === 'undefined') {
      if (!currentUser?.id || !token) {
        setNotifications([]);
        lastNotifsSessionRef.current = null;
      }
      return;
    }
    const sessionKey = `${currentUser.id}:${token}`;
    const fetchNotifs = async (force = false) => {
      const currentToken = getAuthToken();
      if (!currentToken) return;
      if (inFlightNotifsRef.current) return inFlightNotifsRef.current;
      if (!force && lastNotifsSessionRef.current === `${currentUser.id}:${currentToken}`) return;
      lastNotifsSessionRef.current = `${currentUser.id}:${currentToken}`;
      const p = (async () => {
        try {
          const res = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setNotifications(prev => {
              const prevUnread = prev.filter(n => !n.read).length;
              const newUnread = (data as any[]).filter(n => !n.read).length;
              if (newUnread > prevUnread && prev.length > 0) {
                playNotificationSound();
              }
              return data;
            });
          } else {
            lastNotifsSessionRef.current = null;
          }
        } catch {
          lastNotifsSessionRef.current = null;
        } finally {
          inFlightNotifsRef.current = null;
        }
      })();
      inFlightNotifsRef.current = p;
      return p;
    };
    if (lastNotifsSessionRef.current !== sessionKey) {
      fetchNotifs(false);
    }
    const interval = setInterval(() => fetchNotifs(true), 30000);
    const handleRealtimeNotification = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (detail && detail.id) {
        setNotifications(prev => {
          if (prev.some(n => n.id === detail.id)) return prev;
          playNotificationSound();
          return [detail, ...prev];
        });
      } else {
        fetchNotifs(true);
      }
    };
    window.addEventListener('agency:notification', handleRealtimeNotification as EventListener);
    return () => {
      clearInterval(interval);
      window.removeEventListener('agency:notification', handleRealtimeNotification as EventListener);
    };
  }, [currentUser?.id, sessionReady]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string, link?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
    if (link) {
      setIsNotificationsDropdownOpen(false);
      navigate(link);
    }
  };

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };


  useEffect(() => {
    const handleOutsideClick = () => {
      if (isUserDropdownOpen) setIsUserDropdownOpen(false);
      if (isWorkstreamsDropdownOpen) setIsWorkstreamsDropdownOpen(false);
      if (isHeaderSearchDropdownOpen) setIsHeaderSearchDropdownOpen(false);
      if (isHeaderCategoriesDropdownOpen) setIsHeaderCategoriesDropdownOpen(false);
      if (isNotificationsDropdownOpen) setIsNotificationsDropdownOpen(false);
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    };
    if (isUserDropdownOpen || isWorkstreamsDropdownOpen || isHeaderSearchDropdownOpen || isHeaderCategoriesDropdownOpen || isNotificationsDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isUserDropdownOpen, isWorkstreamsDropdownOpen, isHeaderSearchDropdownOpen, isHeaderCategoriesDropdownOpen, isNotificationsDropdownOpen, isMobileMenuOpen]);

  useEffect(() => {
    if (!currentUser) {
      setIsWorkstreamsDropdownOpen(false);
      setIsUserDropdownOpen(false);
    }
  }, [currentUser]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200/80 backdrop-blur-md w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2 lg:gap-4 w-full">
        {/* Zone 1: Brand Wordmark & Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setIsUserDropdownOpen(false);
              setIsWorkstreamsDropdownOpen(false);
              setIsHeaderSearchDropdownOpen(false);
              setIsHeaderCategoriesDropdownOpen(false);
              setIsNotificationsDropdownOpen(false);
            }}
            className="xl:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="/"
            onClick={(e) => navigate('/', e)}
            className="text-xl font-extrabold tracking-tight text-slate-900 hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0"
          >
            {SITE_CONFIG.brandWordmark}
          </a>
        </div>

        {/* Zone 2: Compact Single-Line Agency Navigation Links */}
        <nav aria-label="Primary Navigation" className="hidden xl:flex items-center gap-4 2xl:gap-5 forced-13-17 font-semibold text-slate-600 min-w-0">
          <a
            href="/"
            onClick={(e) => navigate('/', e)}
            className="hover:text-slate-900 transition-colors py-1 whitespace-nowrap"
          >
            Home
          </a>
          <a
            href="/categories/seo"
            onClick={(e) => navigate('/categories/seo', e)}
            className="hover:text-slate-900 transition-colors py-1 whitespace-nowrap"
          >
            Guest Posting
          </a>
          <a
            href="/categories/pr-press-releases"
            onClick={(e) => navigate('/categories/pr-press-releases', e)}
            className="hover:text-slate-900 transition-colors py-1 whitespace-nowrap"
          >
            Press Releases
          </a>
          <a
            href="/categories/ugc-ai-videos"
            onClick={(e) => navigate('/categories/ugc-ai-videos', e)}
            className="text-orange-600 hover:text-orange-700 transition-colors py-1 whitespace-nowrap"
          >
            UGC AI Videos
          </a>
          <a
            href="/categories/web-development"
            onClick={(e) => navigate('/categories/web-development', e)}
            className="hover:text-emerald-700 transition-colors py-1 whitespace-nowrap"
          >
            Web Dev
          </a>
          <a
            href="/categories/ecommerce"
            onClick={(e) => navigate('/categories/ecommerce', e)}
            className="hover:text-emerald-700 transition-colors py-1 whitespace-nowrap"
          >
            Shopify
          </a>
          <a
            href="/categories/software-development"
            onClick={(e) => navigate('/categories/software-development', e)}
            className="hover:text-orange-600 transition-colors py-1 whitespace-nowrap"
          >
            Digital Products
          </a>
          <a
            href="/support"
            onClick={(e) => navigate('/support', e)}
            className="hover:text-emerald-700 transition-colors py-1 whitespace-nowrap"
          >
            Contact
          </a>
        </nav>

        {/* Zone 3: Workstream, Wishlist, Notifications, Login/Register & Profile Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Wishlist Icon */}
          <button
            type="button"
            onClick={(e) => navigate('/wishlist', e)}
            className="p-2 text-slate-700 hover:text-orange-600 rounded-xl hover:bg-orange-50/70 transition-colors relative cursor-pointer"
            title="Wishlist / Saved Placements"
          >
            <Heart className="w-5 h-5 text-slate-700" />
            {likedGigIds.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white rounded-full text-[10px] leading-[14px] font-sans font-bold flex items-center justify-center shadow-xs">
                {likedGigIds.length}
              </span>
            )}
          </button>

          {/* Workstream Icon & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!currentUser) {
                  void loadUserSession();
                }
                setIsWorkstreamsDropdownOpen(!isWorkstreamsDropdownOpen);
                setIsUserDropdownOpen(false);
                setIsNotificationsDropdownOpen(false);
                setIsHeaderSearchDropdownOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-slate-800 hover:text-emerald-700 rounded-xl hover:bg-slate-100 transition-colors relative cursor-pointer forced-13-17 font-semibold"
              title="Workstreams & Messages"
            >
              <Mail className="w-5 h-5 text-slate-700 shrink-0" />
              <span className="hidden md:inline">Workstream</span>
              {orders.length > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] leading-none font-mono font-bold">
                  {orders.length}
                </span>
              )}
            </button>

            {isWorkstreamsDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3.5 z-[100] text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 pb-3 mb-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workstreams</span>
                  <span className="text-xs font-mono text-emerald-600 font-bold">{orders.length} Active</span>
                </div>

                {orders.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2.5">
                    <Mail className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No active orders yet</p>
                    <p className="text-[11px] text-slate-500">
                      Browse our services or request a custom quote to get started.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          setIsWorkstreamsDropdownOpen(false);
                          navigate('/services', e);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Explore Services
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {orders.slice(0, 5).map(ord => {
                      const activeUid = currentUser?.id;
                      const isBuyer = activeUid === ord.buyerId;
                      const partner = isBuyer ? (ord as any).seller : (ord as any).buyer;
                      const partnerName = partner?.name || (isBuyer ? ord.sellerUsername || SITE_CONFIG.brandName : ord.buyerUsername || 'Client');
                      const partnerAvatar = partner?.avatar;
                      const previewText = (ord as any).lastMessage || ord.title;
                      const rawDate = (ord as any).lastMessageTime || ord.createdAt;
                      const parsedDate = rawDate ? new Date(rawDate) : null;
                      const formattedDate = parsedDate && !isNaN(parsedDate.getTime())
                        ? parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : (typeof rawDate === 'string' ? rawDate : '');
                      return (
                        <div
                          key={ord.id}
                          onClick={(e) => {
                            setSelectedOrder(ord);
                            fetchMessages(ord.id);
                            setIsWorkstreamsDropdownOpen(false);
                            navigate('/workstream/' + ord.id, e);
                          }}
                          className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
                        >
                          {partnerAvatar ? (
                            <img
                              src={partnerAvatar || DEFAULT_AVATAR}
                              alt={partnerName}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0 mt-0.5"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {partnerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="font-bold text-slate-900 truncate">{partnerName}</span>
                              <span className="text-xs text-slate-400 whitespace-nowrap font-mono">{formattedDate}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {previewText}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2 px-3 border-t border-slate-100 mt-2 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsWorkstreamsDropdownOpen(false);
                      navigate('/messages', e);
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold !text-[12px] !leading-[18px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    View All Workstreams
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Icon & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen);
                setIsUserDropdownOpen(false);
                setIsWorkstreamsDropdownOpen(false);
              }}
              className="p-2 text-slate-700 hover:text-orange-600 rounded-xl hover:bg-orange-50/70 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-orange-500 text-white font-bold text-[10px] rounded-full min-w-4 text-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-3 z-[100] text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSound}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    </button>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No notifications yet. You're all caught up!
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={(e) => markAsRead(n.id, n.link, e)}
                        className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.read ? 'bg-emerald-50/40' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                          <p className="text-[11.5px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {(() => {
                              const d = n.createdAt ? new Date(n.createdAt) : null;
                              if (d && !isNaN(d.getTime())) {
                                return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${d.toLocaleDateString()}`;
                              }
                              return n.createdAt || '';
                            })()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Login & Register Buttons (Shown only when user is NOT logged in) */}
          {!currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-slate-200">
              <button
                type="button"
                onClick={(e) => {
                  if (onOpenLogin) onOpenLogin();
                  else navigate('/login', e);
                }}
                className="px-2.5 py-1.5 forced-13-17 font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors whitespace-nowrap"
              >
                Login
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (onOpenSignup) onOpenSignup();
                  else navigate('/signup', e);
                }}
                className="px-3 py-1.5 forced-13-17 font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
              >
                Register
              </button>
            </div>
          )}

          {/* Profile Icon / Avatar & Dropdown (Always visible and interactive) */}
          <div className="relative pl-1.5 border-l border-slate-200 flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsUserDropdownOpen(!isUserDropdownOpen);
                setIsWorkstreamsDropdownOpen(false);
                setIsNotificationsDropdownOpen(false);
              }}
              className="relative flex items-center gap-1.5 cursor-pointer p-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 bg-transparent"
              title={currentUser ? `${currentUser.name} — Account & Profile` : 'Account & Profile Menu'}
            >
              {currentUser ? (
                <img
                  src={currentUser.avatar || getUserInitialsAvatar(currentUser.name)}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = getUserInitialsAvatar(currentUser.name);
                    if (img.src !== fallback) {
                      img.src = fallback;
                    }
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-700 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isUserDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-[100] text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                {currentUser ? (
                  <>
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{currentUser.name}</span>
                        {isStaffRole(currentUser.role) && (
                          <span className="text-xs text-slate-400 uppercase">{currentUser.role}</span>
                        )}
                      </div>
                      {(!AGENCY_MODE || isStaffRole(currentUser.role)) && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold uppercase ${currentUser.isAvailableNow ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {currentUser.isAvailableNow ? 'Online' : 'Away'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleAvailableNow(); }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              currentUser.isAvailableNow ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                            role="switch"
                            aria-checked={currentUser.isAvailableNow}
                            title="Toggle availability status"
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                currentUser.isAvailableNow ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    {(!AGENCY_MODE || isStaffRole(currentUser.role)) && (
                      <button
                        type="button"
                        onClick={(e) => { setIsUserDropdownOpen(false); navigate('/add-service', e); }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-600" />
                        <span>Add Service</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => { setIsUserDropdownOpen(false); navigate('/orders', e); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                      <span>Dashboard</span>
                    </button>

                    <div className="w-full px-3 py-1.5 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center justify-between transition group">
                      <button
                        type="button"
                        onClick={(e) => {
                          setIsUserDropdownOpen(false);
                          const pUrl = `/${slugify(currentUser.name)}`;
                          navigate(pUrl, e);
                        }}
                        className="flex items-center gap-2.5 flex-1 text-left cursor-pointer py-0.5"
                      >
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserDropdownOpen(false);
                          navigate('/edit-profile', e);
                        }}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-400 text-[11px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        title="Edit Profile"
                      >
                        <Pencil className="w-3 h-3 text-emerald-600" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { setIsUserDropdownOpen(false); navigate('/buyer-activity', e); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <span>My Requests</span>
                    </button>

                    {(!AGENCY_MODE || isStaffRole(currentUser.role)) && (
                      <button
                        type="button"
                        onClick={(e) => { setIsUserDropdownOpen(false); navigate('/freelance-activity', e); }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                        <span>Team Activity</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => { setIsUserDropdownOpen(false); navigate('/payments', e); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Billing</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        setIsUserDropdownOpen(false);
                        navigate('/settings', e);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-emerald-600" />
                      <span>Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { setIsUserDropdownOpen(false); navigate('/support', e); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span>Customer Support</span>
                    </button>

                    <div className="my-1 border-t border-slate-100"></div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setImpersonatedUser(null);
                        updateCurrentUser(null);
                        clearAuthToken();
                        try {
                          localStorage.removeItem('user');
                          localStorage.removeItem('current_user');
                        } catch {}
                        setPath('/services');
                        window.history.pushState({}, '', '/services');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Log Out</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <span className="font-bold text-slate-900 block">Welcome to {SITE_CONFIG.brandName}</span>
                      <span className="text-xs text-slate-500">Sign in or create an account</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        setIsUserDropdownOpen(false);
                        if (onOpenLogin) onOpenLogin();
                        else navigate('/login', e);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>Login</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        setIsUserDropdownOpen(false);
                        if (onOpenSignup) onOpenSignup();
                        else navigate('/signup', e);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      <span>Register Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        setIsUserDropdownOpen(false);
                        navigate('/support', e);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span>Customer Support</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div 
          className="absolute left-0 top-full w-full bg-white border-b border-slate-200 shadow-2xl py-5 px-5 xl:hidden z-[150] text-sm animate-in fade-in slide-in-from-top duration-150 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            {/* Primary Agency Services Links */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-400 px-1">Agency Navigation</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  { label: 'Home', path: '/' },
                  { label: 'Guest Posting', path: '/categories/seo' },
                  { label: 'Press Releases', path: '/categories/pr-press-releases' },
                  { label: 'UGC AI Videos', path: '/categories/ugc-ai-videos' },
                  { label: 'Web Development', path: '/categories/web-development' },
                  { label: 'Shopify Services', path: '/categories/ecommerce' },
                  { label: 'Digital Products', path: '/categories/software-development' },
                  { label: 'Contact Support', path: '/support' },
                  { label: 'Client Requests', path: '/projects' }
                ].map((navItem) => (
                  <button
                    key={navItem.label}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      navigate(navItem.path, e);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {navItem.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary & Secondary Mobile CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  navigate('/services', e);
                }}
                className="w-full py-3 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
              >
                Explore Media Placements
              </button>
              <button
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  navigate('/post-project', e);
                }}
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-semibold text-xs rounded-xl transition-colors text-center cursor-pointer"
              >
                Get a Custom Quote
              </button>
            </div>

            {/* Top Categories */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Categories</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SERVICE_CATEGORIES.slice(0, 6).map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      navigate(`/categories/${cat.slug}`, e);
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors truncate"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* User / Auth Section */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              {currentUser ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl">
                    <img
                      src={currentUser.avatar || getUserInitialsAvatar(currentUser.name)}
                      alt={currentUser.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">{currentUser.name}</p>
                      {isStaffRole(currentUser.role) && (
                        <p className="text-xs text-emerald-600 uppercase font-semibold">{currentUser.role}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        setIsMobileMenuOpen(false);
                        navigate('/buyer-activity', e);
                      }}
                      className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl transition cursor-pointer text-center"
                    >
                      My Requests
                    </button>
                    {(!AGENCY_MODE || isStaffRole(currentUser.role)) && (
                      <button
                        onClick={(e) => {
                          setIsMobileMenuOpen(false);
                          navigate('/freelance-activity', e);
                        }}
                        className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition cursor-pointer text-center"
                      >
                        Team Activity
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        setIsMobileMenuOpen(false);
                        navigate('/orders', e);
                      }}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer text-center"
                    >
                      My Orders
                    </button>
                    <button
                      onClick={(e) => {
                        setIsMobileMenuOpen(false);
                        navigate('/messages', e);
                      }}
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition cursor-pointer text-center"
                    >
                      {`Order Updates (${orders.length})`}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setImpersonatedUser(null);
                      updateCurrentUser(null);
                      clearAuthToken();
                      try {
                        localStorage.removeItem('user');
                        localStorage.removeItem('current_user');
                      } catch {}
                      setPath('/services');
                      window.history.pushState({}, '', '/services');
                    }}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition text-center cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      if (onOpenLogin) onOpenLogin();
                      else navigate('/login', e);
                    }}
                    className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition text-center cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      if (onOpenSignup) onOpenSignup();
                      else navigate('/signup', e);
                    }}
                    className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition text-center cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
