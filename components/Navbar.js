'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const defaultAccount = {
  username: 'User',
  email: 'No email saved',
  playerTag: 'Unknown tag',
};

let cachedAccountSnapshot = defaultAccount;
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeToHydration() {
  return () => {};
}

function getAccountSnapshot() {
  return cachedAccountSnapshot;
}

function refreshAccountSnapshot() {
  const nextSnapshot = {
    username: Cookies.get('username') || 'User',
    email: Cookies.get('email') || 'No email saved',
    playerTag: Cookies.get('playerTag') || 'Unknown tag',
  };

  if (
    cachedAccountSnapshot.username === nextSnapshot.username &&
    cachedAccountSnapshot.email === nextSnapshot.email &&
    cachedAccountSnapshot.playerTag === nextSnapshot.playerTag
  ) {
    return;
  }

  cachedAccountSnapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
}

export default function Navbar({ player = null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const account = useSyncExternalStore(subscribe, getAccountSnapshot, () => defaultAccount);
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  const profileName = player?.name || account.username;
  const playerTag = isHydrated ? player?.tag || account.playerTag : defaultAccount.playerTag;
  const clanTag = isHydrated ? player?.clan?.tag || '' : '';
  const accountName = account.username || player?.name || 'User';
  const email = account.email;

  useEffect(() => {
    refreshAccountSnapshot();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('username');
    Cookies.remove('email');
    Cookies.remove('playerTag');
    router.push('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <button className="nav-brand" onClick={() => router.push('/dashboard')}>
          <Image src="/logo-icon.png" alt="Logo" className="nav-logo" width={44} height={44} />
          <div className="brand-copy">
            <span className="brand-kicker">Clash overview</span>
            <span className="brand-text">CoC Dashboard</span>
          </div>
        </button>

        <div className="nav-actions">
          <div className="nav-links">
            <button
              type="button"
              className="nav-shortcut"
              onClick={() => playerTag && router.push(`/player?tag=${encodeURIComponent(playerTag)}`)}
              disabled={!playerTag || playerTag === 'Unknown tag'}
            >
              Players
            </button>
            <button
              type="button"
              className="nav-shortcut secondary"
              onClick={() => clanTag && router.push(`/clan?tag=${encodeURIComponent(clanTag)}`)}
              disabled={!clanTag}
            >
              Clans
            </button>
          </div>

          <div className="profile-wrap" ref={menuRef}>
          <button className="profile-trigger" onClick={() => setMenuOpen((open) => !open)}>
            <div className="profile-avatar">{profileName.charAt(0).toUpperCase()}</div>
            <div className="profile-copy">
              <span className="profile-name">{profileName}</span>
            </div>
          </button>

          {menuOpen && (
            <div className="profile-popover">
              <div className="popover-header">
                <div className="popover-avatar">{profileName.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="popover-name">{profileName}</div>
                  <div className="popover-tag">Signed in account</div>
                </div>
              </div>

              <div className="popover-grid">
                <div className="detail-card">
                  <span>Username</span>
                  <strong>{accountName}</strong>
                </div>
                <div className="detail-card">
                  <span>Email</span>
                  <strong>{email}</strong>
                </div>
                <div className="detail-card">
                  <span>Player tag</span>
                  <strong>{playerTag}</strong>
                </div>
              </div>

              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          padding: 18px 24px;
          background:
            radial-gradient(circle at top left, rgba(229, 108, 39, 0.18), transparent 32%),
            #faf8f5;
          border-bottom: 1px solid #ece4da;
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }

        .nav-logo {
          width: 44px;
          height: 44px;
          object-fit: contain;
        }

        .brand-copy {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .brand-kicker {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #d76d2f;
        }

        .brand-text {
          font-size: 24px;
          line-height: 1;
          font-weight: 700;
          color: #17120f;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-wrap {
          position: relative;
        }

        .nav-shortcut {
          border: none;
          border-radius: 14px;
          padding: 11px 16px;
          background: #e56c27;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .nav-shortcut.secondary {
          background: #fff1e8;
          color: #d16426;
          border: 1px solid #f2d8c8;
        }

        .nav-shortcut:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .nav-shortcut:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .profile-trigger {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px 8px 8px;
          border: 1px solid #eadfd2;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(30, 22, 16, 0.06);
          cursor: pointer;
        }

        .profile-avatar,
        .popover-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: linear-gradient(135deg, #e56c27, #f0a44b);
          color: #ffffff;
          font-weight: 700;
          flex-shrink: 0;
        }

        .profile-avatar {
          width: 42px;
          height: 42px;
          font-size: 18px;
        }

        .profile-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .profile-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #b07d5f;
        }

        .profile-name {
          font-size: 15px;
          font-weight: 600;
          color: #17120f;
        }

        .profile-popover {
          position: absolute;
          right: 0;
          top: calc(100% + 12px);
          width: 320px;
          padding: 18px;
          border: 1px solid #eadfd2;
          border-radius: 22px;
          background: #fffdfb;
          box-shadow: 0 22px 50px rgba(30, 22, 16, 0.12);
        }

        .popover-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .popover-avatar {
          width: 52px;
          height: 52px;
          font-size: 20px;
        }

        .popover-name {
          font-size: 18px;
          font-weight: 700;
          color: #17120f;
        }

        .popover-tag {
          font-size: 13px;
          color: #8d6c56;
          margin-top: 4px;
        }

        .popover-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .detail-card {
          padding: 12px;
          border-radius: 16px;
          background: #faf5ef;
          border: 1px solid #efe2d4;
        }

        .detail-card span {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #a17758;
          margin-bottom: 8px;
        }

        .detail-card strong {
          display: block;
          font-size: 15px;
          line-height: 1.25;
          color: #17120f;
        }

        .logout-btn {
          width: 100%;
          padding: 12px 14px;
          border: none;
          border-radius: 14px;
          background: #e56c27;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .logout-btn:hover {
          background: #ff5e00;
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 14px 16px;
          }

          .nav-container {
            align-items: flex-start;
            flex-direction: column;
          }

          .brand-text {
            font-size: 20px;
          }

          .nav-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .nav-links {
            width: 100%;
          }

          .nav-shortcut {
            flex: 1;
          }

          .profile-trigger {
            width: 100%;
            justify-content: flex-start;
          }

          .profile-popover {
            width: 100%;
            position: static;
            margin-top: 12px;
          }
        }
      `}</style>
    </nav>
  );
}
