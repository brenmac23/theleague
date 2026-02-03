// ============================================
// BOARD GAME LEADERBOARD - SCORING SYSTEM
// ============================================

/**
 * Scoring Configuration
 * Adjust these values to fine-tune the scoring system
 */
export const SCORING_CONFIG = {
  // Base points by placement (non-linear distribution)
  // Index 0 = 1st place, Index 1 = 2nd place, etc.
  BASE_POINTS: [100, 70, 50, 35, 24, 16, 10, 6],
  
  // Player count multipliers (index = player count - 2)
  // 2 players = 0.6, 3 = 0.75, 4 = 0.9, 5 = 1.0, 6 = 1.1, 7 = 1.15, 8 = 1.2
  PLAYER_COUNT_MULTIPLIERS: {
    2: 0.60,
    3: 0.75,
    4: 0.90,
    5: 1.00,
    6: 1.10,
    7: 1.15,
    8: 1.20
  },
  
  // Time multiplier settings (60 min baseline)
  TIME_BASELINE_MINUTES: 60,
  TIME_MULTIPLIER_MIN: 0.7,
  TIME_MULTIPLIER_MAX: 1.5,
  
  // Complexity multiplier settings (lighter weight than time)
  // Formula: COMPLEXITY_BASE + (complexity * COMPLEXITY_FACTOR)
  COMPLEXITY_BASE: 0.9,
  COMPLEXITY_FACTOR: 0.05,
  COMPLEXITY_MIN: 0.9,
  COMPLEXITY_MAX: 1.15,
  
  // Game type multipliers
  GAME_TYPE_MULTIPLIERS: {
    normal: 1.0,
    team: 0.75,
    coop: 0.25
  },
  
  // Recency decay settings
  RECENCY_FULL_VALUE_DAYS: 365,      // Full value for 1 year
  RECENCY_DECAY_END_DAYS: 365 * 4,   // Reaches floor at 4 years
  RECENCY_FLOOR: 0.25,               // Minimum multiplier
  
  // Participation bonus
  PARTICIPATION_BONUS_PER_GAME: 0.5
};

/**
 * Calculate base points for a placement
 * @param {number} placement - The player's placement (1 = first, 2 = second, etc.)
 * @param {number} playerCount - Total number of players in the match
 * @returns {number} Base points for the placement
 */
export function getBasePlacementPoints(placement, playerCount) {
  // For placements beyond our array, give minimum points
  const maxPlacement = SCORING_CONFIG.BASE_POINTS.length;
  
  if (placement > maxPlacement) {
    return SCORING_CONFIG.BASE_POINTS[maxPlacement - 1];
  }
  
  // Adjust points based on player count to maintain relative value
  // In a 2-player game, 2nd place shouldn't get 70 points
  const adjustedIndex = placement - 1;
  const basePoints = SCORING_CONFIG.BASE_POINTS[adjustedIndex];
  
  // Scale based on how many players could have beaten you
  // In a 5-player game, coming 2nd means you beat 3 people
  // In a 2-player game, coming 2nd means you beat 0 people
  const beatenPlayers = playerCount - placement;
  const maxBeatable = playerCount - 1;
  
  if (maxBeatable === 0) return basePoints; // Edge case: 1 player
  
  const beatRatio = beatenPlayers / maxBeatable;
  
  // Blend between the placement points and adjusted points
  // This ensures 2nd in a 2-player game is worth less than 2nd in a 5-player game
  return basePoints * (0.5 + 0.5 * beatRatio);
}

/**
 * Calculate player count multiplier
 * @param {number} playerCount - Number of players (2-8)
 * @returns {number} Multiplier for player count
 */
export function getPlayerCountMultiplier(playerCount) {
  const count = Math.max(2, Math.min(8, playerCount));
  return SCORING_CONFIG.PLAYER_COUNT_MULTIPLIERS[count] || 1.0;
}

/**
 * Calculate time multiplier based on game duration
 * @param {number} durationMinutes - Game duration in minutes
 * @returns {number} Time multiplier
 */
