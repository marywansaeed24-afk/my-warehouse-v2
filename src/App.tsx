import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Tag, 
  ClipboardCheck, 
  Bell, 
  Hammer, 
  MoreHorizontal, 
  LogOut, 
  Package,
  Boxes,
  History,
  TrendingDown,
  Calendar,
  X,
  Minus,
  DollarSign,
  ArrowRightLeft,
  Globe,
  ExternalLink,
  ArrowRight,
  ChevronDown,
  WashingMachine,
  Tv,
  Speaker,
  Smartphone,
  Snowflake,
  Fan,
  Microwave,
  Zap,
  Clock,
  Trash2,
  Settings,
  Download,
  Upload,
  FileJson,
  RotateCcw,
  Menu,
  BarChart2,
  Home,
  Grid,
  UserPlus,
  LayoutGrid, 
  Loader2, 
  User, 
  Key, 
  Phone, 
  ShieldCheck, 
  UserCircle, 
  LogIn,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  RefreshCw,
  PackageCheck,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  auth, 
  db, 
  authService, 
  userService, 
  warehouseService, 
  inviteService, 
  logService,
  brokenService,
  UserProfile,
  BrokenRecord,
  WarehouseItem as FBWarehouseItem
} from './services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';

const CATEGORY_ICONS = [
  { id: 'Package', icon: <Package />, label: 'گشتی' },
  { id: 'WashingMachine', icon: <WashingMachine />, label: 'تەلاجە' },
  { id: 'Snowflake', icon: <Snowflake />, label: 'موجەمیدە' },
  { id: 'Tv', icon: <Tv />, label: 'تەلەفزیۆن' },
  { id: 'Microwave', icon: <Microwave />, label: 'فڕن' },
  { id: 'Fan', icon: <Fan />, label: 'پانەکە' },
  { id: 'Speaker', icon: <Speaker />, label: 'سپیکەر' },
  { id: 'Smartphone', icon: <Smartphone />, label: 'مۆبایل' },
  { id: 'Zap', icon: <Zap />, label: 'کارەبایی' }
];

const ITEM_COLORS = [
  { id: 'white', value: '#FFFFFF', border: '#E5E7EB' },
  { id: 'silver', value: '#C0C0C0', border: '#9CA3AF' },
  { id: 'black', value: '#1A1A1A', border: '#000000' },
  { id: 'grey', value: '#6B7280', border: '#4B5563' },
  { id: 'gold', value: '#D4AF37', border: '#B8860B' },
  { id: 'red', value: '#DC2626', border: '#991B1B' },
  { id: 'blue', value: '#2563EB', border: '#1E40AF' },
];

const BRANDS = [
  { name: 'BALSAN', color: '#E30613', family: 'font-sans font-black tracking-tighter' },
  { name: 'LG', color: '#A50034', family: 'font-sans font-black italic tracking-tight' },
  { name: 'ROYAL', color: '#B8860B', family: 'font-serif font-bold italic' },
  { name: 'SUNNY', color: '#FFA500', family: 'font-sans font-extrabold tracking-widest' },
  { name: 'SONIC', color: '#0047AB', family: 'font-mono font-black italic' },
  { name: 'INOX', color: '#00CED1', family: 'font-sans font-thin tracking-[0.3em]' },
  { name: 'NEVAL', color: '#2E8B57', family: 'font-serif font-black' },
  { name: 'GOSONIC', color: '#333333', family: 'font-sans font-black italic' }
];

