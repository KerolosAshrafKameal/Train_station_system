import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px 10px 42px',
  borderRadius: '8px',
  fontSize: '13.5px',
  backgroundColor: '#FFFFFF',
  border: '1.5px solid #E8E0E0',
  color: '#1A0A0A',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#8C6B6B',
  marginBottom: '5px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#a8a29e',
  width: '20px',
  height: '20px'
};

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegistering && name.trim().length < 3) {
      setError('Please enter your full name');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address containing @');
      return;
    }
    if (password.length < 4) {
      setError('Password is too short');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        // Register flow
        const { error: insertError } = await supabase
          .from('passengers')
          .insert([{ email, name: name.trim(), password }]);
          
        if (insertError) {
          if (insertError.code === '23505') { // unique violation
            setError('This email is already registered. Please sign in.');
          } else {
            setError('Failed to create account. Please try again.');
          }
          setIsLoading(false);
          return;
        }
        
        // Success registration automatically logs in
        localStorage.setItem('enr_user_email', email);
        localStorage.setItem('enr_user_name', name.trim());
        onLogin();
        navigate('/');
      } else {
        // Login flow
        const { data, error } = await supabase
          .from('passengers')
          .select('*')
          .eq('email', email)
          .eq('password', password)
          .single();

        if (error || !data) {
          setError('Invalid Email or Password');
          setIsLoading(false);
          return;
        }

        // Success login
        localStorage.setItem('enr_user_email', email);
        localStorage.setItem('enr_user_name', data.name);
        onLogin();
        navigate('/');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: '#F8F8F8',
    }}>
      {/* Left Hero Panel */}
      <div style={{
        flex: '1 1 55%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '48px',
        minHeight: '100vh',
      }}>
        <img
          src="/assets/hero-train.png"
          alt="ENR Train"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(139,26,26,0.72) 0%, rgba(26,10,10,0.55) 100%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 30, padding: '6px 16px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 20 }}>🚆</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Egyptian National Railways</span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', marginBottom: 10, lineHeight: 1.2 }}>
            Smart Ticket Booking<br />System – Egypt
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, maxWidth: 400, lineHeight: 1.65 }}>
            Reserve your seat, manage your bookings, and travel with ease across Egypt's rail network.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={{
        flex: '0 0 400px',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 40px',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        position: 'relative',
        zIndex: 10,
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px', height: '60px',
            borderRadius: '14px',
            background: '#8B1A1A',
            marginBottom: '18px',
            fontSize: '28px',
          }}>🚆</div>
          <h1 style={{
            fontSize: '22px', fontWeight: 800,
            margin: '0 0 6px 0', color: '#1A0A0A',
          }}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{ color: '#8C6B6B', fontSize: '13px', margin: 0 }}>
            {isRegistering ? 'Register to start booking tickets' : 'Sign in to your ENR passenger account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Name Input (Only for Register) */}
          {isRegistering && (
            <div>
              <label style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  placeholder="John Doe"
                  onFocus={(e) => e.target.style.borderColor = '#8B1A1A'}
                  onBlur={(e) => e.target.style.borderColor = '#E8E0E0'}
                  required
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="passenger@example.com"
                onFocus={(e) => e.target.style.borderColor = '#8B1A1A'}
                onBlur={(e) => e.target.style.borderColor = '#E8E0E0'}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{...inputStyle, paddingRight: '44px'}}
                placeholder="••••••••"
                onFocus={(e) => e.target.style.borderColor = '#8B1A1A'}
                onBlur={(e) => e.target.style.borderColor = '#E8E0E0'}
                required
              />
              {/* Eye icon to toggle password */}
              <div 
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: '#a8a29e', cursor: 'pointer', padding: '4px'
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(139,26,26,0.07)',
              border: '1px solid rgba(139,26,26,0.25)',
              borderRadius: '7px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              color: '#8B1A1A',
              fontSize: '13px',
            }}>
              <svg style={{ width: '16px', height: '16px', marginRight: '8px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Remember me & Forgot password (Only for Login) */}
          {!isRegistering && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#a8a29e' }}>
                <input type="checkbox" style={{ marginRight: '8px', accentColor: '#8B1A1A', width: '16px', height: '16px' }} />
                Remember me
              </label>
              <span 
                onClick={() => {
                  if(!email) {
                    setError('Please enter your email address first to reset password.');
                  } else {
                    setError(`Password reset instructions have been sent to ${email}`);
                  }
                }}
                style={{ fontSize: '13px', color: '#8B1A1A', cursor: 'pointer', fontWeight: 600 }}>
                Forgot password?
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              border: 'none',
              background: '#8B1A1A',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              opacity: isLoading ? 0.7 : 1,
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => { if(!isLoading) e.currentTarget.style.background = '#A52020'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#8B1A1A'; }}
          >
            {isLoading ? 'Authenticating...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #F0EAEA', paddingTop: '20px' }}>
          <p style={{ fontSize: '13px', color: '#8C6B6B', margin: 0 }}>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <span
              style={{ color: '#8B1A1A', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setPassword('');
              }}
            >
              {isRegistering ? 'Sign In' : 'Register now'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