export function getTimeMultiplier(durationMinutes) {
  const ratio = durationMinutes / SCORING_CONFIG.TIME_BASELINE_MINUTES;
  // Use square root for smoother scaling
  const multiplier = Math.sqrt(ratio);
  
  return Math.max(
    SCORING_CONFIG.TIME_MULTIPLIER_MIN,
    Math.min(SCORING_CONFIG.TIME_MULTIPLIER_MAX, multiplier)
  );
}

/**
 * Calculate complexity multiplier
 * @param {number} complexity - BGG complexity rating (typically 1.0-5.0)
 * @returns {number} Complexity multiplier
 */
export function getComplexityMultiplier(complexity) {
  const multiplier = SCORING_CONFIG.COMPLEXITY_BASE + 
                     (complexity * SCORING_CONFIG.COMPLEXITY_FACTOR);
  
  return Math.max(
    SCORING_CONFIG.COMPLEXITY_MIN,
    Math.min(SCORING_CONFIG.COMPLEXITY_MAX, multiplier)
  );
}

/**
 * Get game type multiplier
 * @param {boolean} isCoop - Is it a cooperative game?
 * @param {boolean} isTeam - Is it a team game?
 * @returns {number} Game type multiplier
 */
export function getGameTypeMultiplier(isCoop, isTeam) {
  if (isCoop) return SCORING_CONFIG.GAME_TYPE_MULTIPLIERS.coop;
  if (isTeam) return SCORING_CONFIG.GAME_TYPE_MULTIPLIERS.team;
  return SCORING_CONFIG.GAME_TYPE_MULTIPLIERS.normal;
}

/**
 * Calculate recency multiplier based on how long ago the game was played
 * @param {Date|string} datePlayed - When the game was played
 * @param {Date} [referenceDate=new Date()] - Reference date for calculation
 * @returns {number} Recency multiplier (1.0 to 0.25)
 */
export function getRecencyMultiplier(datePlayed, referenceDate = new Date()) {
  const playDate = new Date(datePlayed);
  const daysSincePlayed = Math.floor(
    (referenceDate - playDate) / (1000 * 60 * 60 * 24)
  );
  
  // Full value for first year
  if (daysSincePlayed <= SCORING_CONFIG.RECENCY_FULL_VALUE_DAYS) {
    return 1.0;
  }
  
  // After 4 years, floor value
  if (daysSincePlayed >= SCORING_CONFIG.RECENCY_DECAY_END_DAYS) {
    return SCORING_CONFIG.RECENCY_FLOOR;
  }
  
  // Linear decay between 1 year and 4 years
  const decayStartDays = SCORING_CONFIG.RECENCY_FULL_VALUE_DAYS;
  const decayEndDays = SCORING_CONFIG.RECENCY_DECAY_END_DAYS;
  const decayRange = decayEndDays - decayStartDays;
  const daysIntoDecay = daysSincePlayed - decayStartDays;
  
  const decayProgress = daysIntoDecay / decayRange;
  const valueRange = 1.0 - SCORING_CONFIG.RECENCY_FLOOR;
  
  return 1.0 - (decayProgress * valueRange);
}

/**
 * Calculate points for a single match result
 * @param {Object} params - Match parameters
 * @param {number} params.placement - Player's placement (1 = first)
 * @param {number} params.playerCount - Total players in the match
 * @param {number} params.durationMinutes - Game duration
 * @param {number} params.complexity - Game complexity (1.0-5.0)
 * @param {boolean} params.isCoop - Is cooperative game
 * @param {boolean} params.isTeam - Is team game
 * @param {Date|string} params.datePlayed - When played
 * @param {boolean} [params.includeRecency=true] - Whether to apply recency decay
 * @param {Date} [params.referenceDate] - Reference date for recency calculation
 * @returns {Object} Detailed point breakdown
 */
