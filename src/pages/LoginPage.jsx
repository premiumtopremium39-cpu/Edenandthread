import React, { useState } from 'react';
import { authService, isSupabaseConfigured } from '../lib/supabase';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage({ showToast, onLoginSimulate }) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Supabase Email Sign In / Sign Up
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (!isSignIn && !name.trim()) return;

    setIsLoading(true);

    try {
      if (isSupabaseConfigured()) {
        if (isSignIn) {
          const data = await authService.signIn(email.trim(), password.trim());
          const userName = data?.user?.user_metadata?.full_name || email.split('@')[0];
          showToast(`<i class="fa-solid fa-circle-check"></i> Welcome back, ${userName}!`);
          const prevHash = localStorage.getItem("eden_threads_login_redirect") || "#checkout";
          localStorage.removeItem("eden_threads_login_redirect");
          window.location.hash = prevHash;
        } else {
          const data = await authService.signUp(email.trim(), password.trim(), name.trim());
          if (data?.session) {
            showToast(`<i class="fa-solid fa-circle-check"></i> Account created successfully!`);
          } else {
            showToast(`<i class="fa-solid fa-envelope-circle-check"></i> Confirmation email sent! Check your inbox.`);
          }
          const prevHash = localStorage.getItem("eden_threads_login_redirect") || "#checkout";
          localStorage.removeItem("eden_threads_login_redirect");
          window.location.hash = prevHash;
        }
      } else {
        // Resilient simulated mode when Supabase keys are not entered yet
        const mockUser = {
          id: `usr_${Date.now()}`,
          name: isSignIn ? email.split('@')[0] : name.trim(),
          email: email.trim(),
          role: email.trim() === 'admin@mail.com' ? 'admin' : 'customer'
        };
        if (onLoginSimulate) onLoginSimulate(mockUser);
        showToast(`<i class="fa-solid fa-circle-check"></i> Signed in as ${mockUser.name} (Simulated mode - Connect Supabase in .env for production)`);
        const prevHash = localStorage.getItem("eden_threads_login_redirect") || "#checkout";
        localStorage.removeItem("eden_threads_login_redirect");
        window.location.hash = prevHash;
      }
    } catch (err) {
      console.error("[Supabase Auth Error]:", err);
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> ${err.message || 'Authentication error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Supabase Google OAuth
  const handleGoogleClick = async () => {
    setIsGoogleLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const redirectHash = localStorage.getItem("eden_threads_login_redirect") || "#checkout";
        await authService.signInWithGoogle(redirectHash);
      } else {
        // Fallback simulated Google sign in
        const mockGoogleUser = {
          id: `usr_google_${Date.now()}`,
          name: "Alexander Vance",
          email: "alexander.vance@gmail.com",
          role: "customer"
        };
        if (onLoginSimulate) onLoginSimulate(mockGoogleUser);
        showToast(`<i class="fa-solid fa-circle-check"></i> Signed in via Google (Simulated mode)`);
        const prevHash = localStorage.getItem("eden_threads_login_redirect") || "#checkout";
        localStorage.removeItem("eden_threads_login_redirect");
        window.location.hash = prevHash;
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.error("[Google OAuth Error]:", err);
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Google Sign In failed: ${err.message}`);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '110px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }} className="login-page">
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '2.5rem 3rem' }} className="login-card">
        
        {/* Brand Oval Seal Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-block', marginBottom: '1.25rem' }}>
            <BrandLogo variant="circle" size={110} />
          </div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Atelier Account
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, color: 'var(--green-dark)' }}>
            {isSignIn ? 'Sign In' : 'Create Account'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Sign in with your Google account or email credentials
          </p>
        </div>

        {/* Real Google OAuth Button */}
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button 
            type="button"
            onClick={handleGoogleClick}
            disabled={isGoogleLoading || isLoading}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.75rem', 
              padding: '0.85rem 1rem', 
              border: '1px solid var(--border-medium)', 
              backgroundColor: '#fff', 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)', 
              transition: 'var(--transition-fast)',
              cursor: isGoogleLoading ? 'wait' : 'pointer'
            }}
            className="oauth-btn google-btn"
          >
            {isGoogleLoading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.79 2.16c1.63-1.5 2.57-3.71 2.57-6.49z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.79-2.16c-.78.52-1.78.83-3.17.83-2.44 0-4.51-1.65-5.25-3.87L.96 12.77C2.43 15.69 5.47 17.75 9 17.75z"/>
                <path fill="#FBBC05" d="M3.75 10.6c-.19-.58-.3-1.2-.3-1.8s.11-1.22.3-1.8L.96 4.84C.35 6.07 0 7.49 0 9s.35 2.93.96 4.16l2.79-2.56z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4C13.46.97 11.43.1 9 .1c-3.53 0-6.57 2.06-8.04 4.98L3.75 7.64C4.49 5.42 6.56 3.58 9 3.58z"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        {/* Separator */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--text-muted)' }}>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></span>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 1rem' }}>or continue with</span>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          {!isSignIn && (
            <div>
              <label htmlFor="auth-name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Full Name</label>
              <input 
                type="text" 
                id="auth-name" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', fontSize: '0.9rem', borderRadius: 0 }}
                placeholder="Alex Mercer"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              type="email" 
              id="auth-email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', fontSize: '0.9rem', borderRadius: 0 }}
              placeholder="alex@gmail.com"
            />
          </div>
          <div>
            <label htmlFor="auth-password" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              id="auth-password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', fontSize: '0.9rem', borderRadius: 0 }}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || isGoogleLoading}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '1rem', 
              fontSize: '0.85rem', 
              letterSpacing: '0.1em', 
              textTransform: 'uppercase', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: isLoading ? 'wait' : 'pointer'
            }}
          >
            {isLoading && <i className="fa-solid fa-spinner fa-spin"></i>}
            {isSignIn ? 'Sign In with Email' : 'Create Atelier Account'}
          </button>
        </form>

        {/* Toggle Form Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            type="button"
            onClick={() => setIsSignIn(!isSignIn)}
            style={{ fontSize: '0.75rem', color: 'var(--gold-dark)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', transition: 'var(--transition-fast)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--green-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gold-dark)'}
          >
            {isSignIn ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
