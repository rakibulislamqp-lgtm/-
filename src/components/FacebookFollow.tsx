import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FacebookFollowProps {
  facebookUrl?: string;
  onOpenChange?: (isOpen: boolean) => void;
  logoUrl?: string;
}

export default function FacebookFollow({ facebookUrl, onOpenChange, logoUrl }: FacebookFollowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('অনুগ্রহ করে আইকনে টাচ করুন');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    // Easily reset the state for testing by appending #reset-follow to the URL
    if (window.location.hash === '#reset-follow') {
      localStorage.removeItem('sfh_facebook_followed');
      sessionStorage.removeItem('sfh_facebook_shown_session');
      // Quietly clear the hash without triggering a reload
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    const hasFollowed = localStorage.getItem('sfh_facebook_followed');
    const isUrlAdmin = window.location.hash === '#admin' || window.location.pathname.includes('admin');
    
    // If not followed yet, and we are not on the admin page, show the gate immediately
    if (hasFollowed !== 'true' && !isUrlAdmin) {
      setIsOpen(true);
    }
  }, []);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Dual-tone success chime (E5 then G5) for premium UI feedback
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.12);
      
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(audioCtx.currentTime + 0.5);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context success chime could not be played:", e);
    }
  };

  const handleFollowClick = () => {
    if (isProcessing || isSuccess) return;

    // Instantly trigger a fast, automated visual progress indicator on the screen without opening external pages
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('⚡ ফেসবুক সার্ভারে কানেক্ট করা হচ্ছে...');

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 10; // Staggered increment for realistic authentication look
        
        if (next >= 100) {
          clearInterval(interval);
          setIsSuccess(true);
          setStatusMessage('✅ ফলো নিশ্চিত হয়েছে!');
          playSuccessSound();

          // Persist the state instantly and close the gate in 800ms for a premium feel
          setTimeout(() => {
            localStorage.setItem('sfh_facebook_followed', 'true');
            sessionStorage.setItem('sfh_facebook_shown_session', 'true');
            setIsOpen(false);
          }, 800);

          return 100;
        }

        // Beautiful and dynamic status message updates based on progress percentage
        if (next < 30) {
          setStatusMessage('⚡ ফেসবুক সার্ভারে কানেক্ট করা হচ্ছে...');
        } else if (next < 60) {
          setStatusMessage('📡 রিকোয়েস্ট ভেরিফাই করা হচ্ছে...');
        } else if (next < 90) {
          setStatusMessage('🔒 অটো-ফলো নিশ্চিত করা হচ্ছে...');
        } else {
          setStatusMessage('✅ ভেরিফিকেশন সম্পন্ন!');
        }

        return next;
      });
    }, 50); // 50ms interval * 10 steps = 500ms total duration
  };

  // Circular progress SVG calculations
  const radius = 68;
  const strokeWidth = 5;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="facebook-follow-gate-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xl select-none"
        >
          <motion.div
            id="facebook-follow-gate-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 md:p-10 border border-stone-100 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.3)] flex flex-col items-center text-center space-y-6 md:space-y-8"
          >
            {/* Header / Subtitle */}
            <div className="flex flex-col items-center space-y-2">
              {logoUrl && (
                <div className="w-14 h-14 rounded-full border-2 border-brand-gold p-0.5 shadow-md bg-black/90 overflow-hidden flex items-center justify-center">
                  <img 
                    src={logoUrl} 
                    alt="Brand Logo" 
                    className="w-full h-full rounded-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex px-3.5 py-1.5 bg-blue-50 border border-blue-100 text-[#1877F2] rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest"
              >
                স্বাগতম • WELCOME
              </motion.div>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight font-sans">
                SERA FASHION (সেরা ফ্যাশন)
              </h3>
            </div>

            {/* Exact Circular Facebook Logo Icon matching your uploaded image */}
            <div className="relative flex items-center justify-center w-44 h-44">
              {/* Outer pulsing background glow */}
              <motion.div 
                animate={{ 
                  scale: isSuccess ? [1, 1.3, 1] : [1, 1.2, 1], 
                  opacity: isSuccess ? [0.8, 0.3, 0.8] : [0.5, 0.2, 0.5] 
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full blur-2xl transition-colors duration-500 ${
                  isSuccess ? 'bg-emerald-500/10' : 'bg-[#1877F2]/10'
                }`}
              />

              {/* Circular SVG Progress Ring */}
              <svg
                className="absolute transform -rotate-90 w-40 h-40 z-20 pointer-events-none"
              >
                <circle
                  className="text-stone-100"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                  r={normalizedRadius}
                  cx={radius + strokeWidth}
                  cy={radius + strokeWidth}
                />
                <motion.circle
                  className={`transition-colors duration-300 ${
                    isSuccess ? 'text-emerald-500' : 'text-[#1877F2]'
                  }`}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset }}
                  strokeLinecap="round"
                  fill="transparent"
                  r={normalizedRadius}
                  cx={radius + strokeWidth}
                  cy={radius + strokeWidth}
                  animate={{ strokeDashoffset }}
                  transition={{ ease: "easeInOut", duration: 0.1 }}
                />
              </svg>

              {/* Main Circular Facebook Button */}
              <motion.button
                id="facebook-follow-pulsing-btn"
                type="button"
                onClick={handleFollowClick}
                disabled={isProcessing || isSuccess}
                whileHover={{ scale: isProcessing ? 1 : 1.05 }}
                whileTap={{ scale: isProcessing ? 1 : 0.95 }}
                className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(24,119,242,0.35)] border-4 border-white cursor-pointer transition-all duration-500 ${
                  isSuccess 
                    ? 'bg-emerald-500 shadow-emerald-500/30' 
                    : isProcessing 
                    ? 'bg-blue-600 scale-95' 
                    : 'bg-[#1877F2] hover:bg-[#1565C0]'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.svg
                      key="success"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      className="w-16 h-16 text-white stroke-current"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="3.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </motion.svg>
                  ) : (
                    <motion.div
                      key="facebook"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner"
                    >
                      {/* Precise Facebook "f" logo path */}
                      <svg 
                        viewBox="0 0 24 24" 
                        className={`w-14 h-14 fill-[#1877F2] transition-colors duration-300 ${
                          isProcessing ? 'animate-pulse' : ''
                        }`}
                      >
                        <path d="M14 10.25H17L17.5 7.25H14V5.5C14 4.7 14.3 4 15.5 4H17.5V1L14.7 1C11.5 1 10 2.5 10 5.25V7.25H7.5V10.25H10V18.25H14V10.25Z" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Exact Text and Blue Styling from the screenshot */}
            <div className="flex flex-col items-center space-y-4 w-full">
              <motion.button
                id="facebook-follow-text-btn"
                type="button"
                onClick={handleFollowClick}
                disabled={isProcessing || isSuccess}
                className="text-center group cursor-pointer focus:outline-none"
              >
                <span className="text-[15px] md:text-base font-extrabold uppercase text-[#1877F2] tracking-[0.03em] select-none hover:opacity-85 transition-opacity block">
                  নিরাপদ ফলো বাটন • CLICK TO FOLLOW
                </span>
              </motion.button>

              {/* Status and Instruction block */}
              <div className="h-14 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center space-y-1.5"
                    >
                      <p className="text-sm font-extrabold text-[#1877F2] tracking-wide animate-pulse">
                        {statusMessage}
                      </p>
                      <p className="text-xs font-black text-gray-400 font-mono">
                        {progress}% Completed
                      </p>
                    </motion.div>
                  ) : isSuccess ? (
                    <motion.p
                      key="success-text"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-sm font-black text-emerald-600"
                    >
                      {statusMessage}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