export function calculateMatchPoints({
  placement,
  playerCount,
  durationMinutes,
  complexity,
  isCoop,
  isTeam,
  datePlayed,
  includeRecency = true,
  referenceDate = new Date()
}) {
  const basePoints = getBasePlacementPoints(placement, playerCount);
  const playerCountMult = getPlayerCountMultiplier(playerCount);
  const timeMult = getTimeMultiplier(durationMinutes);
  const complexityMult = getComplexityMultiplier(complexity);
  const gameTypeMult = getGameTypeMultiplier(isCoop, isTeam);
  const recencyMult = includeRecency 
    ? getRecencyMultiplier(datePlayed, referenceDate) 
    : 1.0;
  
  const totalPoints = basePoints * 
                      playerCountMult * 
                      timeMult * 
                      complexityMult * 
                      gameTypeMult * 
                      recencyMult;
  
  return {
    basePoints: Math.round(basePoints * 100) / 100,
    playerCountMultiplier: playerCountMult,
    timeMultiplier: Math.round(timeMult * 100) / 100,
    complexityMultiplier: Math.round(complexityMult * 100) / 100,
    gameTypeMultiplier: gameTypeMult,
    recencyMultiplier: Math.round(recencyMult * 100) / 100,
    totalPoints: Math.round(totalPoints * 100) / 100
  };
}

/**
 * Calculate a player's overall score from all their matches
 * @param {Array} matchResults - Array of match result objects
 * @param {Date} [referenceDate=new Date()] - Reference date for calculations
 * @returns {Object} Player's overall score breakdown
 */
