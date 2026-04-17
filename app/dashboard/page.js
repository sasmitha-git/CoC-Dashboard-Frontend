'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Navbar from '@/components/Navbar';
import { playerApi, clanApi, warApi } from '@/lib/api';
import { normalizePlayerResponse } from '@/lib/player';

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

function getMemberRankIcon(member) {
  return (
    pickLeagueIcon(member?.leagueTier) ||
    pickLeagueIcon(member?.league) ||
    pickLeagueIcon(member?.builderBaseLeague) ||
    ''
  );
}

function getMemberRankLabel(member) {
  return (
    member?.leagueTier?.name ||
    member?.league?.name ||
    member?.builderBaseLeague?.name ||
    'Unranked'
  );
}

function mergeMemberData(clanMembers = [], leaderboardMembers = []) {
  const clanMembersByTag = new Map(
    clanMembers
      .filter((member) => member?.tag)
      .map((member) => [member.tag, member])
  );

  if (!leaderboardMembers.length) {
    return clanMembers;
  }

  return leaderboardMembers.map((member) => ({
    ...(clanMembersByTag.get(member.tag) || {}),
    ...member,
  }));
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [player, setPlayer] = useState(null);
  const [clan, setClan] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [war, setWar] = useState(null);
  const [warNotice, setWarNotice] = useState('');
  const [activePromo, setActivePromo] = useState(0);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const playerTag = Cookies.get('playerTag');
    if (!playerTag) {
      setError('No player tag found. Please register with your player tag.');
      setLoading(false);
      return;
    }

    fetchDashboardData(playerTag);
  }, [router]);

  useEffect(() => {
    const promoTimer = window.setInterval(() => {
      setActivePromo((current) => (current + 1) % 3);
    }, 4200);

    return () => window.clearInterval(promoTimer);
  }, []);

  const fetchDashboardData = async (playerTag) => {
    try {
      const playerRes = await playerApi.getPlayer(playerTag);
      const playerData = normalizePlayerResponse(playerRes.data);
      setPlayer(playerData);

      if (!playerData.clan || !playerData.clan.tag) {
        setError('This player is not in a clan.');
        setLoading(false);
        return;
      }

      const clanTag = playerData.clan.tag;

      const clanRes = await clanApi.getClan(clanTag);
      const clanData = clanRes.data;
      setClan(clanData);

      const leaderboardRes = await clanApi.getLeaderboard(clanTag, 'trophies');
      setLeaderboard(
        mergeMemberData(clanData?.memberList || [], leaderboardRes.data?.leaderboard || [])
      );

      try {
        const warRes = await warApi.getWarSummary(clanTag);
        setWar(warRes.data);
        setWarNotice('');
      } catch (warErr) {
        console.warn('War data unavailable:', warErr.message);
        setWar(null);
        if (warErr?.response?.status === 403 || warErr?.response?.status === 404) {
          setWarNotice(
            'This clan keeps its war log private, so Clash of Clans does not share war details here.'
          );
        } else if (warErr?.code === 'ECONNABORTED') {
          setWarNotice('War details took too long to load. Try again in a moment.');
        } else {
          setWarNotice(
            'War details are unavailable right now. This usually happens when the clan war log is private.'
          );
        }
      }
    } catch (err) {
      if (err?.code === 'ECONNABORTED') {
        console.warn('Dashboard request timed out.');
        setError('Dashboard took too long to load. Please make sure the backend is running and try again.');
      } else {
        console.warn('Dashboard data load failed:', err?.message || 'Unknown error');
        setError('Failed to load dashboard data. Please check your player tag.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="status-page">Loading your dashboard...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="status-page">
          <div className="status-card error">{error}</div>
        </div>
      </>
    );
  }

  const playerName = player?.name || 'Warrior';
  const playerTrophies = player?.trophies ?? 0;
  const playerTownHall = player?.townHallLevel ?? 0;
  const playerDonations = player?.donations ?? 0;
  const playerAttackWins = player?.attackWins ?? 0;
  const playerDefenseWins = player?.defenseWins ?? 0;

  const clanName = clan?.name || 'Unknown Clan';
  const clanLevel = clan?.clanLevel ?? 0;
  const clanMembers = clan?.members ?? 0;
  const clanPoints = clan?.clanPoints ?? 0;
  const clanBadge = clan?.badgeUrls?.medium || clan?.badgeUrls?.small || '';

  const warState =
    war?.state === 'inWar'
      ? 'War in progress'
      : war?.state === 'warEnded'
        ? 'War ended'
        : 'No active war';
  const clanStars = war?.clanStars ?? 0;
  const opponentStars = war?.opponentStars ?? 0;
  const clanDestruction = war?.clanDestruction ?? 0;
  const opponentDestruction = war?.opponentDestruction ?? 0;
  const opponentName = war?.opponentName ?? 'Opponent';
  const starsDiff = Math.abs(clanStars - opponentStars);
  const totalDestruction = clanDestruction + opponentDestruction;
  const warFillPercent = totalDestruction > 0 ? (clanDestruction / totalDestruction) * 100 : 50;

  let warResultText = 'War ongoing';
  if (war?.result === 'win') warResultText = 'You are winning';
  else if (war?.result === 'loss') warResultText = 'You are losing';
  else if (war?.result === 'draw') warResultText = 'Tie';
  else if (!war) warResultText = 'No current war data';

  const promoSlides = [
    {
      eyebrow: 'Base planning',
      title: 'Build day focus',
      description: 'Tidy walls, refill traps, and line up your next upgrade path before war spin.',
      accent: 'gold',
      statLabel: 'Suggested move',
      statValue: 'Upgrade a core defense',
      image: '',
    },
    {
      eyebrow: 'Clan energy',
      title: 'Donation sprint',
      description: 'Keep castles full and help your clan stay ready with a quick troop support push.',
      accent: 'ember',
      statLabel: 'Team goal',
      statValue: 'Fill 10 requests today',
      image: '',
    },
    {
      eyebrow: 'Attack prep',
      title: 'Practice window',
      description: 'Warm up with a few trophy hits and test a cleaner funnel before your next serious attack.',
      accent: 'sky',
      statLabel: 'Best rhythm',
      statValue: '3 focused attacks',
      image: '',
    },
  ];

  return (
    <>
      <Navbar player={player} />

      <div className="dashboard-page">
        <div className="dashboard-shell">
          <section className="promo-section">
            <div className={`promo-banner promo-${promoSlides[activePromo].accent}`}>
              <div
                className={`promo-bg ${promoSlides[activePromo].image ? 'has-image' : ''}`}
                style={
                  promoSlides[activePromo].image
                    ? { backgroundImage: `url(${promoSlides[activePromo].image})` }
                    : undefined
                }
              />
              <div className="promo-copy">
                <div className="promo-eyebrow">{promoSlides[activePromo].eyebrow}</div>
                <h2>{promoSlides[activePromo].title}</h2>
                <p>{promoSlides[activePromo].description}</p>

                <div className="promo-meta">
                  <span>{promoSlides[activePromo].statLabel}</span>
                  <strong>{promoSlides[activePromo].statValue}</strong>
                </div>
              </div>

              <div className="promo-art" aria-hidden="true">
                <div className="promo-ring ring-one" />
                <div className="promo-ring ring-two" />
                <div className="promo-card promo-card-back" />
                <div className="promo-card promo-card-front">
                  <Image
                    src="/night-witch.png"
                    alt=""
                    width={100}
                    height={100}
                    className="promo-logo"
                  />
                </div>
              </div>
            </div>

            <div className="promo-dots" aria-label="Dashboard highlights">
              {promoSlides.map((slide, idx) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`promo-dot ${idx === activePromo ? 'active' : ''}`}
                  onClick={() => setActivePromo(idx)}
                  aria-label={`Show ${slide.title}`}
                />
              ))}
            </div>
          </section>

          <section className="hero-section">
            <div className="hero-copy">
              <div className="eyebrow">Dashboard overview</div>
              <h1>Welcome back, {playerName}</h1>
              <p>
                A cleaner view of your player progress, clan performance, and current war status
                in one place.
              </p>
            </div>

            <div className="hero-card">
              <div className="hero-card-top">
                <div>
                  <div className="hero-label">Current clan</div>
                  <div className="hero-title">{clanName}</div>
                </div>
                {clanBadge ? (
                  <Image
                    src={clanBadge}
                    alt={`${clanName} badge`}
                    className="clan-badge"
                    width={72}
                    height={72}
                    unoptimized
                  />
                ) : (
                  <div className="badge-fallback">{clanName.charAt(0)}</div>
                )}
              </div>

              <div className="hero-stats">
                <div>
                  <span>Clan level</span>
                  <strong>{clanLevel}</strong>
                </div>
                <div>
                  <span>Members</span>
                  <strong>{clanMembers}</strong>
                </div>
                <div>
                  <span>Clan points</span>
                  <strong>{clanPoints}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="quick-stats">
            <article className="stat-panel accent-gold">
              <span className="stat-kicker">Player trophies</span>
              <strong>{playerTrophies}</strong>
              <p>Town Hall {playerTownHall}</p>
            </article>

            <article className="stat-panel accent-orange">
              <span className="stat-kicker">Donations</span>
              <strong>{playerDonations}</strong>
              <p>This season</p>
            </article>

            <article className="stat-panel accent-blue">
              <span className="stat-kicker">Attack wins</span>
              <strong>{playerAttackWins}</strong>
              <p>Regular multiplayer</p>
            </article>

            <article className="stat-panel accent-green">
              <span className="stat-kicker">Defense wins</span>
              <strong>{playerDefenseWins}</strong>
              <p>Current profile</p>
            </article>
          </section>

          <section className="content-grid">
            <article className="section-card">
              <div className="section-head">
                <div>
                  <div className="section-eyebrow">Clan ranking</div>
                  <h2>Top trophy players</h2>
                </div>
                <span className="muted-note">{leaderboard.length} members in {clanName}</span>
              </div>

              <div className="leaderboard-list">
                {leaderboard.map((member, idx) => {
                  const rankIcon = getMemberRankIcon(member);
                  const rankLabel = getMemberRankLabel(member);

                  return (
                    <div className="leader-row" key={member.tag || idx}>
                      <div className="leader-left">
                        <div className={`rank-pill rank-${idx + 1}`}>{idx + 1}</div>
                        <div className="leader-badge-wrap">
                          {rankIcon ? (
                            <Image
                              src={rankIcon}
                              alt={`${member.name || 'Player'} ${rankLabel} badge`}
                              width={42}
                              height={42}
                              className="leader-badge"
                              unoptimized
                            />
                          ) : (
                            <div className="leader-badge-fallback">
                              {(member.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="leader-meta">
                          <div className="leader-name">
                            {member.name}
                            {member.tag === player?.tag ? ' (you)' : ''}
                          </div>
                          <div className="leader-sub">Town Hall {member.townHallLevel ?? '-'}</div>
                          <div className="leader-rank-label">{rankLabel}</div>
                        </div>
                      </div>
                      <div className="leader-score">{member.trophies ?? 0}</div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="section-card">
              <div className="section-head">
                <div>
                  <div className="section-eyebrow">War summary</div>
                  <h2>Current clan war</h2>
                </div>
                <span className={`war-chip ${war ? 'live' : 'idle'}`}>{warState}</span>
              </div>

              {war ? (
                <>
                  <div className="war-scoreboard">
                    <div className="war-team">
                      <div className="war-team-name">{clanName}</div>
                      <div className="war-team-stars">{clanStars} stars</div>
                      <div className="war-team-sub">{clanDestruction}% destruction</div>
                    </div>

                    <div className="war-versus">VS</div>

                    <div className="war-team">
                      <div className="war-team-name">{opponentName}</div>
                      <div className="war-team-stars">{opponentStars} stars</div>
                      <div className="war-team-sub">{opponentDestruction}% destruction</div>
                    </div>
                  </div>

                  <div className="progress-block">
                    <div className="progress-meta">
                      <span>{warResultText}</span>
                      <span>{starsDiff} star difference</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${warFillPercent}%` }} />
                    </div>
                  </div>

                  {war?.endTime && (
                    <div className="war-footer">
                      Ends: {new Date(war.endTime).toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <strong>War details unavailable</strong>
                  <p>{warNotice || 'This clan may have a private war log, so the API cannot return war details.'}</p>
                  <p>Your player and clan stats still load normally.</p>
                </div>
              )}
            </article>
          </section>
        </div>
      </div>

      <style jsx>{`
        .dashboard-page {
          min-height: calc(100vh - 72px);
          background: #fafafa;
          padding: 32px 0 56px;
        }

        .dashboard-shell {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .promo-section {
          margin-bottom: 24px;
        }

        .promo-banner {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 20px;
          height: 320px;
          padding: 28px 30px;
          border-radius: 28px;
          color: #ffffff;
          box-shadow: 0 22px 48px rgba(15, 15, 15, 0.1);
        }

        .promo-bg {
          position: absolute;
          inset: 0;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .promo-bg.has-image {
          opacity: 0.28;
        }

        .promo-gold {
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.18), transparent 34%),
            linear-gradient(135deg, #7f4d18 0%, #bf7b15 44%, #f0ab2f 100%);
        }

        .promo-ember {
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 34%),
            linear-gradient(135deg, #5f2413 0%, #a53c20 48%, #eb6e3d 100%);
        }

        .promo-sky {
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 34%),
            linear-gradient(135deg, #0b4165 0%, #15639c 50%, #35a1d9 100%);
        }

        .promo-copy {
          position: relative;
          z-index: 1;
          max-width: 560px;
          min-height: 164px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .promo-eyebrow {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 248, 235, 0.84);
        }

        .promo-copy h2 {
          margin: 10px 0 10px;
          font-size: 34px;
          line-height: 1.05;
        }

        .promo-copy p {
          margin: 0;
          max-width: 500px;
          color: rgba(255, 248, 235, 0.92);
          font-size: 15px;
          line-height: 1.65;
          min-height: 50px;
        }

        .promo-meta {
          display: inline-flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 18px;
          padding: 12px 16px;
          border-radius: 18px;
          background: rgba(22, 20, 18, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
        }

        .promo-meta span {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 246, 238, 0.72);
        }

        .promo-meta strong {
          font-size: 16px;
          color: #ffffff;
        }

        .promo-art {
          position: relative;
          min-height: 164px;
          height: 164px;
        }

        .promo-ring,
        .promo-card {
          position: absolute;
          border-radius: 24px;
        }

        .promo-ring {
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.05);
        }

        .ring-one {
          width: 180px;
          height: 180px;
          right: 34px;
          top: -6px;
        }

        .ring-two {
          width: 118px;
          height: 118px;
          right: 150px;
          bottom: -10px;
        }

        .promo-card-back {
          width: 150px;
          height: 110px;
          right: 78px;
          top: 18px;
          background: rgba(255, 255, 255, 0.11);
          transform: rotate(-12deg);
        }

        .promo-card-front {
          width: 170px;
          height: 126px;
          right: 112px;
          top: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 250, 244, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(10px);
          transform: rotate(8deg);
        }

        .promo-logo {
          width: 92px;
          height: 92px;
          object-fit: contain;
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.22));
        }

        .promo-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
        }

        .promo-dot {
          width: 10px;
          height: 10px;
          border: none;
          border-radius: 999px;
          background: #d9cec2;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .promo-dot.active {
          background: #e56c27;
          transform: scale(1.2);
        }

        .hero-section {
          display: grid;
          grid-template-columns: 1.25fr 0.95fr;
          gap: 28px;
          align-items: stretch;
          margin-bottom: 24px;
        }

        .hero-copy {
          padding: 8px 0;
        }

        .eyebrow,
        .section-eyebrow,
        .hero-label,
        .stat-kicker {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .eyebrow,
        .section-eyebrow,
        .hero-label {
          color: #e56c27;
        }

        .hero-copy h1 {
          font-size: 42px;
          line-height: 1.1;
          color: #111111;
          margin: 10px 0 14px;
        }

        .hero-copy p {
          max-width: 640px;
          color: #666666;
          font-size: 16px;
          line-height: 1.7;
          margin: 0;
        }

        .hero-card,
        .section-card,
        .stat-panel {
          background: #ffffff;
          border: 1px solid #ece8e2;
          border-radius: 24px;
          box-shadow: 0 18px 40px rgba(15, 15, 15, 0.05);
        }

        .hero-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hero-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .hero-title {
          font-size: 28px;
          line-height: 1.15;
          font-weight: 700;
          color: #121212;
          margin-top: 6px;
        }

        .clan-badge,
        .badge-fallback {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          flex-shrink: 0;
        }

        .clan-badge {
          object-fit: cover;
          border: 1px solid #f0e5d8;
          background: #fff8f3;
        }

        .badge-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff4ec;
          color: #e56c27;
          font-size: 28px;
          font-weight: 700;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .hero-stats div {
          background: #fff8f3;
          border: 1px solid #f5e4d6;
          border-radius: 18px;
          padding: 14px 16px;
        }

        .hero-stats span {
          display: block;
          font-size: 12px;
          color: #7a7a7a;
          margin-bottom: 8px;
        }

        .hero-stats strong {
          font-size: 24px;
          color: #111111;
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-panel {
          padding: 22px;
        }

        .stat-kicker {
          display: block;
          margin-bottom: 16px;
          color: #777777;
        }

        .stat-panel strong {
          display: block;
          font-size: 34px;
          line-height: 1;
          color: #111111;
          margin-bottom: 10px;
        }

        .stat-panel p {
          margin: 0;
          color: #6c6c6c;
          font-size: 14px;
        }

        .accent-gold {
          border-top: 4px solid #d9a404;
        }

        .accent-orange {
          border-top: 4px solid #e56c27;
        }

        .accent-blue {
          border-top: 4px solid #3f78e0;
        }

        .accent-green {
          border-top: 4px solid #2fa36b;
        }

        .search-section h2,
        .section-head h2 {
          font-size: 24px;
          color: #141414;
          margin: 6px 0 0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 24px;
        }

        .section-card {
          padding: 24px;
        }

        .section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .muted-note {
          color: #808080;
          font-size: 13px;
          padding-top: 8px;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 388px;
          overflow-y: auto;
          padding-right: 6px;
          scrollbar-width: thin;
          scrollbar-color: #d8c6b8 #f7f1eb;
        }

        .leaderboard-list::-webkit-scrollbar {
          width: 8px;
        }

        .leaderboard-list::-webkit-scrollbar-track {
          background: #f7f1eb;
          border-radius: 999px;
        }

        .leaderboard-list::-webkit-scrollbar-thumb {
          background: #d8c6b8;
          border-radius: 999px;
        }

        .leader-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border: 1px solid #f0ece6;
          border-radius: 18px;
          background: #fcfbf9;
        }

        .leader-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .rank-pill {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .rank-1 {
          background: #fff4d6;
          color: #b17b00;
        }

        .rank-2 {
          background: #f0f2f5;
          color: #5e6977;
        }

        .rank-3 {
          background: #f7e6dd;
          color: #9b5d3d;
        }

        .rank-4,
        .rank-5 {
          background: #fff0e7;
          color: #d16426;
        }

        .rank-pill:not(.rank-1):not(.rank-2):not(.rank-3):not(.rank-4):not(.rank-5) {
          background: #f3eee8;
          color: #7e6657;
        }

        .leader-meta {
          min-width: 0;
        }

        .leader-badge,
        .leader-badge-fallback {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
        }

        .leader-badge {
          object-fit: contain;
        }

        .leader-badge-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #e56c27, #f0a44b);
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
        }

        .leader-name {
          font-size: 15px;
          font-weight: 600;
          color: #171717;
          line-height: 1.3;
        }

        .leader-sub {
          font-size: 12px;
          color: #7c7c7c;
          margin-top: 2px;
        }

        .leader-rank-label {
          font-size: 12px;
          color: #a17758;
          margin-top: 4px;
        }

        .leader-score {
          font-size: 17px;
          font-weight: 700;
          color: #121212;
          flex-shrink: 0;
        }

        .war-chip {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .war-chip.live {
          background: #eaf8ef;
          color: #2d8a57;
        }

        .war-chip.idle {
          background: #f3f3f3;
          color: #666666;
        }

        .war-scoreboard {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          padding: 18px;
          border: 1px solid #f0ece6;
          border-radius: 20px;
          background: #fcfbf9;
        }

        .war-team {
          text-align: center;
        }

        .war-team-name {
          font-size: 13px;
          color: #737373;
          margin-bottom: 8px;
        }

        .war-team-stars {
          font-size: 30px;
          line-height: 1;
          font-weight: 700;
          color: #131313;
        }

        .war-team-sub {
          margin-top: 8px;
          font-size: 13px;
          color: #777777;
        }

        .war-versus {
          font-size: 16px;
          font-weight: 700;
          color: #c2c2c2;
        }

        .progress-block {
          margin-top: 18px;
        }

        .progress-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: #666666;
          margin-bottom: 10px;
        }

        .progress-track {
          height: 10px;
          border-radius: 999px;
          background: #f0efed;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #e56c27, #ff8e4d);
        }

        .war-footer {
          margin-top: 14px;
          color: #777777;
          font-size: 13px;
        }

        .empty-state {
          padding: 22px;
          border-radius: 18px;
          background: #fcfbf9;
          border: 1px dashed #e6ddd2;
          color: #666666;
          line-height: 1.7;
        }

        .empty-state strong {
          display: block;
          color: #17120f;
          font-size: 16px;
          margin-bottom: 8px;
        }

        .empty-state p {
          margin: 0;
        }

        .empty-state p + p {
          margin-top: 10px;
        }

        .status-page {
          min-height: calc(100vh - 72px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          padding: 32px 20px;
          color: #333333;
          font-size: 18px;
        }

        .status-card {
          background: #ffffff;
          border: 1px solid #ece8e2;
          border-radius: 20px;
          padding: 20px 24px;
          box-shadow: 0 18px 40px rgba(15, 15, 15, 0.05);
        }

        .status-card.error {
          color: #b9432b;
          background: #fff5f2;
          border-color: #f1d4cb;
        }

        @media (max-width: 1024px) {
          .promo-banner,
          .hero-section,
          .content-grid {
            grid-template-columns: 1fr;
          }

          .quick-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .hero-copy h1 {
            font-size: 36px;
          }
        }

        @media (max-width: 768px) {
          .dashboard-page {
            padding: 20px 0 40px;
          }

          .dashboard-shell {
            padding: 0 16px;
          }

          .promo-banner {
            height: 240px;
            padding: 22px 20px;
          }

          .promo-copy h2 {
            font-size: 28px;
          }

          .promo-art {
            min-height: 110px;
            height: 110px;
          }

          .ring-one {
            width: 136px;
            height: 136px;
            right: 12px;
            top: 0;
          }

          .ring-two {
            width: 90px;
            height: 90px;
            right: 90px;
            bottom: 0;
          }

          .promo-card-back {
            width: 122px;
            height: 90px;
            right: 40px;
            top: 16px;
          }

          .promo-card-front {
            width: 136px;
            height: 100px;
            right: 58px;
            top: 24px;
          }

          .promo-logo {
            width: 76px;
            height: 76px;
          }

          .hero-copy h1 {
            font-size: 30px;
          }

          .hero-stats,
          .quick-stats {
            grid-template-columns: 1fr;
          }

          .progress-meta,
          .section-head {
            flex-direction: column;
          }

          .war-scoreboard {
            grid-template-columns: 1fr;
          }

          .war-versus {
            padding: 4px 0;
          }
        }
      `}</style>
    </>
  );
}
