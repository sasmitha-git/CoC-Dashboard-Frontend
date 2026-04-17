'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import Navbar from '@/components/Navbar';
import { playerApi } from '@/lib/api';
import { normalizePlayerResponse } from '@/lib/player';

function sanitizeTag(tag) {
  return tag.trim().toUpperCase();
}

function pickLeagueIcon(league) {
  if (!league) return '';

  const iconUrls = league.iconUrls || {};

  return (
    iconUrls.large ||
    iconUrls.medium ||
    iconUrls.small ||
    iconUrls.tiny ||
    iconUrls.url ||
    ''
  );
}

function getPrimaryLeague(player) {
  return player?.leagueTier || player?.league || player?.builderBaseLeague || null;
}

export default function PlayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTag = searchParams.get('tag') || '';

  const [searchTag, setSearchTag] = useState(queryTag);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    setSearchTag(queryTag);
  }, [queryTag]);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!queryTag) {
      setPlayer(null);
      setError('');
      setLoading(false);
      return;
    }

    let ignore = false;

    const loadPlayer = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await playerApi.getPlayer(queryTag);
        if (!ignore) {
          setPlayer(normalizePlayerResponse(response.data));
        }
      } catch (err) {
        if (ignore) return;

        setPlayer(null);
        if (err?.code === 'ECONNABORTED') {
          setError('Player lookup took too long. Please make sure the backend is running and try again.');
        } else if (err?.response?.status === 404) {
          setError('No player was found for that tag. Check the tag and try again.');
        } else {
          setError('Unable to load player details right now.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPlayer();

    return () => {
      ignore = true;
    };
  }, [queryTag, router]);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextTag = sanitizeTag(searchTag);
    if (!nextTag) return;
    router.push(`/player?tag=${encodeURIComponent(nextTag)}`);
  };

  const openClan = () => {
    if (player?.clan?.tag) {
      router.push(`/clan?tag=${encodeURIComponent(player.clan.tag)}`);
    }
  };

  const playerName = player?.name || 'Player';
  const playerClan = player?.clan?.name || 'No clan';
  const primaryLeague = getPrimaryLeague(player);
  const homeLeagueIcon = pickLeagueIcon(player?.league);
  const builderLeagueIcon = pickLeagueIcon(player?.builderBaseLeague);
  const leagueTierIcon = pickLeagueIcon(player?.leagueTier);

  const statCards = [
    { label: 'Trophies', value: player?.trophies ?? 0, sub: `Best ${player?.bestTrophies ?? 0}` },
    { label: 'Town Hall', value: player?.townHallLevel ?? '-', sub: `Builder Hall ${player?.builderHallLevel ?? '-'}` },
    { label: 'War stars', value: player?.warStars ?? 0, sub: 'Lifetime war stars' },
    { label: 'Donations', value: player?.donations ?? 0, sub: `Received ${player?.donationsReceived ?? 0}` },
    { label: 'Attack wins', value: player?.attackWins ?? 0, sub: `Defense wins ${player?.defenseWins ?? 0}` },
    { label: 'Builder trophies', value: player?.builderBaseTrophies ?? 0, sub: `Best ${player?.bestBuilderBaseTrophies ?? 0}` },
  ];

  return (
    <>
      <Navbar player={player} />

      <div className="player-page">
        <div className="player-shell">
          <section className="search-card">
            <div>
              <div className="section-eyebrow">Player search</div>
              <h1>Find any player by tag</h1>
              <p>Enter a Clash of Clans player tag to view current stats, league info, and clan details.</p>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                className="search-input"
                value={searchTag}
                onChange={(event) => setSearchTag(event.target.value)}
                placeholder="Enter player tag e.g. #GJLV92Q00"
              />
              <button type="submit" className="search-button">
                Search
              </button>
            </form>
          </section>

          {loading ? (
            <div className="status-card">Loading player details...</div>
          ) : error ? (
            <div className="status-card error">{error}</div>
          ) : !player ? (
            <div className="status-card">Search for a player tag to get started.</div>
          ) : (
            <>
              <section className="hero-grid">
                <article className="hero-card">
                  <div className="player-identity">
                    <div className="avatar-badge">{playerName.charAt(0).toUpperCase()}</div>

                    <div className="identity-copy">
                      <div className="section-eyebrow">Player overview</div>
                      <h2>{playerName}</h2>
                      <p>{player?.tag || '-'}</p>
                    </div>
                  </div>

                  <div className="identity-meta">
                    <div>
                      <span>Active league</span>
                      <strong>{primaryLeague?.name || 'Unranked'}</strong>
                    </div>
                    <div>
                      <span>Builder base league</span>
                      <strong>{player?.builderBaseLeague?.name || 'Unavailable'}</strong>
                    </div>
                    <div>
                      <span>League tier</span>
                      <strong>{player?.leagueTier?.name || 'Unavailable'}</strong>
                    </div>
                    <div>
                      <span>Clan</span>
                      <strong>{playerClan}</strong>
                    </div>
                    <div>
                      <span>Role</span>
                      <strong>{player?.role || 'Member'}</strong>
                    </div>
                  </div>
                </article>

                <article className="hero-card compact">
                  <div className="section-eyebrow">League badges</div>
                  <div className="league-stack">
                    <div className="league-card">
                      {homeLeagueIcon ? (
                        <Image
                          src={homeLeagueIcon}
                          alt={`${player?.league?.name || 'Home league'} badge`}
                          width={72}
                          height={72}
                          className="league-icon"
                          unoptimized
                        />
                      ) : (
                        <div className="league-fallback">HL</div>
                      )}
                      <div>
                        <h3>{player?.league?.name || 'Unranked'}</h3>
                        <p>Home village league</p>
                      </div>
                    </div>

                    <div className="league-card">
                      {builderLeagueIcon ? (
                        <Image
                          src={builderLeagueIcon}
                          alt={`${player?.builderBaseLeague?.name || 'Builder base league'} badge`}
                          width={72}
                          height={72}
                          className="league-icon"
                          unoptimized
                        />
                      ) : (
                        <div className="league-fallback">BB</div>
                      )}
                      <div>
                        <h3>{player?.builderBaseLeague?.name || 'Unavailable'}</h3>
                        <p>Builder base league</p>
                      </div>
                    </div>

                    <div className="league-card">
                      {leagueTierIcon ? (
                        <Image
                          src={leagueTierIcon}
                          alt={`${primaryLeague?.name || player?.leagueTier?.name || 'League tier'} badge`}
                          width={72}
                          height={72}
                          className="league-icon"
                          unoptimized
                        />
                      ) : (
                        <div className="league-fallback">LT</div>
                      )}
                      <div>
                        <h3>{primaryLeague?.name || 'Unavailable'}</h3>
                        <p>Ranked / seasonal league tier</p>
                      </div>
                    </div>
                  </div>

                  {player?.clan?.tag && (
                    <button type="button" className="secondary-button" onClick={openClan}>
                      Open clan
                    </button>
                  )}
                </article>
              </section>

              <section className="stats-grid">
                {statCards.map((card) => (
                  <article className="stat-card" key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{card.sub}</p>
                  </article>
                ))}
              </section>

              <section className="details-grid">
                <article className="panel-card">
                  <div className="section-eyebrow">Progress</div>
                  <h3>Player details</h3>

                  <div className="detail-list">
                    <div className="detail-row">
                      <span>Experience level</span>
                      <strong>{player?.expLevel ?? 0}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Best trophies</span>
                      <strong>{player?.bestTrophies ?? 0}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Best builder trophies</span>
                      <strong>{player?.bestBuilderBaseTrophies ?? 0}</strong>
                    </div>
                    <div className="detail-row">
                      <span>War preference</span>
                      <strong>{player?.warPreference || 'Unknown'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Builder base league</span>
                      <strong>{player?.builderBaseLeague?.name || 'Unavailable'}</strong>
                    </div>
                  </div>
                </article>

                <article className="panel-card">
                  <div className="section-eyebrow">Clan status</div>
                  <h3>Current clan</h3>

                  <div className="detail-list">
                    <div className="detail-row">
                      <span>Clan name</span>
                      <strong>{playerClan}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Clan tag</span>
                      <strong>{player?.clan?.tag || '-'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Role</span>
                      <strong>{player?.role || '-'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Town Hall weapon</span>
                      <strong>{player?.townHallWeaponLevel ?? '-'}</strong>
                    </div>
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .player-page {
          min-height: calc(100vh - 72px);
          background: #fafafa;
          padding: 32px 0 56px;
        }

        .player-shell {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .search-card,
        .hero-card,
        .stat-card,
        .panel-card,
        .status-card {
          background: #ffffff;
          border: 1px solid #ece8e2;
          border-radius: 24px;
          box-shadow: 0 18px 40px rgba(15, 15, 15, 0.05);
        }

        .search-card {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          padding: 28px;
          margin-bottom: 24px;
          align-items: end;
        }

        .section-eyebrow {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #e56c27;
        }

        .search-card h1 {
          margin: 10px 0 10px;
          color: #17120f;
          font-size: 34px;
          line-height: 1.08;
        }

        .search-card p {
          margin: 0;
          color: #6f6b66;
          max-width: 640px;
          line-height: 1.7;
        }

        .search-form {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-input {
          width: 320px;
          padding: 14px 16px;
          border: 1px solid #e1d9d0;
          border-radius: 16px;
          background: #fffdfb;
          font-size: 15px;
          outline: none;
        }

        .search-input:focus {
          border-color: #e56c27;
        }

        .search-button,
        .secondary-button {
          border: none;
          border-radius: 16px;
          padding: 14px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .search-button {
          background: #e56c27;
          color: #ffffff;
        }

        .secondary-button {
          background: #faf4ed;
          color: #d16426;
          margin-top: 18px;
        }

        .status-card {
          padding: 22px 24px;
          color: #4a4540;
          font-size: 16px;
        }

        .status-card.error {
          color: #b9432b;
          background: #fff5f2;
          border-color: #f1d4cb;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          margin-top: 24px;
        }

        .hero-card {
          padding: 24px;
        }

        .hero-card.compact {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .player-identity {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 24px;
        }

        .avatar-badge,
        .league-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 82px;
          height: 82px;
          border-radius: 22px;
          background: linear-gradient(135deg, #e56c27, #f0a44b);
          color: #ffffff;
          font-size: 30px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .identity-copy h2,
        .panel-card h3,
        .league-card h3 {
          margin: 8px 0 6px;
          color: #17120f;
        }

        .identity-copy p,
        .league-card p {
          margin: 0;
          color: #7e7770;
        }

        .identity-meta {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }

        .identity-meta div {
          background: #fff8f3;
          border: 1px solid #f2e3d7;
          border-radius: 18px;
          padding: 14px 16px;
        }

        .identity-meta span,
        .stat-card span,
        .detail-row span {
          display: block;
          font-size: 12px;
          color: #8b7c70;
          margin-bottom: 8px;
        }

        .identity-meta strong,
        .detail-row strong {
          color: #17120f;
          font-size: 17px;
        }

        .league-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 18px;
        }

        .league-card {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .league-icon {
          width: 72px;
          height: 72px;
          object-fit: contain;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 24px;
        }

        .stat-card {
          padding: 22px;
        }

        .stat-card strong {
          display: block;
          font-size: 32px;
          color: #17120f;
          line-height: 1;
          margin-bottom: 10px;
        }

        .stat-card p {
          margin: 0;
          color: #726d67;
          font-size: 14px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 24px;
        }

        .panel-card {
          padding: 24px;
        }

        .detail-list {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid #f1ebe4;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        @media (max-width: 1024px) {
          .search-card,
          .hero-grid,
          .details-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .search-form {
            width: 100%;
          }

          .search-input {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .player-page {
            padding: 20px 0 40px;
          }

          .player-shell {
            padding: 0 16px;
          }

          .search-card h1 {
            font-size: 28px;
          }

          .search-form,
          .identity-meta,
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .search-form {
            display: grid;
          }

          .player-identity,
          .league-card,
          .detail-row {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
