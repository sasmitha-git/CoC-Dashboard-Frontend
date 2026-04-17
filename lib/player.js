function pickFirstObject(...values) {
  return values.find((value) => value && typeof value === 'object') || null;
}

function pickFirstArray(...values) {
  return values.find((value) => Array.isArray(value) && value.length > 0) || [];
}

function pickFirstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || '';
}

function pickFirstNumber(...values) {
  return values.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;
}

function normalizeLeague(rawLeague) {
  const league = pickFirstObject(rawLeague);
  if (!league) return null;

  const iconUrls = pickFirstObject(
    league.iconUrls,
    league.icons,
    league.iconUrl,
    league.icon,
    league.badgeUrls
  );

  return {
    id: pickFirstNumber(league.id),
    name: pickFirstString(league.name),
    iconUrls: iconUrls || {},
  };
}

function normalizePlayerFromWrapper(rawPlayer) {
  const wrappedPlayer = pickFirstObject(
    rawPlayer?.data,
    rawPlayer?.player,
    rawPlayer?.result,
    pickFirstArray(rawPlayer?.items, rawPlayer?.content)[0]
  );

  return wrappedPlayer && wrappedPlayer !== rawPlayer ? wrappedPlayer : rawPlayer;
}

export function normalizePlayerResponse(rawPlayer) {
  const player = normalizePlayerFromWrapper(rawPlayer);

  if (!player || typeof player !== 'object') {
    return null;
  }

  const role = pickFirstString(player.role, player.clanRole);
  const league = normalizeLeague(player.league);
  const builderBaseLeague = normalizeLeague(player.builderBaseLeague);
  const leagueTier = normalizeLeague(player.leagueTier);
  const donationsReceived = pickFirstNumber(
    player.donationsReceived,
    player.receivedDonations
  );

  return {
    ...player,
    role,
    league,
    builderBaseLeague,
    leagueTier,
    donationsReceived,
  };
}
