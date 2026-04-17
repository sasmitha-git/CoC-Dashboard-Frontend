'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../lib/api';
import Cookies from 'js-cookie';

export default function AuthForm({ mode = 'login' }) {
  const router = useRouter();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    playerTag: '',
    apiToken: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!isLogin) {
      if (!form.username.trim()) {
        setError('Username is required');
        return;
      }
      if (!form.playerTag.trim()) {
        setError('Player tag is required');
        return;
      }
      if (!form.apiToken.trim()) {
        setError('Player API token is required');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (isLogin) {
        // Login: only email + password
        response = await authApi.login({
          email: form.email,
          password: form.password,
        });
        const playerTag = response.data.playerTag || '';
        Cookies.set('playerTag', playerTag, { expires: 1 });
        Cookies.set('email', form.email, { expires: 1 });
        Cookies.set('username', response.data.username || form.email.split('@')[0], { expires: 1 });
      } else {
        // Register: username, email, password, playerTag
        response = await authApi.register({
          username: form.username,
          email: form.email,
          password: form.password,
          playerTag: form.playerTag,
          apiToken: form.apiToken,
        });
        Cookies.set('playerTag', form.playerTag, { expires: 1 });
        Cookies.set('email', form.email, { expires: 1 });
        Cookies.set('username', form.username, { expires: 1 });
      }
      Cookies.set('token', response.data.accessToken, { expires: 1 });
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || (isLogin ? 'Invalid email or password' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const title = isLogin ? 'Log into CoC Stat Dashboard' : 'Create your account';
  const buttonText = isLogin
    ? loading ? 'Logging in...' : 'Log in'
    : loading ? 'Creating account...' : 'Sign up';
  const footerText = isLogin ? "Don't have an account?" : 'Already have an account?';
  const footerLinkText = isLogin ? 'Sign up' : 'Log in';
  const footerLinkRoute = isLogin ? '/register' : '/login';

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="left-panel">
          <img src="/logo-icon.png" alt="App logo" className="left-logo-img" />
          <p className="left-tagline display-font">
            See your clan stats from your{' '}
            <span className="tagline-span">Best Warriors.</span>
          </p>
          <img src="/login-hero.png" alt="Dashboard preview" className="left-hero-img" />
        </div>

        <div className="divider" />

        <div className="right-panel">
          <p className="form-title display-font">{title}</p>
          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <input
                  className="ig-input"
                  type="text"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="username"
                  required
                />
                <input
                  className="ig-input"
                  type="text"
                  placeholder="Your Player Tag (e.g., #GJLV92Q00)"
                  value={form.playerTag}
                  onChange={(e) => setForm({ ...form, playerTag: e.target.value })}
                  autoComplete="off"
                  required
                />
                <input
                  className="ig-input"
                  type="text"
                  placeholder="Player API Token from CoC settings"
                  value={form.apiToken}
                  onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                  autoComplete="off"
                  required
                />
                <p className="helper-text">
                  Open Clash of Clans, go to Settings, then More Settings, and copy the one-time
                  player API token to verify you own this account.
                </p>
              </>
            )}
            <input
              className="ig-input"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
            <input
              className="ig-input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
            {!isLogin && (
              <input
                className="ig-input"
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                autoComplete="new-password"
                required
              />
            )}

            <button type="submit" className={`ig-btn ${loading ? 'loading' : ''}`} disabled={loading}>
              {buttonText}
            </button>
          </form>

          {isLogin && <p className="forgot-link">Forgot password?</p>}

          <div className="footer-row">
            {footerText}
            <span className="footer-link" onClick={() => router.push(footerLinkRoute)}>
              {footerLinkText}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Your existing styles – unchanged */
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        .auth-wrapper {
          display: flex;
          align-items: flex-start;
          width: 100%;
          max-width: 1200px;
          padding: 40px 24px;
          gap: 40px;
        }
        .left-panel {
          flex: 1.3;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
        }
        .left-logo-img {
          width: 100px;
          height: 100px;
          object-fit: contain;
          margin-bottom: 6px;
        }
        .left-tagline {
          font-size: 36px;
          font-weight: bold;
          color: #030303;
          line-height: 1.25;
          max-width: 420px;
          margin: 0;
        }
        .tagline-span {
          color: #e56c27;
        }
        .left-hero-img {
          width: 100%;
          height: 400px;
          object-fit: contain;
          border-radius: 20px;
          margin-left: -10%;
          background: #fafafa;
        }
        .divider {
          width: 2px;
          background: #e0e0e0;
          align-self: stretch;
        }
        .right-panel {
          flex: 0 0 400px;
          display: flex;
          flex-direction: column;
          margin-top: 60px;
        }
        .form-title {
          font-size: 22px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 28px;
        }
        .error-box {
          background: #fff0f0;
          border: 1px solid #ffb3b3;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          color: #c0392b;
          margin-bottom: 18px;
          text-align: center;
        }
        .ig-input {
          width: 100%;
          padding: 14px 18px;
          background: #fafafa;
          border: 1px solid #dbdbdb;
          border-radius: 12px;
          font-size: 16px;
          color: #1a1a1a;
          outline: none;
          margin-bottom: 14px;
          box-sizing: border-box;
          transition: border 0.2s;
        }
        .ig-input:focus {
          border-color: #e56c27;
        }
        .ig-btn {
          width: 100%;
          padding: 14px;
          background: #e56c27;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          margin-top: 6px;
          transition: opacity 0.15s;
        }
        .ig-btn.loading {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .helper-text {
          margin: -4px 0 14px;
          color: #8b7c70;
          font-size: 13px;
          line-height: 1.5;
        }
        .ig-btn:hover:not(:disabled) {
          background: #ff5e00;
        }
        .forgot-link {
          text-align: center;
          margin-top: 20px;
          font-size: 15px;
          color: #00376b;
          font-weight: 500;
          cursor: pointer;
        }
        .footer-row {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #dbdbdb;
          text-align: center;
          font-size: 16px;
          color: #737373;
        }
        .footer-link {
          color: #00376b;
          font-weight: 600;
          cursor: pointer;
          margin-left: 6px;
        }
        @media (max-width: 1024px) {
          .auth-wrapper { max-width: 960px; gap: 30px; }
          .right-panel { flex: 0 0 360px; }
          .left-tagline { font-size: 24px; }
          .left-hero-img { height: 380px; }
        }
        @media (max-width: 768px) {
          .auth-wrapper { flex-direction: column; align-items: center; padding: 24px 20px; gap: 24px; }
          .left-panel { flex: none; width: 100%; align-items: center; text-align: center; gap: 12px; }
          .left-logo-img { width: 60px; height: 60px; }
          .left-tagline { font-size: 22px; max-width: 90%; text-align: center; }
          .left-hero-img { display: none; }
          .divider { display: none; }
          .right-panel { flex: none; width: 100%; max-width: 450px; margin-top: 0; padding: 0; }
          .form-title { font-size: 20px; text-align: center; }
          .ig-input { padding: 13px 16px; font-size: 16px; }
          .ig-btn { padding: 13px; font-size: 16px; }
          .footer-row { font-size: 15px; }
        }
        @media (max-width: 480px) {
          .auth-wrapper { padding: 16px; }
          .left-tagline { font-size: 20px; }
          .right-panel { max-width: 100%; }
          .form-title { font-size: 19px; }
          .ig-input { padding: 12px 14px; font-size: 15px; }
          .ig-btn { padding: 12px; font-size: 15px; }
          .forgot-link { font-size: 14px; }
          .footer-row { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