export function calculatePlayerScore(matchResults, referenceDate = new Date()) {
  if (!matchResults || matchResults.length === 0) {
    return {
      averagePoints: 0,
      participationBonus: 0,
      totalScore: 0,
      gamesPlayed: 0,
      totalPointsEarned: 0
    };
  }
  
  let totalPoints = 0;
  
  for (const result of matchResults) {
    const pointsData = calculateMatchPoints({
      placement: result.placement,
      playerCount: result.playerCount,
      durationMinutes: result.durationMinutes,
      complexity: result.complexity,
      isCoop: result.isCoop,
      isTeam: result.isTeam,
      datePlayed: result.datePlayed,
      includeRecency: true,
      referenceDate
    });
    
    totalPoints += pointsData.totalPoints;
  }
  
  const gamesPlayed = matchResults.length;
  const averagePoints = totalPoints / gamesPlayed;
  const participationBonus = gamesPlayed * SCORING_CONFIG.PARTICIPATION_BONUS_PER_GAME;
  const totalScore = averagePoints + participationBonus;
  
  return {
    averagePoints: Math.round(averagePoints * 100) / 100,
    participationBonus: Math.round(participationBonus * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    gamesPlayed,
    totalPointsEarned: Math.round(totalPoints * 100) / 100
  };
}

/**
 * Calculate annual champion standings (no recency decay)
 * @param {Array} matchResults - All match results
 * @param {number} year - The year to calculate for
 * @returns {Object} Annual score breakdown
 */
export function calculateAnnualScore(matchResults, year) {
  // Filter to only matches from the specified year
  const yearResults = matchResults.filter(result => {
    const playDate = new Date(result.datePlayed);
    return playDate.getFullYear() === year;
  });
  
  if (yearResults.length === 0) {
    return {
      averagePoints: 0,
      participationBonus: 0,
      totalScore: 0,
      gamesPlayed: 0,
      totalPointsEarned: 0,
      year
    };
  }
  
  let totalPoints = 0;
  
  for (const result of yearResults) {
    const pointsData = calculateMatchPoints({
      placement: result.placement,
      playerCount: result.playerCount,
      durationMinutes: result.durationMinutes,
      complexity: result.complexity,
      isCoop: result.isCoop,
      isTeam: result.isTeam,
      datePlayed: result.datePlayed,
      includeRecency: false // No recency decay for annual champion
    });
    
    totalPoints += pointsData.totalPoints;
  }
  
  const gamesPlayed = yearResults.length;
  const averagePoints = totalPoints / gamesPlayed;
  const participationBonus = gamesPlayed * SCORING_CONFIG.PARTICIPATION_BONUS_PER_GAME;
  const totalScore = averagePoints + participationBonus;
  
  return {
    averagePoints: Math.round(averagePoints * 100) / 100,
    participationBonus: Math.round(participationBonus * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    gamesPlayed,
    totalPointsEarned: Math.round(totalPoints * 100) / 100,
    year
  };
}

/**
 * Generate a game summary string
 * @param {Object} match - Match data with results
 * @returns {string} Human-readable summary
 */
export function generateMatchSummary(match) {
  const { gameName, results, isCoop } = match;
  
  // Sort results by placement
  const sortedResults = [...results].sort((a, b) => a.placement - b.placement);
  
  if (isCoop) {
    const won = sortedResults[0].placement === 1;
    const playerNames = sortedResults.map(r => r.playerName);
    const nameList = formatNameList(playerNames);
    
    return won 
      ? `${nameList} cooperatively conquered ${gameName}!`
      : `${gameName} proved too challenging for ${nameList}.`;
  }
  
  // Competitive game
  const winners = sortedResults.filter(r => r.placement === 1);
  const others = sortedResults.filter(r => r.placement > 1);
  
  if (winners.length === 1) {
    const winner = winners[0].playerName;
    const otherNames = others.map(r => r.playerName);
    
    if (otherNames.length === 0) {
      return `${winner} played ${gameName}.`;
    } else if (otherNames.length === 1) {
      return `${winner} defeats ${otherNames[0]} in ${gameName}.`;
    } else {
      return `${winner} wins ${gameName} against ${formatNameList(otherNames)}.`;
    }
  } else {
    // Multiple winners (team game or tie)
    const winnerNames = winners.map(r => r.playerName);
    const otherNames = others.map(r => r.playerName);
    
    if (otherNames.length === 0) {
      return `${formatNameList(winnerNames)} tied for first in ${gameName}.`;
    } else {
      return `${formatNameList(winnerNames)} claim victory in ${gameName} over ${formatNameList(otherNames)}.`;
    }
  }
}

/**
 * Format a list of names with proper grammar
 * @param {Array<string>} names - Array of names
 * @returns {string} Formatted name list
 */
function formatNameList(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  
  const allButLast = names.slice(0, -1).join(', ');
  return `${allButLast}, and ${names[names.length - 1]}`;
}

/**
 * Get leaderboard rankings for all players
 * @param {Object} playerMatchData - Object mapping player IDs to their match results
 * @param {Date} [referenceDate=new Date()] - Reference date for calculations
 * @returns {Array} Sorted array of player rankings
 */
export function getLeaderboard(playerMatchData, referenceDate = new Date()) {
  const rankings = [];
  
  for (const [playerId, data] of Object.entries(playerMatchData)) {
    const scoreData = calculatePlayerScore(data.matches, referenceDate);
    
    rankings.push({
      playerId,
      playerName: data.playerName,
      avatarUrl: data.avatarUrl,
      ...scoreData
    });
  }
  
  // Sort by total score descending
  rankings.sort((a, b) => b.totalScore - a.totalScore);
  
  // Add rank positions
  rankings.forEach((player, index) => {
    player.rank = index + 1;
  });
  
  return rankings;
}

/**
 * Get annual leaderboard
 * @param {Object} playerMatchData - Object mapping player IDs to their match results
 * @param {number} year - Year to calculate for
 * @returns {Array} Sorted array of player rankings for that year
 */
export function getAnnualLeaderboard(playerMatchData, year) {
  const rankings = [];
  
  for (const [playerId, data] of Object.entries(playerMatchData)) {
    const scoreData = calculateAnnualScore(data.matches, year);
    
    // Only include players who played that year
    if (scoreData.gamesPlayed > 0) {
      rankings.push({
        playerId,
        playerName: data.playerName,
        avatarUrl: data.avatarUrl,
        ...scoreData
      });
    }
  }
  
  // Sort by total score descending
  rankings.sort((a, b) => b.totalScore - a.totalScore);
  
  // Add rank positions
  rankings.forEach((player, index) => {
    player.rank = index + 1;
  });
  
  return rankings;
}

export default {
  SCORING_CONFIG,
  calculateMatchPoints,
  calculatePlayerScore,
  calculateAnnualScore,
  generateMatchSummary,
  getLeaderboard,
  getAnnualLeaderboard
};