const safeDate = (val: any) => {
  if (!val) return null;
  // Handle Firestore Timestamp objects
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FBWarehouseItem[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'price' | 'check' | 'alerts' | 'broken' | 'settings' | 'stats' | 'profile' | 'users'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<FBWarehouseItem | null>(null);
  const [usdRate, setUsdRate] = useState(150000);

  // Fetch real-time exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate');
        const data = await response.json();
        if (data.rate) {
          setUsdRate(data.rate);
        }
      } catch (error) {
        console.error('Error fetching rate from backend:', error);
      }
    };
    fetchRate();
  }, []);

  const [inviteCode, setInviteCode] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [authStep, setAuthStep] = useState<'welcome' | 'signup_form' | 'login_invite' | 'login_profile' | 'pending' | 'authenticated'>('welcome');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        setDisplayName(fbUser.displayName || '');
        const userProfile = await userService.getUserProfile(fbUser.uid);
        
        if (userProfile) {
          setProfile(userProfile);
          if (userProfile.status === 'pending') {
            setAuthStep('pending');
          } else {
            setAuthStep('authenticated');
          }
        } else {
          // If logged in but no profile, we create one using the form data
          if (authMode === 'signup') {
            // Manager/Admin creation
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: email || fbUser.email || '',
              displayName: displayName || fbUser.displayName || 'Manager',
              role: 'admin',
              phoneNumber: phone || '',
              status: 'active',
              createdAt: Date.now()
            };
            await userService.createUserProfile(newProfile);
            setProfile(newProfile);
            setAuthStep('authenticated');
          } else if (authMode === 'login') {
            // Staff creation
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: displayName || fbUser.displayName || 'Staff',
              role: 'staff',
              phoneNumber: phone || '',
              status: 'pending',
              createdAt: Date.now(),
              inviteCode: inviteCode
            };
            await userService.createUserProfile(newProfile);
            await inviteService.useInvite(inviteCode, fbUser.uid);
            setProfile(newProfile);
            setAuthStep('pending');
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setAuthStep('welcome');
      }
      setLoading(false);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, [authMode]);

  // Data Listeners
  useEffect(() => {
    if (!profile || profile.status !== 'active') {
      setItems([]);
      setLogs([]);
      return;
    }

    const unsubItems = warehouseService.subscribeItems(setItems);
    const unsubLogs = logService.subscribeLogs(setLogs);

    return () => {
      unsubItems();
      unsubLogs();
    };
  }, [profile]);

  const handleStartAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    if (mode === 'signup') {
      setAuthStep('signup_form');
    } else {
      setAuthStep('login_invite');
    }
  };

  const handleFinalAuth = async () => {
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      setIsAuthLoading(false);
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('Popup request was cancelled by user or overlapping request.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        alert('پەنجەرەی چوونە ژوورەوە داخرا. تکایە دووبارە هەوڵ بدەرەوە.');
      } else {
        console.error(error);
        alert('هەڵەیەک ڕوویدا لە کاتی چوونە ژوورەوە.');
      }
    }
  };
  
  const handleLogout = async () => {
    await authService.logout();
    setActiveTab('all');
  };

  const handleInviteContinue = async () => {
    if (!inviteCode) {
      alert('تکایە کۆدی بانگهێشت داخل بکە');
      return;
    }
    const invite = await inviteService.checkInvite(inviteCode);
    if (invite) {
      setAuthStep('login_profile');
    } else {
      alert('کۆدی بانگهێشتکردن هەڵەیە یان پێشتر بەکارهێنراوە');
    }
  };

  const handleSignupFormContinue = () => {
    if (!displayName || !phone || !email) {
      alert('تکایە هەموو خانەکان پڕبکەرەوە');
      return;
    }
    handleFinalAuth();
  };

  const handleLoginProfileContinue = () => {
    if (!displayName || !phone) {
      alert('تکایە هەموو خانەکان پڕبکەرەوە');
      return;
    }
    handleFinalAuth();
  };

  const filteredItems = useMemo(() => {
    let result = items;
    
    if (activeTab === 'alerts') {
      result = items.filter(i => i.quantity <= i.lowStockThreshold && !i.isBroken);
    } else if (activeTab === 'broken') {
      result = items.filter(i => i.isBroken);
    }

    if (searchQuery) {
      result = result.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.brand && i.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.barcode && i.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.sku && i.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.location && i.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return result;
  }, [items, activeTab, searchQuery]);

  // Total Calculation
  const totals = useMemo(() => {
    let dinar = 0;
    let dollarValue = 0;
    let lowStockCount = 0;
    let brokenCount = 0;
    let totalItemsCount = 0;

    items.forEach(item => {
      const val = item.price * item.quantity;
      if (item.currency === 'USD') {
        dollarValue += val;
      } else {
        dinar += val;
      }
      
      if (item.quantity <= item.lowStockThreshold && !item.isBroken && item.quantity > 0) {
        lowStockCount++;
      }
      if (item.isBroken) {
        brokenCount++;
      }
      totalItemsCount += item.quantity;
    });

    const totalInDinar = dinar + (dollarValue * (usdRate / 100));
    const totalInDollar = dollarValue + (dinar / (usdRate / 100));

    return { dinar, dollarValue, lowStockCount, brokenCount, totalItemsCount, totalInDinar, totalInDollar };
  }, [items, usdRate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user || authStep === 'signup_form' || authStep === 'login_invite' || authStep === 'login_profile' || authStep === 'pending' || authStep === 'welcome') {
    return (
      <div className="min-h-screen bg-[#020408] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans" dir="rtl">
        {/* --- High-Tech Industrial Background Animation --- */}
        <div className="absolute inset-0 z-0 opacity-40">
          {/* Deep Space / Atmospheric Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e3a8a_0%,transparent_50%)] opacity-30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,#92400e_0%,transparent_30%)] opacity-20" />
          
          {/* Warehouse Perspective Grid */}
          <div className="absolute inset-0" style={{ 
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            transform: 'perspective(1000px) rotateX(60deg) translateY(-100px)',
            transformOrigin: 'top',
            maskImage: 'linear-gradient(to bottom, black, transparent)'
          }} />

          {/* Animated "Conveyor" Boxes */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: '-100%', y: 200 + (i * 80), opacity: 0 }}
                animate={{ 
                  x: '200%', 
                  opacity: [0, 0.5, 0.5, 0],
                  scale: [0.8, 1, 1, 0.8]
                }}
                transition={{ 
                  duration: 15 + (i * 2), 
                  repeat: Infinity, 
                  delay: i * 3,
                  ease: "linear"
                }}
                className="absolute w-12 h-12 border border-blue-500/20 bg-blue-500/5 rounded-lg flex items-center justify-center"
              >
                <div className="w-6 h-6 border-2 border-blue-400/20 rounded rotate-45" />
              </motion.div>
            ))}
          </div>

          {/* Glowing Logic Lines */}
          {[...Array(4)].map((_, i) => (
             <motion.div
               key={`line-${i}`}
               initial={{ x: i * 25 + '%', height: 0, opacity: 0 }}
               animate={{ 
                 height: ['0%', '100%', '0%'],
                 opacity: [0, 0.2, 0],
                 top: ['0%', '100%']
               }}
               transition={{ 
                 duration: 10 + i * 5, 
                 repeat: Infinity, 
                 ease: "easeInOut",
                 delay: i * 2 
               }}
               className="absolute w-[1px] bg-gradient-to-b from-transparent via-blue-500 to-transparent"
             />
          ))}
        </div>

        {/* --- Main Auth Card --- */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Card Glassmorphism Effect */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-[0_0_80px_rgba(37,99,235,0.1)]" />
          
          <div className="relative p-10 flex flex-col items-center">
            {/* Logo Section */}
            <div className="mb-10 relative">
               <motion.div 
                 animate={{ 
                   boxShadow: ['0 0 20px rgba(59,130,246,0.2)', '0 0 40px rgba(59,130,246,0.4)', '0 0 20px rgba(59,130,246,0.2)']
                 }}
                 transition={{ duration: 3, repeat: Infinity }}
                 className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center relative overflow-hidden group"
               >
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  >
                    <Package className="w-12 h-12 text-white" />
                  </motion.div>
                  {/* Digital Overlay */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(255,255,255,0.1) 50%)', backgroundSize: '100% 4px' }} />
               </motion.div>
            </div>

            <AnimatePresence mode="wait">
              {authStep === 'welcome' ? (
                <motion.div 
                  key="welcome" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }} 
                  className="w-full space-y-8"
                >
                  <div className="text-center space-y-3">
                    <h1 className="text-4xl font-black text-white tracking-tight">کۆگای من <span className="text-blue-500">PRO</span></h1>
                    <p className="text-blue-200/50 text-sm font-medium">بەڕێوەبردنی کاڵاکان بە شێوازێکی زیرەک و سەردەمیانە</p>
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <button 
                      onClick={() => handleStartAuth('login')}
                      className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] hover:bg-blue-500 transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-blue-900/40 group overflow-hidden relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <LogIn className="w-6 h-6" />
                      چوونە ژوورەوە (Login)
                    </button>
                    
                    <button 
                      onClick={() => handleStartAuth('signup')}
                      className="w-full bg-white/5 text-blue-100 border border-white/10 font-black py-5 rounded-[24px] hover:bg-white/10 transition-all flex items-center justify-center gap-4 active:scale-95 group"
                    >
                      <UserPlus className="w-6 h-6" />
                      دروستکردنی کۆگای نوێ (Signup)
                    </button>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-2">
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">AI Status: Ready</span>
                     </div>
                     <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Enterprise Edition • v2.6.0</p>
                  </div>
                </motion.div>
              ) : authStep === 'signup_form' ? (
                <motion.div 
                  key="signup_form" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }} 
                  className="w-full space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-white mb-2">دروستکردنی کۆگا</h2>
                    <p className="text-sm text-blue-200/40">زانیارییەکانی بەڕێوەبەر داخل بکە</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-blue-400/60 pr-2 uppercase tracking-widest">Manager Name</label>
                      <div className="relative group">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-300 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="ناوی بەڕێوەبەر" 
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          className="w-full bg-white/5 p-4 pr-12 rounded-2xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-blue-400/60 pr-2 uppercase tracking-widest">Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-300 transition-colors" />
                        <input 
                          type="tel" 
                          placeholder="ژمارەی مۆبایل" 
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full bg-white/5 p-4 pr-12 rounded-2xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-blue-400/60 pr-2 uppercase tracking-widest">Email Address</label>
                      <div className="relative group">
                        <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-300 transition-colors" />
                        <input 
                          type="email" 
                          placeholder="ئیمەیڵ (Gmail)" 
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-white/5 p-4 pr-12 rounded-2xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSignupFormContinue}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-4 active:scale-95"
                  >
                    {isAuthLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    بەردەوام بوون لەگەڵ Google
                  </button>
                  <button onClick={() => setAuthStep('welcome')} className="w-full text-blue-100/30 text-xs font-bold hover:text-white transition-colors">گەڕانەوە</button>
                </motion.div>
              ) : authStep === 'login_invite' ? (
                <motion.div 
                  key="login_invite" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }} 
                  className="w-full space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-white mb-2">بەشداری (ستاف)</h2>
                    <p className="text-sm text-blue-200/40">کۆدی بانگهێشتەکە لێرە داخل بکە</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-amber-400/60 pr-2 uppercase tracking-widest">Invite Code</label>
                    <div className="relative group">
                      <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 group-focus-within:text-amber-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="کۆدی بانگهێشتکردن" 
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value)}
                        className="w-full bg-white/5 p-5 pr-14 rounded-2xl border border-white/10 outline-none focus:ring-2 focus:ring-amber-500/50 text-white font-black tracking-widest"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleInviteContinue}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-amber-900/20 active:scale-95"
                  >
                    بەردەوام بوون
                  </button>
                  <button onClick={() => setAuthStep('welcome')} className="w-full text-blue-100/30 text-xs font-bold hover:text-white transition-colors">گەڕانەوە</button>
                </motion.div>
              ) : authStep === 'login_profile' ? (
                <motion.div 
                  key="login_profile" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }} 
                  className="w-full space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-white mb-2">زانیارییەکانت</h2>
                    <p className="text-sm text-blue-200/40">بۆ تەواوکردنی پرۆسەی چوونە ژوورەوە</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-blue-400/60 pr-2 uppercase tracking-widest">Full Name</label>
                      <div className="relative group">
                        <UserCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-300 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="ناوی تەواو" 
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          className="w-full bg-white/5 p-4 pr-12 rounded-2xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-blue-400/60 pr-2 uppercase tracking-widest">Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-300 transition-colors" />
                        <input 
                          type="tel" 
                          placeholder="ژمارەی مۆبایل" 
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full bg-white/5 p-4 pr-12 rounded-2xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleLoginProfileContinue}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-4 active:scale-95"
                  >
                    {isAuthLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    بەردەوام بوون لەگەڵ Google
                  </button>
                  <button onClick={() => setAuthStep('login_invite')} className="w-full text-blue-100/30 text-xs font-bold hover:text-white transition-colors">گەڕانەوە</button>
                </motion.div>
              ) : authStep === 'pending' ? (
                <motion.div 
                  key="pending" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="text-center w-full"
                >
                  <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                     <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                       className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-full"
                     />
                     <Clock className="w-10 h-10 text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-black text-white mb-3">چاودێری وەرگرتن</h1>
                  <p className="text-blue-100/50 text-sm mb-10 leading-relaxed max-w-xs mx-auto">
                    هەژمارەکەت بە سەرکەوتوویی دروستکرا، بەڕێوەبەر پێویستە چالاکی بکات بۆ ئەوەی بڕۆیتە ژوورەوە.
                  </p>
                  <div className="bg-white/5 border border-white/10 p-5 rounded-3xl mb-8">
                     <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2">Current Status</span>
                     <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                        <span className="text-xl font-black text-white tracking-wider">WAITING...</span>
                     </div>
                  </div>
                  <button onClick={handleLogout} className="text-blue-200/30 text-sm font-bold hover:text-white transition-colors">چوونە دەرەوە</button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer Glow */}
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7F9] font-sans pb-24" dir="rtl">
      <AnimatePresence mode="wait">
        {activeTab === 'price' ? (
          <PriceWorld 
            items={items}
            totals={totals}
            usdRate={usdRate}
            setUsdRate={setUsdRate}
            onClose={() => setActiveTab('all')}
          />
        ) : activeTab === 'check' ? (
          <CheckWorld 
            items={items}
            profile={profile}
            onEdit={setEditingItem}
            onClose={() => setActiveTab('all')}
          />
        ) : activeTab === 'profile' ? (
          <ProfileWorld 
            profile={profile} 
            onClose={() => setActiveTab('all')} 
          />
        ) : activeTab === 'stats' ? (
          <StatsWorld 
            items={items}
            logs={logs}
            onClose={() => setActiveTab('all')}
          />
        ) : activeTab === 'settings' ? (
          <SettingsWorld 
            items={items}
            logs={logs}
            onClose={() => setActiveTab('all')}
          />
        ) : activeTab === 'users' ? (
          <UsersWorld 
            onClose={() => setActiveTab('all')} 
          />
        ) : activeTab === 'broken' ? (
          <BrokenWorld 
            items={items}
            onClose={() => setActiveTab('all')}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsAddingItem(true);
              setActiveTab('all');
            }}
          />
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            transition={{ duration: 0.4 }}
          >
            {/* Side Menu Overlay */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMenuOpen(false)}
                    className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-[60] shadow-2xl p-6 rounded-r-[40px] flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                          <Package className="w-6 h-6" />
                        </div>
                        <h2 className="font-black text-gray-800">کۆگای من</h2>
                      </div>
                      <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <nav className="space-y-2 flex-1">
                      <MenuButton 
                        icon={<UserCircle className="w-5 h-5" />} 
                        label="پرۆفایل" 
                        active={activeTab === 'profile'} 
                        onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }} 
                      />
                      <MenuButton 
                        icon={<BarChart2 className="w-5 h-5" />} 
                        label="ئامارەکان" 
                        active={activeTab === 'stats'} 
                        onClick={() => { setActiveTab('stats'); setIsMenuOpen(false); }} 
                      />
                      <MenuButton 
                        icon={<Settings className="w-5 h-5" />} 
                        label="ڕێکخستن" 
                        active={activeTab === 'settings'} 
                        onClick={() => { setActiveTab('settings'); setIsMenuOpen(false); }} 
                      />
                      {profile?.role === 'admin' && (
                        <MenuButton 
                          icon={<ShieldCheck className="w-5 h-5" />} 
                          label="بەکارهێنەران" 
                          active={activeTab === 'users'} 
                          onClick={() => { setActiveTab('users'); setIsMenuOpen(false); }} 
                        />
                      )}
                    </nav>

                    <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                      <button 
                        onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                        className="flex items-center gap-3 w-full p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>چوونە دەرەوە</span>
                      </button>
                      <p className="text-[10px] font-black text-gray-300 uppercase text-center tracking-widest">Version 2.4.0</p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Header & Search */}
            <header className="bg-white shadow-sm sticky top-0 z-30 p-4 pt-6">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all">
                      <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">کۆگای من</h1>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="گەڕان بۆ کاڵاکان..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-100 border-none rounded-2xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-right"
                  />
                </div>
              </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-8 mt-4">
              {/* Summary Stats */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex flex-col items-center border-l border-gray-100 pl-6 flex-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">کۆی گشتی کاڵا</span>
                  <span className="text-2xl font-black text-gray-800 leading-none">{items.reduce((acc, curr) => acc + curr.quantity, 0)}</span>
                </div>
                <div className="flex flex-col items-center border-l border-gray-100 pl-6 flex-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">کاڵای کەم</span>
                  <span className="text-2xl font-black text-amber-500 leading-none">{items.filter(i => i.quantity <= i.lowStockThreshold && i.quantity > 0).length}</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">جۆری جیاواز</span>
                  <span className="text-2xl font-black text-blue-600 leading-none">{items.length}</span>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <DashboardCard 
                  icon={<Tag />} 
                  label="نرخ" 
                  color="blue" 
                  isActive={activeTab === 'price' || activeTab === 'all'}
                  onClick={() => setActiveTab('price')}
                />
                <DashboardCard 
                  icon={<ClipboardCheck />} 
                  label="پشکنین" 
                  color="emerald" 
                  isActive={activeTab === 'check'}
                  onClick={() => setActiveTab('check')}
                />
                <DashboardCard 
                  icon={<AlertCircle />} 
                  label="ئاگاداری" 
                  color="amber" 
                  isActive={activeTab === 'alerts'}
                  onClick={() => setActiveTab('alerts')}
                />
                <DashboardCard 
                  icon={<Hammer />} 
                  label="شکاوەکان" 
                  color="rose" 
                  isActive={activeTab === 'broken'}
                  onClick={() => setActiveTab('broken')}
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-between items-center px-2">
                <h2 className="text-lg font-bold text-gray-800 text-right">
                  {activeTab === 'all' ? 'هەموو کاڵاکان' : 
                   activeTab === 'alerts' ? 'ئاگادارییەکان' : 
                   activeTab === 'broken' ? 'کاڵای شکاو' : 'پشکنینی کۆگا'}
                </h2>
                <button 
                  onClick={() => setIsAddingItem(true)}
                  className="bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 italic">هیچ داتایەک نەدۆزرایەوە</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <ItemRow 
                      key={item.id} 
                      item={item} 
                      mode={activeTab} 
                      userRole={profile?.role || 'staff'}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => {
                        if (window.confirm('ئایا دڵنیای لە سڕینەوەی ئەم کاڵایە؟')) {
                          warehouseService.deleteItem(item.id);
                        }
                      }}
                    />
                  ))
                )}
              </div>

              {/* Activity Logs Section */}
              <section className="pt-8">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <History className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-bold text-gray-800 text-right">دواین گۆڕانکارییەکان</h2>
                </div>
                <div className="bg-white rounded-3xl divide-y divide-gray-100 overflow-hidden shadow-sm border border-gray-100">
                  {logs.length === 0 ? (
                    <p className="p-8 text-center text-gray-400 text-sm">هیچ گۆڕانکارییەک تۆمار نەکراوە</p>
                  ) : (
                    logs.map((log) => (
                      <LogItem key={log.id} log={log} />
                    ))
                  )}
                </div>
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Item Modal */}
      <AnimatePresence>
        {(isAddingItem || editingItem) && (
          <AddItemModal 
            initialData={editingItem || undefined}
            onClose={() => {
              setIsAddingItem(false);
              setEditingItem(null);
            }} 
            onAdd={async (itemData) => {
              try {
                const logData = {
                  itemName: itemData.name,
                  userId: profile?.uid || user?.uid || 'system',
                  timestamp: Date.now()
                };

                if (editingItem) {
                  await warehouseService.updateItem(editingItem.id, itemData);
                  await logService.addLog({
                    ...logData,
                    itemId: editingItem.id,
                    actionType: 'update',
                    changeDetails: 'زانیارییەکان نوێکرانەوە'
                  });
                } else {
                  await warehouseService.addItem({
                    ...itemData,
                    category: itemData.category || itemData.categoryIcon || 'گشتی' // Ensure category exists
                  });
                  await logService.addLog({
                    ...logData,
                    actionType: 'create',
                    changeDetails: `کاڵای نوێ زیادکرا: ${itemData.name}`
                  });
                }
                setIsAddingItem(false);
                setEditingItem(null);
              } catch (error) {
                console.error('Error saving item:', error);
                alert('هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردنی کاڵا. تکایە دووبارە هەوڵ بدەرەوە.');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PriceWorld({ items, totals, usdRate, setUsdRate, onClose }: any) {
  const [search, setSearch] = useState('');
  
  const filtered = items.filter((i: any) => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.brand && i.brand.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#F5F7F9] text-gray-900 flex flex-col font-sans overflow-hidden"
      dir="rtl"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 sm:px-10 border-b border-gray-100 bg-white shadow-sm z-20">
        {/* Market Rate Link */}
        <div className="max-w-4xl mx-auto flex justify-center mb-6">
          <a 
            href="https://qamaralfajr.com/production/exchange_rates.php" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative flex items-center gap-4 px-5 py-2 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform shrink-0">
              <Globe className="w-4 h-4" />
            </div>

            <div className="relative flex flex-col text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">سەرچاوەی نرخ</span>
                <ExternalLink className="w-2.5 h-2.5 text-blue-300" />
              </div>
              <span className="text-xs font-black text-gray-900 leading-tight">Qamar Al Fajr Exchange</span>
            </div>

            <div className="relative pr-4 border-r border-gray-100 flex flex-col items-start mr-auto">
              <span className="text-[8px] font-bold text-gray-400 leading-none mb-1">تۆماری ئۆنلاین</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[13px] font-black text-green-600 font-tech leading-none">100$ = {usdRate.toLocaleString()}</span>
              </div>
            </div>
          </a>
        </div>

        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={onClose} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
              <ArrowRight className="w-6 h-6" />
            </button>
            <div className="text-right">
              <h1 className="text-xl font-black text-gray-800">سەرجەم نرخەکان</h1>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">بەهای کۆی گشتی کۆگا</p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
             <div className="flex items-baseline gap-2 bg-blue-600 text-white px-5 py-2 rounded-2xl shadow-lg shadow-blue-100">
                <span className="text-xl font-black font-tech leading-none">${totals.totalInDollar.toLocaleString()}</span>
                <span className="text-[10px] font-black opacity-70">دۆلار</span>
             </div>
             <div className="flex items-baseline gap-2 bg-gray-100 text-gray-600 px-5 py-2 rounded-2xl border border-gray-200">
                <span className="text-lg font-black font-tech leading-none">{Math.floor(totals.totalInDinar).toLocaleString()}</span>
                <span className="text-[10px] font-black opacity-60">دینار</span>
             </div>
          </div>
        </div>

        {/* Search Bar Row */}
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              autoFocus
              type="text"
              placeholder="گەڕان بۆ کاڵا، مۆدێل، براند..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-transparent rounded-2xl py-3 pr-12 pl-4 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all font-bold text-right text-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area - Vertical List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 hide-scrollbar bg-gray-50/50">
        <div className="max-w-4xl mx-auto space-y-4">
          {filtered.map((item: any) => (
            <PriceRow key={item.id} item={item} />
          ))}
          
          {filtered.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-bold italic">هیچ کاڵایەک نەدۆزرایەوە</p>
            </div>
          )}
          <div className="h-20" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

function PriceRow({ item }: { item: FBWarehouseItem, key?: any }) {
  const CategoryIcon = CATEGORY_ICONS.find(c => c.id === item.categoryIcon)?.icon || <Package />;
  const colorObj = ITEM_COLORS.find(c => c.id === item.color);
  const brandStyle = BRANDS.find(b => b.name === item.brand);

  return (
    <div className="relative group overflow-hidden rounded-xl p-2 bg-white border border-gray-100 shadow-sm select-none">
      <div className="flex items-center justify-between gap-2">
        {/* Left Side: Price Tag */}
        <div className="flex flex-col items-center min-w-[70px] bg-blue-50/50 px-2 py-1.5 rounded-xl border border-blue-100/50 shrink-0">
           <div className="flex items-baseline gap-1">
             <span className="text-lg font-black text-blue-600 font-tech leading-none">
               {item.currency === 'USD' ? '$' : ''}{item.price.toLocaleString()}
             </span>
             {item.currency === 'IQD' && <span className="text-[7px] font-black text-blue-300">دینار</span>}
           </div>
           <span className="text-[5px] font-black text-blue-300 uppercase tracking-widest leading-none mt-1">نرخی تاك</span>
        </div>

        {/* Right Side: Info */}
        <div className="flex items-center gap-2 text-right flex-1 justify-end min-w-0">
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-center">
             <div className="text-[9px] font-bold text-blue-500/70 truncate text-left">{item.specifications}</div>
             <h3 className="font-bold text-gray-900 text-xs leading-tight truncate shrink-0">{item.name}</h3>
             
             <div className="text-[7px] font-bold text-gray-300 font-tech text-left uppercase tracking-tighter">
                {item.sku ? `#${item.sku}` : 'بەتاڵ'}
             </div>
             <div className="flex items-center gap-1 justify-end">
                {item.brand && (
                  <span className={`text-[9px] font-black italic rounded-[4px] px-1.5 py-0.5 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] border border-gray-100 ${brandStyle?.family || ''}`} style={{ color: brandStyle?.color }}>
                    {item.brand}
                  </span>
                )}
                {colorObj && (
                  <div 
                    className="w-1.5 h-3 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] shrink-0" 
                    style={{ backgroundColor: colorObj.value, border: `0.5px solid ${colorObj.border}` }}
                  />
                )}
             </div>
          </div>

          <div className="p-1.5 rounded-lg bg-gray-50 text-gray-400 shrink-0">
            {React.cloneElement(CategoryIcon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
          </div>
        </div>
      </div>
    </div>
  );
}


function CheckWorld({ items, profile, onEdit, onClose }: any) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'history'>('list');
  
  const filtered = items.filter((i: any) => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.brand && i.brand.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-[#F5F7F9] text-gray-900 flex flex-col font-sans overflow-hidden"
      dir="rtl"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 bg-white shadow-sm z-20">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-800">پشکنینی کۆگا</h1>
                <button 
                  onClick={() => setView(view === 'list' ? 'history' : 'list')}
                  className={`p-2 rounded-lg transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                >
                  <History className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">سیستەمی بەڕێوەبردنی کۆگا</p>
            </div>
          </div>
        </div>

        {view === 'list' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              autoFocus
              type="text"
              placeholder="کۆد یان ناوی کاڵا..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-transparent rounded-xl py-2.5 pr-10 pl-4 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all font-bold text-right text-sm"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-4 hide-scrollbar bg-gray-50/50 relative">
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-2"
            >
              {filtered.map((item: any) => (
                <InspectionRow 
                  key={item.id} 
                  item={item} 
                  userRole={profile?.role || 'staff'}
                  onEdit={() => onEdit(item)}
                />
              ))}
              
              {filtered.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-bold italic">هیچ کاڵایەک نەدۆزرایەوە بۆ پشکنین</p>
                </div>
              )}
            </motion.div>
          ) : (
            <LogHistory profile={profile} />
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </motion.div>
  );
}


function DashboardCard({ icon, label, color, isActive, onClick }: { 
  icon: React.ReactNode, 
  label: string, 
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate',
  isActive: boolean,
  onClick: () => void
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100'
  };

  const activeColors = {
    blue: 'bg-blue-600 text-white ring-blue-200',
    emerald: 'bg-emerald-600 text-white ring-emerald-200',
    amber: 'bg-amber-600 text-white ring-amber-200',
    rose: 'bg-rose-600 text-white ring-rose-200',
    slate: 'bg-slate-600 text-white ring-slate-200'
  };

  return (
    <button 
      onClick={onClick}
      className={`p-5 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ring-4 ${isActive ? activeColors[color] : colors[color]} shadow-sm`}
    >
      <div className={`${isActive ? 'text-white' : ''}`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );
}

function InspectionRow({ item, onEdit, userRole }: { item: FBWarehouseItem, onEdit: () => void, userRole: string, key?: any }) {
  const isAdmin = userRole === 'admin';
  const isLow = item.quantity <= item.lowStockThreshold && item.quantity > 0;
  const isOut = item.quantity === 0;
  const isHigh = item.quantity > 10;
  
  const brandStyle = BRANDS.find(b => b.name === item.brand);
  const colorObj = ITEM_COLORS.find(c => c.id === item.color);
  const CategoryIcon = CATEGORY_ICONS.find(c => c.id === item.categoryIcon)?.icon || <Package />;

  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  const startLongPress = () => {
    const timer = setTimeout(() => {
      onEdit();
    }, 600);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(null);
  };

  const adjustQty = async (amount: number) => {
    const newQty = Math.max(0, item.quantity + amount);
    await warehouseService.updateItem(item.id, { quantity: newQty });
    await logService.addLog({
      itemId: item.id,
      itemName: item.name,
      actionType: 'update',
      changeDetails: `بڕ گۆڕدرا بۆ ${newQty}`,
      userId: auth.currentUser?.uid,
      timestamp: Date.now()
    });
  };

  return (
    <motion.div 
      layout
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group overflow-visible rounded-xl p-1.5 sm:p-2 transition-all border select-none
        ${isOut ? 'grayscale contrast-125 opacity-40 bg-gray-200 border-gray-300 shadow-none' : 'bg-white border-gray-100 shadow-sm'}
        ${isHigh ? 'animate-aura ring-1 ring-blue-500/10' : ''}
        ${isLow ? 'border-yellow-200 shadow-lg shadow-yellow-100/30' : ''}
      `}
    >
      {/* Lightning Flash Background for Low Stock */}
      {isLow && (
        <div className="absolute -inset-1.5 pointer-events-none animate-lightning z-0 rounded-2xl" />
      )}

      <div className="flex items-center justify-between gap-2 relative z-10">
        {/* Left Side: Controls - Smaller as requested */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => adjustQty(1)}
            className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-sm border border-gray-100"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
          
          <div className="flex flex-col items-center min-w-[32px]">
             <span className={`text-base font-black font-tech leading-none ${isLow ? 'text-yellow-600' : isOut ? 'text-gray-400' : 'text-gray-900'}`}>
               {item.quantity}
             </span>
             <span className="text-[5px] font-black text-gray-400 uppercase tracking-widest">دانە</span>
          </div>

          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => adjustQty(-1)}
            className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-sm border border-gray-100"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Right Side: Info - Restructured Layout */}
        <div className="flex items-center gap-2 text-right flex-1 justify-end min-w-0">
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-center">
             {/* Row 1: Specs (Left) and Name (Right) */}
             <div className="text-[9px] font-bold text-blue-500/70 truncate text-left">{item.specifications}</div>
             <h3 className="font-bold text-gray-900 text-xs leading-tight truncate shrink-0">{item.name}</h3>
             
             {/* Row 2: SKU (Left) and Brand/Color (Right) */}
             <div className="text-[7px] font-bold text-gray-300 font-tech text-left uppercase tracking-tighter">
                {item.sku ? `#${item.sku}` : ''}
             </div>
             <div className="flex items-center gap-1 justify-end">
                {item.brand && (
                  <span className={`text-[9px] font-black italic rounded-[4px] px-1.5 py-0.5 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] border border-gray-100 ${brandStyle?.family || ''}`} style={{ color: brandStyle?.color }}>
                    {item.brand}
                  </span>
                )}
                {colorObj && (
                  <div 
                    className="w-1.5 h-3 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] shrink-0" 
                    style={{ backgroundColor: colorObj.value, border: `0.5px solid ${colorObj.border}` }}
                  />
                )}
             </div>
          </div>

          <div className={`p-1.5 rounded-lg ${isLow ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'} transition-colors shrink-0`}>
            {React.cloneElement(CategoryIcon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
          </div>
        </div>
      </div>

      {/* Out of Stock Mode */}
      {isOut && (
        <div className="absolute inset-0 bg-gray-400/5 flex items-center justify-center pointer-events-none rounded-xl">
           <span className="text-[6px] font-black text-gray-500 uppercase tracking-[0.4em] font-tech text-center">بڕ نییە</span>
        </div>
      )}
    </motion.div>
  );
}

function ProfileWorld({ profile, onClose }: { profile: UserProfile | null, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col p-6"
      dir="rtl"
    >
      <header className="flex items-center justify-between mb-8 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-black text-gray-800">پرۆفایلی من</h2>
        <button onClick={onClose} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors">
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-6">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border-4 border-white shadow-xl">
             <User className="w-12 h-12" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-gray-800">{profile?.displayName}</h3>
            <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">{profile?.role}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 w-full">
            <div className="p-5 bg-gray-50 rounded-3xl flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</span>
              <span className="font-bold text-gray-700">{profile?.email}</span>
            </div>
            <div className="p-5 bg-gray-50 rounded-3xl flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</span>
              <span className="font-bold text-gray-700">{profile?.phoneNumber || 'دیاری نەکراوە'}</span>
            </div>
            <div className="p-5 bg-gray-50 rounded-3xl flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
              <span className={`font-bold px-3 py-1 rounded-full text-xs ${profile?.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {profile?.status.toUpperCase()}
              </span>
            </div>
          </div>
        </section>

        {profile?.role === 'admin' && (
          <div className="bg-blue-600 p-8 rounded-[40px] text-white space-y-4">
             <div className="flex items-center gap-4">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-black text-lg">بەرێوبەری باڵا</h3>
             </div>
             <p className="text-blue-100 text-sm leading-relaxed">
               تۆ دەتوانیت کاڵاکان کۆنترۆڵ بکەیت و هەروەها بانگهێشتنامەی نوێ دروست بکەیت بۆ کارمەندەکان.
             </p>
             <button onClick={() => alert('Invite system coming soon')} className="bg-white/10 p-4 w-full rounded-2xl font-bold border border-white/10 hover:bg-white/20 transition-all">دروستکردنی کۆدی بانگهێشت</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ItemRow(props: { item: FBWarehouseItem, mode: string, userRole: string, onEdit?: () => void, onDelete?: () => void, key?: any }) {
  const { item, userRole, onEdit, onDelete } = props;
  const isAdmin = userRole === 'admin';
  
  const isLow = item.quantity <= item.lowStockThreshold && item.quantity > 0;
  const isOut = item.quantity === 0;
  const isHigh = item.quantity > 10;
  
  const brandStyle = BRANDS.find(b => b.name === item.brand);
  const colorObj = ITEM_COLORS.find(c => c.id === item.color);
  const CategoryIcon = CATEGORY_ICONS.find(c => c.id === item.categoryIcon)?.icon || <Package />;

  const adjustQty = async (amount: number) => {
    const newQty = Math.max(0, item.quantity + amount);
    await warehouseService.updateItem(item.id, { quantity: newQty });
    await logService.addLog({
      itemId: item.id,
      itemName: item.name,
      actionType: 'update',
      changeDetails: `بڕ گۆڕدرا بۆ ${newQty}`,
      userId: auth.currentUser?.uid,
      timestamp: Date.now()
    });
  };

  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  const startLongPress = () => {
    const timer = setTimeout(() => {
      onEdit?.();
    }, 600);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(null);
  };

  return (
    <motion.div 
      layout
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group overflow-visible rounded-xl p-2 transition-all border select-none
        ${isOut ? 'grayscale contrast-125 opacity-40 bg-gray-200 border-gray-300 shadow-none' : 'bg-white border-gray-100 shadow-sm'}
        ${isHigh ? 'animate-aura ring-1 ring-blue-500/10' : ''}
        ${isLow ? 'border-yellow-200 shadow-lg shadow-yellow-100/30' : ''}
      `}
    >
      {/* Lightning Flash Background for Low Stock */}
      {isLow && (
        <div className="absolute -inset-1.5 pointer-events-none animate-lightning z-0 rounded-2xl" />
      )}

      <div className="flex items-center justify-between gap-2 relative z-10">
        {/* Left Side: Controls & Price */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => adjustQty(1)}
              className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-90 shadow-sm border border-gray-100"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            
            <div className="flex flex-col items-center min-w-[32px]">
               <span className={`text-base font-black font-tech leading-none ${isLow ? 'text-yellow-600' : isOut ? 'text-gray-400' : 'text-gray-900'}`}>
                 {item.quantity}
               </span>
               <span className="text-[5px] font-black text-gray-400 uppercase tracking-widest leading-none mt-0.5">دانە</span>
            </div>

            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => adjustQty(-1)}
              className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-sm border border-gray-100"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="h-8 w-px bg-gray-100 mx-1 hidden sm:block" />

          <div className="hidden sm:flex flex-col items-start pr-1">
             <span className="font-mono text-[9px] font-black text-blue-500 leading-none mb-1">
               {item.currency === 'USD' ? '$' : ''}{item.price.toLocaleString()}{item.currency === 'IQD' ? ' IQD' : ''}
             </span>
             {isAdmin && !isOut && (
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                 <button 
                   onPointerDown={(e) => e.stopPropagation()}
                   onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                   className="text-gray-300 hover:text-blue-500 transition-colors"
                 >
                   <Settings className="w-2.5 h-2.5" />
                 </button>
                 <button 
                   onPointerDown={(e) => e.stopPropagation()}
                   onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                   className="text-gray-300 hover:text-rose-500 transition-colors"
                 >
                   <Trash2 className="w-2.5 h-2.5" />
                 </button>
               </div>
             )}
          </div>
        </div>

        {/* Right Side: Info */}
        <div className="flex items-center gap-2 text-right flex-1 justify-end min-w-0">
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-center">
             <div className="text-[9px] font-bold text-blue-500/70 truncate text-left">{item.specifications}</div>
             <h3 className="font-bold text-gray-900 text-xs leading-tight truncate shrink-0">{item.name}</h3>
             
             <div className="text-[7px] font-bold text-gray-300 font-tech text-left uppercase tracking-tighter">
                {item.sku ? `#${item.sku}` : ''}
                {item.location && <span className="mr-2 text-blue-400/50">@{item.location}</span>}
             </div>
             <div className="flex items-center gap-1 justify-end">
                {item.brand && (
                  <span className={`text-[9px] font-black italic rounded-[4px] px-1.5 py-0.5 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] border border-gray-100 ${brandStyle?.family || ''}`} style={{ color: brandStyle?.color }}>
                    {item.brand}
                  </span>
                )}
                {colorObj && (
                  <div 
                    className="w-1.5 h-3 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] shrink-0" 
                    style={{ backgroundColor: colorObj.value, border: `0.5px solid ${colorObj.border}` }}
                  />
                )}
             </div>
          </div>

          <div className={`p-1.5 rounded-lg ${isLow ? 'bg-yellow-50 text-yellow-600' : item.isBroken ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400'} transition-colors shrink-0`}>
            {React.cloneElement(CategoryIcon as React.ReactElement, { className: 'w-4 h-4' })}
          </div>
        </div>
      </div>

      {isOut && (
        <div className="absolute inset-0 bg-gray-400/5 flex items-center justify-center pointer-events-none rounded-xl">
           <span className="text-[6px] font-black text-gray-500 uppercase tracking-[0.4em] font-tech text-center">بڕ نییە</span>
        </div>
      )}
    </motion.div>
  );
}

function AddItemModal({ initialData, onClose, onAdd }: { initialData?: FBWarehouseItem, onClose: () => void, onAdd: (item: any) => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    categoryIcon: initialData?.categoryIcon || 'Package',
    price: initialData?.price || 0,
    currency: initialData?.currency || 'IQD',
    quantity: initialData?.quantity || 0,
    color: initialData?.color || '',
    sku: initialData?.sku || '',
    barcode: initialData?.barcode || '',
    location: initialData?.location || '',
    description: initialData?.description || '',
    specifications: initialData?.specifications || '',
    lowStockThreshold: initialData?.lowStockThreshold || 5,
    isBroken: initialData?.isBroken || false
  });
  const [showIcons, setShowIcons] = useState(false);
  const [showBrands, setShowBrands] = useState(false);
  const [showPriceFields, setShowPriceFields] = useState(false);

  const currentTime = new Date();

  // Auto-suggest icon and brand based on name
  const detectMetaData = (name: string) => {
    const lowerName = name.toLowerCase();
    
    // Icon detection
    const iconMap: { [key: string]: string } = {
      'تەلاجە': 'WashingMachine',
      'سەلاجە': 'WashingMachine',
      'fridge': 'WashingMachine',
      'refrigerator': 'WashingMachine',
      'موجەمیدە': 'Snowflake',
      'freezer': 'Snowflake',
      'تەلەفزیۆن': 'Tv',
      'tv': 'Tv',
      'television': 'Tv',
      'فڕن': 'Microwave',
      'فرن': 'Microwave',
      'oven': 'Microwave',
      'microwave': 'Microwave',
      'پانەکە': 'Fan',
      'پانە': 'Fan',
      'fan': 'Fan',
      'سپیکەر': 'Speaker',
      'سماعات': 'Speaker',
      'speaker': 'Speaker',
      'مۆبایل': 'Smartphone',
      'mobile': 'Smartphone',
      'phone': 'Smartphone',
      'غەسالە': 'Zap', // Let's assume zap for electrical or general
      'کارەبایی': 'Zap'
    };

    let detectedIcon = formData.categoryIcon;
    for (const [keyword, iconId] of Object.entries(iconMap)) {
      if (lowerName.includes(keyword)) {
        detectedIcon = iconId;
        break;
      }
    }

    // Brand detection
    const detectedBrand = BRANDS.find(b => lowerName.includes(b.name.toLowerCase()))?.name || formData.brand;

    return { detectedIcon, detectedBrand };
  };

  const handleNameChange = (val: string) => {
    const { detectedIcon, detectedBrand } = detectMetaData(val);
    setFormData(prev => ({
      ...prev,
      name: val,
      categoryIcon: detectedIcon,
      brand: detectedBrand
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 text-right font-sans"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="bg-white w-full max-w-md rounded-t-[50px] sm:rounded-[50px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar border border-gray-50"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">زانیاری کاڵا</h2>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault();
          onAdd(formData);
        }}>
          {/* Main Name Input - Now more square and integrated with icon */}
          <div className="space-y-3">
             <div className="bg-gray-50 rounded-[32px] p-1 border border-gray-100 shadow-inner flex flex-col items-center">
                <div className="w-full flex items-center p-2 gap-3">
                   <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-600 shrink-0 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {React.cloneElement(
                        (CATEGORY_ICONS.find(c => c.id === formData.categoryIcon)?.icon || <Package />) as React.ReactElement, 
                        { className: 'w-8 h-8 relative z-10' }
                      )}
                      
                      <button 
                        type="button"
                        onClick={() => setShowIcons(!showIcons)}
                        className="absolute bottom-0 right-0 p-1 bg-blue-600 text-white rounded-tl-lg shadow-sm"
                      >
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showIcons ? 'rotate-180' : ''}`} />
                      </button>
                   </div>
                   
                   <div className="flex-1 space-y-1 pr-2">
                      <label className="text-[8px] font-black text-blue-500 uppercase tracking-widest block">ناوی کاڵا و وەسفی خێرا</label>
                      <input 
                        required
                        autoFocus
                        value={formData.name}
                        onChange={e => handleNameChange(e.target.value)}
                        className="w-full bg-transparent outline-none font-black text-gray-800 text-lg placeholder:text-gray-300"
                        placeholder="بۆ نموونە: سەلاجەی LG..."
                      />
                   </div>
                </div>
             </div>

            <AnimatePresence>
              {showIcons && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 hide-scrollbar">
                    {CATEGORY_ICONS.map(cat => (
                      <button key={cat.id} type="button" onClick={() => { setFormData({...formData, categoryIcon: cat.id}); setShowIcons(false); }}
                        className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all border ${formData.categoryIcon === cat.id ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'}`}>
                        {React.cloneElement(cat.icon as React.ReactElement, { className: 'w-5 h-5' })}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Barcode and SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">Barcode</label>
              <input 
                type="text"
                value={formData.barcode}
                onChange={e => setFormData({...formData, barcode: e.target.value})}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/50 transition-all text-right text-[10px] font-bold"
                placeholder="بارکۆد..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">کۆدی کاڵا</label>
              <input 
                type="text"
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value})}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/50 transition-all text-right text-[10px] font-bold"
                placeholder="SKU..."
              />
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">شوێنی کاڵا</label>
            <div className="flex gap-2">
              {[
                { id: 'عرض', label: 'عرض', icon: <Package className="w-3 h-3" /> },
                { id: 'بان', label: 'بان', icon: <ChevronDown className="w-3 h-3 -rotate-180" /> },
                { id: 'بخزن', label: 'بخزن', icon: <Boxes className="w-3 h-3 text-blue-500" /> }
              ].map(loc => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setFormData({...formData, location: loc.id})}
                  className={`flex-1 py-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5
                    ${formData.location === loc.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]' 
                      : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50'
                    }`}
                >
                  <span className={formData.location === loc.id ? 'text-white' : 'text-gray-300'}>
                    {loc.icon}
                  </span>
                  <span className="text-[10px] font-black">{loc.label}</span>
                </button>
              ))}
            </div>
            
            {/* Custom location input if needed, but the user asked for these 3 specifically */}
            <input 
              type="text"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-2 px-4 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/50 transition-all text-right text-[10px] font-bold mt-2"
              placeholder="شوێنی هەڵبژێردراو یان دەستکاری بکە..."
            />
          </div>

          {/* Brands Selection */}
          <div className="space-y-3">
             <div 
               onClick={() => setShowBrands(!showBrands)}
               className="flex items-center justify-between cursor-pointer group bg-gray-50/50 p-2 rounded-xl border border-gray-50 hover:bg-white hover:shadow-sm transition-all"
             >
               <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block cursor-pointer group-hover:text-blue-500 transition-colors">براندەکان</label>
               <div className="flex items-center gap-2">
                 {formData.brand ? (
                    <span 
                      className={`text-[10px] font-black ${BRANDS.find(b => b.name === formData.brand)?.family || ''}`}
                      style={{ color: BRANDS.find(b => b.name === formData.brand)?.color }}
                    >
                      {formData.brand}
                    </span>
                 ) : (
                    <span className="text-[10px] font-black text-gray-300">دیاری بکە...</span>
                 )}
                 <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${showBrands ? 'rotate-180' : ''}`} />
               </div>
             </div>

             <AnimatePresence>
               {showBrands && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="flex flex-wrap gap-x-4 gap-y-3 px-1 pt-2 pb-1 bg-white">
                     {BRANDS.map(brand => (
                       <button
                         key={brand.name}
                         type="button"
                         onClick={() => {
                           setFormData({...formData, brand: brand.name});
                           setShowBrands(false);
                         }}
                         className={`text-xs font-black transition-all relative ${formData.brand === brand.name ? 'scale-110 opacity-100' : 'opacity-30 hover:opacity-80'} ${brand.family || ''}`}
                         style={{ color: brand.color }}
                       >
                         {brand.name}
                         {formData.brand === brand.name && (
                           <motion.div layoutId="brand-underline-sm" className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: brand.color }} />
                         )}
                       </button>
                     ))}
                     <button 
                       type="button" 
                       onClick={() => {
                         setFormData({...formData, brand: ''});
                         setShowBrands(false);
                       }} 
                       className={`text-xs font-black transition-all ${!formData.brand ? 'text-gray-900 border-b border-gray-900' : 'text-gray-400 opacity-40'}`}
                     >
                       NONE
                     </button>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">وەسفی کاڵا</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/50 transition-all text-right text-[10px] font-bold min-h-[60px]"
              placeholder="وەسفی کاڵاکە لێرە بنووسە..."
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
             <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">ڕەنگەکان</label>
             <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 hide-scrollbar">
               {ITEM_COLORS.map(color => (
                 <button
                   key={color.id}
                   type="button"
                   onClick={() => setFormData({...formData, color: color.id})}
                   className={`shrink-0 w-7 h-7 rounded-lg border-2 transition-all ${formData.color === color.id ? 'scale-110 shadow-md ring-2 ring-blue-500/20' : 'hover:scale-105'}`}
                   style={{ 
                     backgroundColor: color.value,
                     borderColor: formData.color === color.id ? '#3B82F6' : color.border
                   }}
                 />
               ))}
               <button
                 type="button"
                 onClick={() => setFormData({...formData, color: ''})}
                 className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-all bg-white ${!formData.color ? 'border-gray-900 rotate-45' : 'border-gray-200 text-gray-300'}`}
               >
                 <Plus className="w-3 h-3" />
               </button>
             </div>
          </div>

          {/* Specifications */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">مواسەفات</label>
            <input 
              type="text"
              value={formData.specifications}
              onChange={e => setFormData({...formData, specifications: e.target.value})}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/50 transition-all text-right text-[10px] font-bold"
              placeholder="مواسەفاتی زیاتر لێرە بنووسە..."
            />
          </div>

          {/* Price and Currency - Merged & Expandable */}
          <div className="space-y-3">
             <div 
               onClick={() => setShowPriceFields(!showPriceFields)}
               className="flex items-center justify-between cursor-pointer group bg-gray-50/50 p-2 rounded-xl border border-gray-50 hover:bg-white hover:shadow-sm transition-all"
             >
               <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block cursor-pointer group-hover:text-blue-500 transition-colors">نرخی کاڵا</label>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-blue-600">
                   {formData.price.toLocaleString()} {formData.currency}
                 </span>
                 <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${showPriceFields ? 'rotate-180' : ''}`} />
               </div>
             </div>

             <AnimatePresence>
               {showPriceFields && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden bg-gray-50/30 rounded-2xl p-3 border border-gray-100"
                 >
                   <div className="space-y-4">
                     <div className="flex gap-2">
                       {['IQD', 'USD'].map(curr => (
                         <button 
                           key={curr} 
                           type="button" 
                           onClick={() => setFormData({...formData, currency: curr as any})}
                           className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${formData.currency === curr ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-50'}`}
                         >
                           {curr}
                         </button>
                       ))}
                     </div>
                     <div className="relative">
                       <input 
                         type="number" 
                         required 
                         value={formData.price === 0 ? '' : formData.price} 
                         onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                         className="w-full bg-white border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm" 
                         placeholder="نرخ بنووسە..."
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">{formData.currency}</span>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
          {/* Quantity Section - Moved Below Price */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">بڕی کۆگا</label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                required 
                value={formData.quantity === 0 ? '' : formData.quantity} 
                onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                className="w-full bg-blue-50/30 border border-blue-100/50 rounded-2xl py-3 px-6 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-2xl text-center text-blue-600 font-black" 
              />
              <span className="absolute right-6 text-[8px] font-black text-blue-300 uppercase tracking-widest pointer-events-none">PCS</span>
            </div>
          </div>

          {/* Low Stock Alert and Time */}
          <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-[32px] border border-gray-100">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">ئاگاداری کەم بوونەوە</label>
              <input type="number" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})}
                className="w-16 bg-white border border-gray-100 rounded-xl py-2 px-2 outline-none font-mono text-center font-bold text-sm shadow-sm" />
            </div>
            
            <div className="flex flex-col items-end gap-0.5 text-right opacity-40">
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="text-[7px] font-black uppercase tracking-widest">TIMESTAMP</span>
                <Clock className="w-2.5 h-2.5" />
              </div>
              <span className="text-xs font-bold text-gray-900">
                {new Intl.DateTimeFormat('ku-IQ', { hour: '2-digit', minute: '2-digit' }).format(currentTime)}
              </span>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-full shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-3">
             <Plus className="w-4 h-4" />
             کاڵاکە زیاد بکە
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function LogHistory({ profile }: { profile: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);

  useEffect(() => {
    if (!profile || profile.status !== 'active') return;

    const unsubLogs = logService.subscribeLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
    return unsubLogs;
  }, [profile]);

  const toggleMonth = (monthId: string) => {
    setExpandedMonths(prev => 
      prev.includes(monthId) ? prev.filter(id => id !== monthId) : [...prev, monthId]
    );
  };

  const groupedLogs = useMemo(() => {
    const now = new Date();
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(now.getMonth() - 2);

    const recent: any[] = [];
    const archived: { [key: string]: any[] } = {};

    logs.forEach(log => {
      const date = safeDate(log.timestamp);
      if (!date) return;

      if (date >= twoMonthsAgo) {
        recent.push(log);
      } else {
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!archived[monthKey]) archived[monthKey] = [];
        archived[monthKey].push(log);
      }
    });

    return { recent, archived };
  }, [logs]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/50">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto space-y-6 pb-20"
    >
      {/* Recent Logs - Last 2 Months */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-gray-400 px-4">
          <Clock className="w-4 h-4" />
          <h2 className="text-xs font-black uppercase tracking-widest">چالاکییەکانی ئەم دواییە</h2>
        </div>
        
        <div className="space-y-2">
          {groupedLogs.recent.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
          {groupedLogs.recent.length === 0 && (
            <p className="text-center text-gray-400 text-xs py-10 bg-white/50 rounded-3xl border border-dashed">چالاکی نوێ نییە</p>
          )}
        </div>
      </section>

      {/* Archived Logs - Grouped by Month */}
      {Object.entries(groupedLogs.archived).map(([monthKey, monthLogs]: [string, any]) => {
        const [year, month] = monthKey.split('-');
        const monthDate = new Date(Number(year), Number(month) - 1);
        const monthName = !isNaN(monthDate.getTime()) 
          ? new Intl.DateTimeFormat('ku-IQ', { month: 'long' }).format(monthDate)
          : 'مانگ';
        const isExpanded = expandedMonths.includes(monthKey);

        return (
          <section key={monthKey} className="space-y-2 px-4 pb-4">
            <button 
              onClick={() => toggleMonth(monthKey)}
              className="w-full flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-gray-100 hover:bg-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                <span className="font-black text-gray-700 text-sm">{monthName} {year}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>{(monthLogs as any[]).length} چالاکی</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 pt-2"
                >
                  {(monthLogs as any[]).map((log: any) => (
                    <LogItem key={log.id} log={log} isArchived />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </motion.div>
  );
}

function LogItem({ log, isArchived }: { log: any, isArchived?: boolean, key?: any }) {
  const date = safeDate(log.timestamp);
  const timeStr = date ? new Intl.DateTimeFormat('ku-IQ', { hour: '2-digit', minute: '2-digit' }).format(date) : '--:--';
  const dateStr = date ? new Intl.DateTimeFormat('ku-IQ', { day: 'numeric', month: 'short' }).format(date) : '---';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 bg-white rounded-xl border border-gray-50 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all ${isArchived ? 'opacity-80 scale-[0.98]' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner ${
          log.actionType === 'create' ? 'bg-emerald-50 text-emerald-500' : 
          log.actionType === 'delete' ? 'bg-rose-50 text-rose-500' : 
          'bg-blue-50 text-blue-500'
        }`}>
          {log.actionType === 'create' ? <Plus className="w-4 h-4" /> : 
           log.actionType === 'delete' ? <X className="w-4 h-4" /> : 
           <TrendingDown className="w-3 h-3 rotate-180" />}
        </div>
        
        <div className="text-right">
          <h4 className="font-bold text-gray-800 text-xs leading-tight">{log.itemName}</h4>
          <p className="text-[9px] font-bold text-gray-400 mt-0.5">{log.changeDetails}</p>
        </div>
      </div>

      <div className="text-left border-r border-gray-50 pr-3">
        <div className="font-mono text-[9px] font-black text-gray-900 leading-none">{timeStr}</div>
        <div className="text-[7px] font-black text-gray-300 uppercase tracking-widest mt-1">{dateStr}</div>
      </div>
    </motion.div>
  );
}

function UsersWorld({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = userService.getAllUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'pending' : 'active';
    if (window.confirm(`ئایا دڵنیای لە گۆڕینی دۆخی ${user.displayName} بۆ ${newStatus.toUpperCase()}؟`)) {
      await userService.updateUserProfile(user.uid, { status: newStatus });
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'staff' : 'admin';
    if (window.confirm(`ئایا دڵنیای لە پلەبەرزکردنەوە/نزمکردنەوەی ${user.displayName} بۆ ${newRole.toUpperCase()}؟`)) {
      await userService.updateUserProfile(user.uid, { role: newRole });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col font-sans"
      dir="rtl"
    >
      <header className="bg-white p-6 border-b border-gray-100 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-800">بەکارهێنەران</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Management Control</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">هیچ بەکارهێنەرێک نەدۆزرایەوە</p>
          </div>
        ) : (
          users.map((u) => (
            <motion.div 
              layout
              key={u.uid}
              className={`bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between gap-4 transition-all ${u.status === 'pending' ? 'ring-2 ring-amber-500/20' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-md ${u.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                   <User className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <h3 className="font-black text-gray-800 leading-tight">{u.displayName}</h3>
                  <p className="text-[10px] text-gray-400 font-bold mb-1">{u.email}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {u.status}
                    </span>
                    <span className="text-[8px] font-bold text-gray-300">/</span>
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">
                      {u.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => handleToggleRole(u)}
                  className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  title="گۆڕینی ڕۆڵ"
                 >
                   <Settings className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => handleToggleStatus(u)}
                   className={`p-3 rounded-2xl transition-all font-bold text-xs ${u.status === 'active' ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                 >
                   {u.status === 'active' ? 'وەستاندن' : 'چالاککردن'}
                 </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function SettingsWorld({ items, logs, onClose }: any) {
  const exportData = () => {
    const data = { items, logs, timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.items) {
          // Note: Importing large datasets to Firestore should be done carefully
          // For now, we alert the user this isn't supported directly like this
          alert('هێنانەناوەی داتای گەورە بۆ فایەربەیس پێویستی بە بەرێوەبەر هەیە.');
        }
      } catch (err) {
        alert('هەڵەیەک ڕوویدا لە کاتی خوێندنەوەی فایلەکە');
      }
    };
    reader.readAsText(file);
  };

  const clearAll = async () => {
    if (window.confirm('ئایا دڵنیای لە سڕینەوەی هەموو داتاکانی کۆگا؟ ئەم کارە ناگەڕێتەوە.')) {
      alert('سڕینەوەی گشتی لە ئێستادا ناچالاکە لەبەر پاراستنی داتا.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col p-6"
      dir="rtl"
    >
      <header className="flex items-center justify-between mb-8 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-black text-gray-800">ڕێکخستنەکان</h2>
        <button onClick={onClose} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors">
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-6">
          <div className="p-6 bg-blue-50 rounded-3xl text-blue-600">
            <FileJson className="w-12 h-12" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">پاڵپشتی و گەڕاندنەوە</h3>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              دەتوانیت تەواوی داتاکانی کۆگاکەت پاشەکەوت بکەیت یان دوبارە بیگەڕێنیتەوە ناو ئەپەکە.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={exportData}
              className="flex flex-col items-center gap-2 p-6 bg-blue-600 text-white rounded-[32px] hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
            >
              <Download className="w-6 h-6" />
              <span className="font-bold text-sm">Download</span>
            </button>

            <label className="flex flex-col items-center gap-2 p-6 bg-emerald-500 text-white rounded-[32px] hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-100 cursor-pointer">
              <Upload className="w-6 h-6" />
              <span className="font-bold text-sm">Upload</span>
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-gray-800">پاککردنەوەی گشتی</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DANGER ZONE</p>
            </div>
          </div>

          <button 
            onClick={clearAll}
            className="w-full py-4 bg-rose-50 text-rose-500 font-bold rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Trash2 className="w-5 h-5" />
            سڕینەوەی هەموو داتاکان
          </button>
        </section>

        <div className="text-center pt-10">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Warehouse Manager v2.4.0</p>
          <p className="text-[9px] font-bold text-gray-300 mt-1 italic italic">Optimized for Mobile Performance</p>
        </div>
      </div>
    </motion.div>
  );
}

function MenuButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold ${
        active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={active ? 'text-white' : 'text-gray-400'}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
      <ChevronLeft className={`w-4 h-4 transition-transform ${active ? 'rotate-[-90deg]' : 'opacity-0'}`} />
    </button>
  );
}

function BrokenWorld({ items, onClose, onEditItem }: { items: FBWarehouseItem[], onClose: () => void, onEditItem: (item: FBWarehouseItem) => void }) {
  const [brokenRecords, setBrokenRecords] = useState<BrokenRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<FBWarehouseItem | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Action state
  const [activeActions, setActiveActions] = useState<BrokenRecord | null>(null);
  const [fixingRecord, setFixingRecord] = useState<BrokenRecord | null>(null);
  const [modifyingItem, setModifyingItem] = useState<FBWarehouseItem | null>(null);
  const [originalRecordForModify, setOriginalRecordForModify] = useState<BrokenRecord | null>(null);
  const [editingBroken, setEditingBroken] = useState<BrokenRecord | null>(null);
  
  // Field states for modification
  const [modColor, setModColor] = useState('');
  const [modSpecs, setModSpecs] = useState('');

  useEffect(() => {
    const unsub = brokenService.subscribeBroken((data) => {
      setBrokenRecords(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredSearch = useMemo(() => {
    if (!search) return [];
    return items.filter(i => 
      i.name.toLowerCase().includes(search.toLowerCase()) || 
      (i.sku && i.sku.toLowerCase().includes(search.toLowerCase())) ||
      (i.barcode && i.barcode.toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 5);
  }, [search, items]);

  const [viewMode, setViewMode] = useState<'active' | 'fixed' | 'returned'>('active');

  const filteredBroken = useMemo(() => {
    return brokenRecords.filter(r => {
      const matchesSearch = r.itemName.toLowerCase().includes(search.toLowerCase()) ||
                           r.reason.toLowerCase().includes(search.toLowerCase());
      if (viewMode === 'active') return r.status === 'broken' && matchesSearch;
      return r.status === viewMode && matchesSearch;
    });
  }, [brokenRecords, search, viewMode]);

  const handleResolveBroken = async (record: BrokenRecord, resolution: 'fixed' | 'returned') => {
    if (!auth.currentUser) return;
    
    // Check if confirming actions is preferred or required by designer intent
    // But since it is a crucial ERP action, a confirmation is good practice.
    
    setSubmitting(true);
    try {
      // 1. Update Broken Record Status
      await brokenService.updateBrokenRecord(record.id, {
        status: resolution,
        fixedDetails: {
          isModified: resolution === 'fixed',
          timestamp: new Date()
        }
      });

      // 2. If Fixed, Update Warehouse Quantity
      if (resolution === 'fixed') {
        const item = items.find(i => i.id === record.itemId);
        if (item) {
          await warehouseService.updateItem(item.id, {
            quantity: item.quantity + record.quantity
          });
        }
      }

      // 3. Log Action
      await logService.addLog({
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'بەکارهێنەر',
        action: resolution === 'fixed' ? 'FIXED_BROKEN' : 'RETURNED_BROKEN',
        details: `${record.quantity} دانە لە ${record.itemName} ${resolution === 'fixed' ? 'چاککرایەوە' : 'گەڕێندرایەوە بۆ کۆمپانیا'}`,
        type: 'inventory'
      });

      setActiveActions(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const maxAvailable = useMemo(() => {
    if (!selectedItem) return 0;
    const baseQuantity = editingBroken ? editingBroken.quantity : 0;
    return selectedItem.quantity + baseQuantity;
  }, [selectedItem, editingBroken]);

  const quantityError = useMemo(() => {
    if (quantity > maxAvailable) return `تەنها ${maxAvailable} کاڵا لە کۆگا ماوە`;
    return null;
  }, [quantity, maxAvailable]);

  const handleReport = async () => {
    if (!selectedItem || quantity <= 0 || quantityError) return;
    setSubmitting(true);
    try {
      if (editingBroken) {
        await brokenService.updateBrokenRecord(editingBroken.id, {
          quantity,
          reason,
        });
        
        // Adjust warehouse if quantity changed
        const diff = quantity - editingBroken.quantity;
        if (diff !== 0) {
          await warehouseService.updateItem(selectedItem.id, {
            quantity: selectedItem.quantity - diff
          });
        }
      } else {
        await brokenService.addBrokenRecord({
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          quantity,
          reason,
          userId: auth.currentUser?.uid || '',
          userName: auth.currentUser?.displayName || 'بەکارهێنەر',
        } as any);

        await warehouseService.updateItem(selectedItem.id, {
          quantity: selectedItem.quantity - quantity,
          isBroken: true
        });
      }

      await logService.addLog({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        actionType: 'update',
        changeDetails: editingBroken ? `دەستکاری شکاوی: ${reason}` : `تۆمارکردنی شکاوی (${quantity} دانە): ${reason}`,
        userId: auth.currentUser?.uid,
        timestamp: Date.now()
      });

      setIsReporting(false);
      setSelectedItem(null);
      setEditingBroken(null);
      setQuantity(1);
      setReason('');
      setSearch('');
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFixItem = async (record: BrokenRecord, asIs: boolean) => {
    setSubmitting(true);
    try {
      const item = items.find(i => i.id === record.itemId);
      if (item) {
        // Return to warehouse
        await warehouseService.updateItem(item.id, {
          quantity: item.quantity + record.quantity
        });

        await brokenService.updateBrokenRecord(record.id, {
          status: 'fixed',
          fixedDetails: {
            isModified: !asIs,
            timestamp: Date.now()
          }
        });

        await logService.addLog({
          itemId: item.id,
          itemName: item.name,
          actionType: 'update',
          changeDetails: `چاککردنەوە و گەڕاندنەوە بۆ کۆگا: ${asIs ? 'وەک خۆی' : 'بە دەستکارییەوە'}`,
          userId: auth.currentUser?.uid,
          timestamp: Date.now()
        });

        // If not "as is", open specialized small editor
        if (!asIs) {
          setModColor(item.color || '');
          setModSpecs(item.specifications || '');
          setModifyingItem(item);
          setOriginalRecordForModify(record);
        }
      }
      setFixingRecord(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveModification = async () => {
    if (!modifyingItem || !auth.currentUser) return;
    setSubmitting(true);
    try {
      await warehouseService.updateItem(modifyingItem.id, {
        color: modColor,
        specifications: modSpecs
      });

      await logService.addLog({
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'بەکارهێنەر',
        action: 'UPDATE_ITEM_SPECS',
        details: `دەستکاری ڕەنگ و مواسەفات بۆ ${modifyingItem.name} دوای چاککردنەوە`,
        type: 'inventory'
      });

      setModifyingItem(null);
      setOriginalRecordForModify(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToCompany = async (record: BrokenRecord) => {
    if (!window.confirm('ئایا دڵنیای لە گەڕاندنەوە بۆ کۆمپانیا؟ (لە کۆگا زیاد ناکرێتەوە)')) return;
    setSubmitting(true);
    try {
      await brokenService.updateBrokenRecord(record.id, {
        status: 'returned'
      });
      await logService.addLog({
        itemId: record.itemId,
        itemName: record.itemName,
        actionType: 'update',
        changeDetails: `گەڕاندنەوە بۆ کۆمپانیا (نەگەڕایەوە کۆگا)`,
        userId: auth.currentUser?.uid,
        timestamp: Date.now()
      });
      setActiveActions(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col font-sans"
      dir="rtl"
    >
      <header className="bg-white p-6 border-b border-gray-100 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-800">شکاوەکان</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Broken Items Tracker</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setIsReporting(true);
              setEditingBroken(null);
              setSelectedItem(null);
              setQuantity(1);
              setReason('');
            }}
            className="bg-rose-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-200 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            تۆمارکردنی شکاوی
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-2xl mx-auto w-full pb-24">
        {/* Search Bar for Broken Records */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="گەڕان لە نێوان شکاوەکان..."
            className="w-full bg-white border border-gray-100 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-rose-500/10 transition-all font-bold text-sm text-right shadow-sm"
          />
        </div>

        {isReporting && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[40px] border-2 border-rose-100 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">{editingBroken ? 'دەستکاری ڕاپۆرت' : 'ڕاپۆرتی کاڵای شکاو'}</h3>
              <button 
                onClick={() => { 
                  setIsReporting(false); 
                  setEditingBroken(null); 
                  setSelectedItem(null);
                  setSearch('');
                }} 
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!editingBroken && (
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block mb-2">گەڕان و هەڵبژاردنی کاڵا</label>
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      value={selectedItem ? selectedItem.name : search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        if (selectedItem) setSelectedItem(null);
                      }}
                      placeholder="ناوی کاڵا یان بارکۆد..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold text-sm text-right"
                    />
                  </div>
                  
                  {search && !selectedItem && filteredSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                      {filteredSearch.map(item => (
                        <button 
                          key={item.id}
                          onClick={() => {
                            setSelectedItem(item);
                            setSearch('');
                          }}
                          className="w-full p-4 flex items-center justify-between hover:bg-rose-50 transition-colors text-right"
                        >
                          <div className="text-right">
                            <p className="font-bold text-sm text-gray-800">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">#{item.sku || 'N/A'}</p>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">کۆگا: {item.quantity}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(selectedItem || editingBroken) && (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-3 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-rose-500/20" />
                    <label className="text-[11px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">بڕی کاڵای شکاو</label>
                    <div className={`flex items-center gap-4 rounded-2xl p-2 border transition-all ${quantityError ? 'bg-rose-50 border-rose-200 ring-4 ring-rose-500/10' : 'bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-rose-200 focus-within:ring-4 focus-within:ring-rose-500/5'}`}>
                      <button 
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }} 
                        className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-white rounded-2xl shadow-sm text-gray-400 hover:text-rose-500 active:scale-90 transition-transform"
                      >
                        <Minus className="w-6 h-6"/>
                      </button>
                      <input 
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={quantity === 0 ? '' : quantity} 
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (val === '') {
                            setQuantity(0);
                            return;
                          }
                          const num = parseInt(val);
                          if (!isNaN(num)) {
                            setQuantity(num);
                          }
                        }}
                        className={`flex-1 w-full bg-transparent text-center font-black text-4xl outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${quantityError ? 'text-rose-600' : 'text-gray-900'}`}
                        placeholder="0"
                      />
                      <button 
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }} 
                        className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-white rounded-2xl shadow-sm text-gray-400 hover:text-emerald-500 active:scale-90 transition-transform"
                      >
                        <Plus className="w-6 h-6"/>
                      </button>
                    </div>
                    {quantityError && (
                      <motion.p 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[11px] font-black text-rose-500 mr-2 flex items-center gap-1.5 mt-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {quantityError}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-3 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-gray-200" />
                    <label className="text-[11px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">وەسفی شکاویەکەی (تێبینی)</label>
                    <textarea 
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="لێرە بنووسە چۆن شکا یان هەر زانیاریەک..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 min-h-[100px] outline-none focus:ring-4 focus:ring-rose-500/5 focus:bg-white focus:border-rose-100 transition-all font-bold text-sm text-right resize-none"
                    />
                  </div>
                </div>
              )}

              <button 
                disabled={(!selectedItem && !editingBroken) || submitting || quantity <= 0 || !!quantityError}
                onClick={handleReport}
                className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-rose-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                {submitting ? <Loader2 className="animate-spin w-5 h-5"/> : (editingBroken ? 'سەیڤکردنی گۆڕانکاری' : 'تۆمارکردنی شکاوی')}
              </button>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">تۆمارەکان ({filteredBroken.length})</h3>
            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 scale-90 sm:scale-100 origin-right">
              <button 
                onClick={() => setViewMode('active')}
                className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all ${viewMode === 'active' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}
              >
                چالاکەکان
              </button>
              <button 
                onClick={() => setViewMode('fixed')}
                className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all ${viewMode === 'fixed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
              >
                چاککراوەکان
              </button>
              <button 
                onClick={() => setViewMode('returned')}
                className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all ${viewMode === 'returned' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
              >
                کۆمپانیا
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-rose-600 w-8 h-8" />
            </div>
          ) : filteredBroken.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 opacity-50">
               <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
               <p className="font-bold text-gray-400 text-sm">هیچ تۆمارێکی شکاوی نییە</p>
            </div>
          ) : (
            filteredBroken.map((rec) => (
              <motion.div 
                layout
                key={rec.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveActions(rec);
                }}
                onClick={() => {
                  setEditingBroken(rec);
                  setSelectedItem(items.find(i => i.id === rec.itemId) || null);
                  setQuantity(rec.quantity);
                  setReason(rec.reason);
                  setIsReporting(true);
                }}
                className={`group relative bg-white p-5 rounded-[32px] border transition-all active:scale-[0.98] ${rec.status === 'broken' ? 'border-gray-100 hover:border-rose-100' : (rec.status === 'fixed' ? 'border-emerald-100 bg-emerald-50/10' : 'border-blue-100 bg-blue-50/10')} shadow-sm flex items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${rec.status === 'broken' ? 'bg-rose-50 text-rose-500' : (rec.status === 'fixed' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500')}`}>
                    {rec.quantity}
                  </div>
                  <div className="text-right">
                    <h4 className="font-black text-gray-800 leading-tight">{rec.itemName}</h4>
                    <p className={`text-[10px] font-bold mb-1 opacity-80 ${rec.status === 'broken' ? 'text-rose-600' : (rec.status === 'fixed' ? 'text-emerald-600' : 'text-blue-600')}`}>{rec.reason || 'بێ وەسف'}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                          <User className="w-2 h-2" />
                          {rec.userName}
                       </span>
                       {rec.status !== 'broken' && (
                         <>
                           <span className="text-[8px] font-bold text-gray-300">/</span>
                           <span className={`text-[8px] font-black uppercase flex items-center gap-1 ${rec.status === 'fixed' ? (rec.fixedDetails?.isModified ? 'text-blue-600' : 'text-emerald-600') : 'text-indigo-600'}`}>
                             {rec.status === 'fixed' ? (rec.fixedDetails?.isModified ? <RefreshCw className="w-2 h-2" /> : <CheckCircle2 className="w-2 h-2" />) : <History className="w-2 h-2" />}
                             {rec.status === 'fixed' ? (rec.fixedDetails?.isModified ? 'گۆڕدراوە (مواسەفات)' : 'چاککراوەتەوە (وەک خۆی)') : 'گەڕاوەتەوە بۆ کۆمپانیا'}
                           </span>
                         </>
                       )}
                    </div>
                  </div>
                </div>
                
                {/* Hold to action indicator */}
                {rec.status === 'broken' && (
                  <div className="text-[8px] font-black text-gray-300 uppercase rotate-90 absolute left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Hold For Actions
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Menu (Bottom Sheet Style) */}
      <AnimatePresence>
        {activeActions && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-gray-100 p-8 pb-10 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-gray-800">{activeActions.itemName}</h3>
                  <p className="text-xs text-gray-400">چی لەم کاڵا شکاوە دەکەیت؟</p>
                </div>
              </div>
              <button onClick={() => setActiveActions(null)} className="p-2 bg-gray-50 rounded-xl text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                onClick={() => {
                  setFixingRecord(activeActions);
                  setActiveActions(null);
                }}
                className="flex flex-col items-center gap-3 p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 group active:scale-95 transition-all"
               >
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                   <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <span className="font-black text-emerald-800 text-sm">چاککرا / کۆگا</span>
               </button>

               <button 
                onClick={() => handleReturnToCompany(activeActions)}
                className="flex flex-col items-center gap-3 p-6 bg-blue-50 rounded-[32px] border border-blue-100 group active:scale-95 transition-all"
               >
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                   <RefreshCw className="w-6 h-6" />
                 </div>
                 <span className="font-black text-blue-800 text-sm">گەڕانەوە کۆمپانیا</span>
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation for Fixing (As-Is or Modified) */}
      <AnimatePresence>
        {fixingRecord && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <h3 className="font-black text-xl text-gray-800 text-center">چۆنیەتی چارەسەرکردن</h3>
              <p className="text-gray-500 text-center text-sm leading-relaxed font-bold">
                ئەو کاڵای پێشتر شکابوو، ئایا بە چ شێوەیەک چاککرایەوە؟
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => handleFixItem(fixingRecord, true)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-200"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  چاککراوە (وەک خۆی)
                </button>
                <button 
                  onClick={() => handleFixItem(fixingRecord, false)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-200"
                >
                  <RefreshCw className="w-5 h-5" />
                  گۆڕدراوە (مواسفات گۆڕاو)
                </button>
                <button 
                  onClick={() => setFixingRecord(null)}
                  className="w-full py-2 text-gray-400 font-bold text-xs"
                >
                  پەشیمانبوونەوە
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Specialized Item Editor after modification */}
      <AnimatePresence>
        {modifyingItem && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="font-black text-2xl text-gray-800">دەستکاری زانیاری</h3>
                <p className="text-sm text-gray-400 font-bold">دەستکاری ڕەنگ و مواسەفاتی {modifyingItem.name} بکە</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">ڕەنگی نوێ</label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {ITEM_COLORS.map(color => (
                        <button 
                          key={color.id}
                          onClick={() => setModColor(color.id)}
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${modColor === color.id ? 'scale-110 shadow-lg' : 'opacity-40 grayscale-[0.5]'}`}
                          style={{ backgroundColor: color.value, borderColor: modColor === color.id ? '#000' : color.border }}
                          title={color.id}
                        />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-[0.2em] block">مواسەفاتی نوێ</label>
                  <textarea 
                    value={modSpecs}
                    onChange={e => setModSpecs(e.target.value)}
                    placeholder="مواسەفاتەکان لێرە بنووسە..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 min-h-[120px] outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-100 transition-all font-bold text-sm text-right resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setModifyingItem(null);
                    setOriginalRecordForModify(null);
                  }}
                  className="flex-1 py-4 text-gray-400 font-black text-sm"
                >
                  پاشەکەوت نەکرێ
                </button>
                <button 
                  disabled={submitting}
                  onClick={handleSaveModification}
                  className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackageCheck className="w-5 h-5" />}
                  پاشەکەوتکردن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatsWorld({ items, logs, onClose }: any) {
  const totalStock = items.reduce((acc: number, curr: any) => acc + curr.quantity, 0);
  const lowStockCount = items.filter((i: any) => i.quantity <= i.lowStockThreshold && i.quantity > 0).length;
  const outOfStockCount = items.filter((i: any) => i.quantity === 0).length;
  const categoriesCount = new Set(items.map((i: any) => i.category)).size;

  const activityData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const count = logs.filter((l: any) => {
        const logDate = safeDate(l.timestamp);
        return logDate && logDate.toISOString().split('T')[0] === date;
      }).length;
      return {
        date: date.split('-').slice(1).join('/'),
        count
      };
    });
  }, [logs]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col p-6 overflow-y-auto"
      dir="rtl"
    >
      <header className="flex items-center justify-between mb-8 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-black text-gray-800">ئامارەکان</h2>
        <button onClick={onClose} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors">
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto w-full space-y-8 pb-20">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center gap-2">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
               <Package className="w-6 h-6" />
             </div>
             <span className="text-2xl font-black text-gray-800">{totalStock}</span>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">کۆی دانەکان</span>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center gap-2">
             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
               <Grid className="w-6 h-6" />
             </div>
             <span className="text-2xl font-black text-gray-800">{categoriesCount}</span>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">کۆمەڵەکان</span>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center gap-2">
             <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
               <AlertCircle className="w-6 h-6" />
             </div>
             <span className="text-2xl font-black text-amber-600">{lowStockCount}</span>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">کاڵای کەم</span>
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center gap-2">
             <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
               <Trash2 className="w-6 h-6" />
             </div>
             <span className="text-2xl font-black text-red-600">{outOfStockCount}</span>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">بەسەرچوو (0)</span>
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-black text-gray-800 text-lg">چالاکییەکانی ٧ ڕۆژی ڕابردوو</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2563eb" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Progress */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-black text-gray-800 text-lg">ئاگادارییەکانی کۆگا (کەمی کاڵا)</h3>
          <div className="space-y-3">
            {items.filter((i: any) => i.quantity <= i.lowStockThreshold && i.quantity > 0).map((item: any, idx: number) => (
              <div key={`${item.id || 'lowstock'}-${idx}`} className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                    <p className="text-[10px] text-amber-600 font-black uppercase">بەردەست: {item.quantity}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">ئاستی کەمترین</p>
                  <p className="font-black text-gray-700">{item.lowStockThreshold}</p>
                </div>
              </div>
            ))}
            {lowStockCount === 0 && (
              <div className="text-center py-10 opacity-30">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="font-bold text-sm">هەموو کاڵاکان لە ئاستی ئاساییدان</p>
              </div>
            )}
          </div>
        </div>

        {/* Categories Progress */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-black text-gray-800 text-lg">دابەشبوونی کاڵاکان بەپێی بەش</h3>
          <div className="space-y-6">
            {Array.from(new Set(items.map((i: any) => i.category))).map((cat, idx) => {
              const count = items.filter((i: any) => i.category === cat).length;
              const percentage = (count / (items.length || 1)) * 100;
              return (
                <div key={`${cat || 'unknown'}-${idx}`} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-700">{cat}</span>
                    <span className="text-gray-400">{count} دانە</span>
                  </div>
                  <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center py-10 opacity-20 transform scale-75">
          <Package className="w-16 h-16 mx-auto mb-4" />
          <p className="font-black tracking-[0.5em] uppercase">Built with Pride</p>
        </div>
      </div>
    </motion.div>
  );
}

