import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px 14px 44px',
  borderRadius: '12px',
  fontSize: '15px',
  backgroundColor: 'rgba(28, 25, 23, 0.6)',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  color: '#f5f5f4',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: '#d6d3d1',
  marginBottom: '8px'
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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `url('https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=2000&auto=format&fit=crop')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      padding: '20px',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(28, 25, 23, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 0
      }} />
      
      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'rgba(41, 37, 36, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '24px',
        padding: '40px 32px',
        border: '1px solid rgba(217, 119, 6, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(217, 119, 6, 0.1)',
        zIndex: 10,
        position: 'relative'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d97706, #f59e0b)',
            boxShadow: '0 10px 25px rgba(217, 119, 6, 0.3)',
            marginBottom: '20px'
          }}>
            <svg style={{ width: '36px', height: '36px', color: '#1c1917' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            margin: '0 0 8px 0',
            background: 'linear-gradient(to right, #f59e0b, #fff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {isRegistering ? 'Create Account' : 'Welcome to ENR'}
          </h1>
          <p style={{ color: '#a8a29e', fontSize: '15px', margin: 0 }}>
            {isRegistering ? 'Register to start booking tickets' : 'Sign in to your passenger account'}
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
                  onFocus={(e) => e.target.style.borderColor = '#d97706'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)'}
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
                onFocus={(e) => e.target.style.borderColor = '#d97706'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)'}
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
                onFocus={(e) => e.target.style.borderColor = '#d97706'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)'}
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
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              color: '#f87171',
              fontSize: '14px'
            }}>
              <svg style={{ width: '20px', height: '20px', marginRight: '8px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Remember me & Forgot password (Only for Login) */}
          {!isRegistering && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#a8a29e' }}>
                <input type="checkbox" style={{ marginRight: '8px', accentColor: '#d97706', width: '16px', height: '16px' }} />
                Remember me
              </label>
              <span style={{ fontSize: '14px', color: '#d97706', cursor: 'pointer', fontWeight: 600 }}>
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
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #d97706, #f59e0b)',
              color: '#1c1917',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              boxShadow: '0 8px 16px rgba(217, 119, 6, 0.2)',
              opacity: isLoading ? 0.8 : 1,
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => { if(!isLoading) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { if(!isLoading) e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isLoading ? 'Authenticating...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '24px' }}>
          <p style={{ fontSize: '14px', color: '#a8a29e', margin: 0 }}>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <span 
              style={{ color: '#d97706', fontWeight: 700, cursor: 'pointer' }}
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
