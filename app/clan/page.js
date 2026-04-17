'use client';

import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import Navbar from '@/components/Navbar';
import { clanApi } from '@/lib/api';

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

function getRoleWeight(role) {
  if (role === 'leader') return 4;
  if (role === 'coLeader') return 3;
  if (role === 'admin') return 2;
  return 1;
}

function sortMembers(members, sortBy) {
  const nextMembers = [...members];

  nextMembers.sort((first, second) => {
    if (sortBy === 'name') {
      return (first.name || '').localeCompare(second.name || '');
    }

    if (sortBy === 'townHall') {
      return (second.townHallLevel ?? 0) - (first.townHallLevel ?? 0);
    }

    if (sortBy === 'donations') {
      return (second.donations ?? 0) - (first.donations ?? 0);
    }

    if (sortBy === 'role') {
      return getRoleWeight(second.role) - getRoleWeight(first.role);
    }

    return (second.trophies ?? 0) - (first.trophies ?? 0);
  });

  return nextMembers;
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
    league: member?.league ?? clanMembersByTag.get(member.tag)?.league ?? null,
    leagueTier: member?.leagueTier ?? clanMembersByTag.get(member.tag)?.leagueTier ?? null,
    builderBaseLeague:
      member?.builderBaseLeague ?? clanMembersByTag.get(member.tag)?.builderBaseLeague ?? null,
  }));
}

function ClanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTag = searchParams.get('tag') || '';

  const [searchTag, setSearchTag] = useState(queryTag);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clan, setClan] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState('trophies');

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
      setClan(null);
      setLeaderboard([]);
      setError('');
      setLoading(false);
      return;
    }

    let ignore = false;

    const loadClan = async () => {
      setLoading(true);
      setError('');

      try {
        const clanResponse = await clanApi.getClan(queryTag);
        const leaderboardResponse = await clanApi.getLeaderboard(queryTag, 'trophies');
        const clanData = clanResponse.data;
        const mergedMembers = mergeMemberData(
          clanData?.memberList || [],
          leaderboardResponse.data?.leaderboard || []
        );

        if (!ignore) {
          setClan(clanData);
          setLeaderboard(mergedMembers);
        }
      } catch (err) {
        if (ignore) return;

        setClan(null);
        setLeaderboard([]);

        if (err?.code === 'ECONNABORTED') {
          setError('Clan lookup took too long. Please make sure the backend is running and try again.');
        } else if (err?.response?.status === 404) {
          setError('No clan was found for that tag. Check the tag and try again.');
        } else {
          setError('Unable to load clan details right now.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadClan();

    return () => {
      ignore = true;
    };
  }, [queryTag, router]);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextTag = sanitizeTag(searchTag);
    if (!nextTag) return;
    router.push(`/clan?tag=${encodeURIComponent(nextTag)}`);
  };

  const sortedLeaderboard = sortMembers(leaderboard, sortBy);
  const badgeUrl = clan?.badgeUrls?.large || clan?.badgeUrls?.medium || clan?.badgeUrls?.small || '';

  return (
    <>
      <Navbar />

      <div className="clan-page">
        <div className="clan-shell">
          <section className="search-card">
            <div>
              <div className="section-eyebrow">Clan search</div>
              <h1>Open the full clan leaderboard</h1>
              <p>Search any clan tag to view member rankings, clan stats, and alternate sorting options.</p>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                className="search-input"
                value={searchTag}
                onChange={(event) => setSearchTag(event.target.value)}
                placeholder="Enter clan tag e.g. #2YY..."
              />
              <button type="submit" className="search-button">
                Search
              </button>
            </form>
          </section>

          {loading ? (
            <div className="status-card">Loading clan details...</div>
          ) : error ? (
            <div className="status-card error">{error}</div>
          ) : !clan ? (
            <div className="status-card">Search for a clan tag to get started.</div>
          ) : (
            <>
              <section className="hero-grid">
                <article className="hero-card">
                  <div className="hero-top">
                    <div className="clan-badge-wrap">
                      {badgeUrl ? (
                        <Image
                          src={badgeUrl}
                          alt={`${clan.name} badge`}
                          width={90}
                          height={90}
                          className="clan-badge"
                          unoptimized
                        />
                      ) : (
                        <div className="clan-badge-fallback">{clan.name?.charAt(0) || 'C'}</div>
                      )}
                    </div>

                    <div>
                      <div className="section-eyebrow">Clan overview</div>
                      <h2>{clan.name}</h2>
                      <p>{clan.tag}</p>
                    </div>
                  </div>

                  <div className="hero-stats">
                    <div>
                      <span>Level</span>
                      <strong>{clan.clanLevel ?? 0}</strong>
                    </div>
                    <div>
                      <span>Members</span>
                      <strong>{clan.members ?? leaderboard.length}</strong>
                    </div>
                    <div>
                      <span>Points</span>
                      <strong>{clan.clanPoints ?? 0}</strong>
                    </div>
                    <div>
                      <span>War wins</span>
                      <strong>{clan.warWins ?? 0}</strong>
                    </div>
                  </div>
                </article>

                <article className="hero-card compact">
                  <div className="section-eyebrow">Clan details</div>
                  <div className="detail-list">
                    <div className="detail-row">
                      <span>Location</span>
                      <strong>{clan.location?.name || 'Global'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>War frequency</span>
                      <strong>{clan.warFrequency || 'Unknown'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Required trophies</span>
                      <strong>{clan.requiredTrophies ?? 0}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Description</span>
                      <strong>{clan.description || 'No clan description provided.'}</strong>
                    </div>
                  </div>
                </article>
              </section>

              <section className="leaderboard-card">
                <div className="leaderboard-head">
                  <div>
                    <div className="section-eyebrow">Leaderboard</div>
                    <h3>Full member standings</h3>
                  </div>

                  <div className="sort-wrap">
                    <label htmlFor="sortBy">Sort by</label>
                    <select
                      id="sortBy"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="sort-select"
                    >
                      <option value="trophies">Trophies</option>
                      <option value="donations">Donations</option>
                      <option value="townHall">Town Hall</option>
                      <option value="role">Role</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                </div>

                <div className="leaderboard-list">
                  {sortedLeaderboard.map((member, index) => {
                    const rankIcon = getMemberRankIcon(member);
                    const rankLabel = getMemberRankLabel(member);

                    return (
                      <div className="leader-row" key={member.tag || index}>
                        <div className="leader-left">
                          <div className="rank-pill">{index + 1}</div>
                          <div className="member-badge-wrap">
                            {rankIcon ? (
                              <Image
                                src={rankIcon}
                                alt={`${member.name || 'Player'} ${rankLabel} badge`}
                                width={52}
                                height={52}
                                className="member-badge"
                                unoptimized
                              />
                            ) : (
                              <div className="member-badge-fallback">
                                {(member.name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="member-copy">
                            <strong>{member.name}</strong>
                            <span>{member.tag}</span>
                            <span>{rankLabel}</span>
                          </div>
                        </div>

                        <div className="leader-metrics">
                          <div>
                            <span>TH</span>
                            <strong>{member.townHallLevel ?? '-'}</strong>
                          </div>
                          <div>
                            <span>Trophies</span>
                            <strong>{member.trophies ?? 0}</strong>
                          </div>
                          <div>
                            <span>Donations</span>
                            <strong>{member.donations ?? 0}</strong>
                          </div>
                          <div>
                            <span>Role</span>
                            <strong>{member.role || 'member'}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .clan-page {
          min-height: calc(100vh - 72px);
          background: #fafafa;
          padding: 32px 0 56px;
        }

        .clan-shell {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .search-card,
        .hero-card,
        .leaderboard-card,
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

        .search-card h1,
        .hero-card h2,
        .leaderboard-head h3 {
          margin: 10px 0 10px;
          color: #17120f;
        }

        .search-card p,
        .hero-card p {
          margin: 0;
          color: #6f6b66;
          line-height: 1.7;
        }

        .search-form {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-input,
        .sort-select {
          border: 1px solid #e1d9d0;
          border-radius: 16px;
          background: #fffdfb;
          outline: none;
        }

        .search-input {
          width: 320px;
          padding: 14px 16px;
          font-size: 15px;
        }

        .search-input:focus,
        .sort-select:focus {
          border-color: #e56c27;
        }

        .search-button {
          border: none;
          border-radius: 16px;
          padding: 14px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          background: #e56c27;
          color: #ffffff;
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
          grid-template-columns: 1.15fr 0.85fr;
          gap: 24px;
          margin-top: 24px;
        }

        .hero-card {
          padding: 24px;
        }

        .hero-card.compact {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .hero-top {
          display: flex;
          gap: 18px;
          align-items: center;
          margin-bottom: 22px;
        }

        .clan-badge,
        .clan-badge-fallback {
          width: 90px;
          height: 90px;
          border-radius: 24px;
        }

        .clan-badge {
          object-fit: cover;
          border: 1px solid #f0e5d8;
          background: #fff8f3;
        }

        .clan-badge-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e56c27, #f0a44b);
          color: #ffffff;
          font-size: 34px;
          font-weight: 700;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .hero-stats div,
        .leader-metrics div {
          background: #fff8f3;
          border: 1px solid #f2e3d7;
          border-radius: 18px;
          padding: 14px 16px;
        }

        .hero-stats span,
        .detail-row span,
        .leader-metrics span,
        .member-copy span,
        .sort-wrap label {
          display: block;
          font-size: 12px;
          color: #8b7c70;
          margin-bottom: 8px;
        }

        .hero-stats strong,
        .detail-row strong,
        .leader-metrics strong {
          color: #17120f;
        }

        .detail-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .detail-row {
          padding: 14px 0;
          border-bottom: 1px solid #f1ebe4;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .leaderboard-card {
          margin-top: 24px;
          padding: 24px;
        }

        .leaderboard-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .sort-wrap {
          min-width: 180px;
        }

        .sort-select {
          width: 100%;
          padding: 12px 14px;
          font-size: 14px;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leader-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px 18px;
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
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: #f3eee8;
          color: #7e6657;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .member-copy strong {
          display: block;
          color: #17120f;
          margin-bottom: 4px;
        }

        .member-badge,
        .member-badge-fallback {
          width: 52px;
          height: 52px;
          flex-shrink: 0;
        }

        .member-badge {
          object-fit: contain;
        }

        .member-badge-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: linear-gradient(135deg, #e56c27, #f0a44b);
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
        }

        .member-copy span {
          margin-bottom: 0;
          font-size: 13px;
        }

        .leader-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(90px, 1fr));
          gap: 10px;
        }

        @media (max-width: 1024px) {
          .search-card,
          .hero-grid,
          .leader-row {
            grid-template-columns: 1fr;
          }

          .hero-stats,
          .leader-metrics {
            grid-template-columns: repeat(2, 1fr);
          }

          .search-form {
            width: 100%;
          }

          .search-input {
            width: 100%;
          }

          .leader-row {
            display: grid;
          }
        }

        @media (max-width: 768px) {
          .clan-page {
            padding: 20px 0 40px;
          }

          .clan-shell {
            padding: 0 16px;
          }

          .search-card h1 {
            font-size: 28px;
          }

          .search-form,
          .hero-top,
          .leaderboard-head,
          .leader-left,
          .leader-metrics {
            display: grid;
            grid-template-columns: 1fr;
          }

          .hero-stats,
          .leader-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export default function ClanPage() {
  return (
    <Suspense fallback={<Navbar />}>
      <ClanPageContent />
    </Suspense>
  );
}
