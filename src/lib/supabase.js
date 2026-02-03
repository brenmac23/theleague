import { createClient } from '@supabase/supabase-js';

// These will be replaced with your actual Supabase credentials
// In production, use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

/**
 * Fetch all players
 */
export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

/**
 * Fetch a single player by ID
 */
export async function getPlayer(playerId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a new player
 */
export async function createPlayer(name, avatarUrl = null) {
  const { data, error } = await supabase
    .from('players')
    .insert({ name, avatar_url: avatarUrl })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update player avatar
 */
export async function updatePlayerAvatar(playerId, avatarUrl) {
  const { data, error } = await supabase
    .from('players')
    .update({ avatar_url: avatarUrl })
    .eq('id', playerId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Fetch all games
 */
export async function getGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

/**
 * Fetch a single game by ID
 */
export async function getGame(gameId) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a new game
 */
export async function createGame({ name, imageUrl, durationMinutes, complexity, isCoop, isTeam }) {
  const { data, error } = await supabase
    .from('games')
    .insert({
      name,
      image_url: imageUrl,
      duration_minutes: durationMinutes,
      complexity,
      is_coop: isCoop,
      is_team: isTeam
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Fetch all matches with full details
 */
export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      games (*),
      match_results (
        *,
        players (*)
      )
    `)
    .order('date_played', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Fetch recent matches (for homepage)
 */
export async function getRecentMatches(limit = 5) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      games (*),
      match_results (
        *,
        players (*)
      )
    `)
    .order('date_played', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

/**
 * Fetch matches for a specific player
 */
export async function getPlayerMatches(playerId) {
  const { data, error } = await supabase
    .from('match_results')
    .select(`
      *,
      matches (
        *,
        games (*),
        match_results (
          *,
          players (*)
        )
      )
    `)
    .eq('player_id', playerId)
    .order('matches(date_played)', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Fetch matches for a specific game
 */
export async function getGameMatches(gameId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      games (*),
      match_results (
        *,
        players (*)
      )
    `)
    .eq('game_id', gameId)
    .order('date_played', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Create a new match with results
 */
export async function createMatch({ gameId, datePlayed, results, notes = null }) {
  // Start a transaction by creating the match first
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      game_id: gameId,
      date_played: datePlayed,
      notes
    })
    .select()
    .single();
  
  if (matchError) throw matchError;
  
  // Then create all the match results
  const matchResults = results.map(r => ({
    match_id: match.id,
    player_id: r.playerId,
    placement: r.placement
  }));
  
  const { error: resultsError } = await supabase
    .from('match_results')
    .insert(matchResults);
  
  if (resultsError) {
    // If results fail, we should ideally delete the match
    // but for simplicity, we'll just throw the error
    throw resultsError;
  }
  
  return match;
}

/**
 * Fetch player badges
 */
export async function getPlayerBadges(playerId) {
  const { data, error } = await supabase
    .from('badges')
    .select(`
      *,
      games (name)
    `)
    .eq('player_id', playerId)
    .order('earned_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Create a badge
 */
export async function createBadge({ playerId, badgeType, badgeYear, gameId, description }) {
  const { data, error } = await supabase
    .from('badges')
    .insert({
      player_id: playerId,
      badge_type: badgeType,
      badge_year: badgeYear,
      game_id: gameId,
      description
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatar(playerId, file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${playerId}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);
  
  // Update player record with avatar URL
  await updatePlayerAvatar(playerId, publicUrl);
  
  return publicUrl;
}

/**
 * Upload game image to Supabase Storage
 */
export async function uploadGameImage(gameId, file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${gameId}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('game-images')
    .upload(fileName, file, { upsert: true });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('game-images')
    .getPublicUrl(fileName);
  
  return publicUrl;
}

/**
 * Transform match data for scoring calculations
 */
export function transformMatchForScoring(match, playerResults) {
  return {
    matchId: match.id,
    datePlayed: match.date_played,
    gameName: match.games.name,
    durationMinutes: match.games.duration_minutes,
    complexity: parseFloat(match.games.complexity),
    isCoop: match.games.is_coop,
    isTeam: match.games.is_team,
    playerCount: match.match_results.length,
    placement: playerResults.placement,
    results: match.match_results.map(r => ({
      playerId: r.player_id,
      playerName: r.players.name,
      placement: r.placement
    }))
  };
}

export default supabase;
