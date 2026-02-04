import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Users, Gamepad2, Calendar, TrendingUp, Plus, Star, Medal, Crown, Target, Award, ChevronRight, Clock, Brain, History, X, Check, Filter, Search, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Placeholder while loading

const SCORING_CONFIG = {
  PLACEMENT_EXPONENT: 1.25,  // Higher = more reward for winning
  BASELINE_PLAYERS: 4,       // 4-player game is the baseline
  PARTICIPATION_MULTIPLIER: 1  // sqrt(games) × this value
};

function calculateMatchPoints({ placement, playerCount, durationMinutes, complexity, isCoop, isTeam, datePlayed, includeRecency = true, referenceDate = null }) {
  // New formula: (proportion of field beaten)^1.25 * (players/4) * 100
  const proportionBeaten = (playerCount - placement + 1) / playerCount;
  const basePoints = Math.pow(proportionBeaten, SCORING_CONFIG.PLACEMENT_EXPONENT) * (playerCount / SCORING_CONFIG.BASELINE_PLAYERS) * 100;
  
  const timeMult = durationMinutes / 60;
  const complexityMult = Math.max(0.9, Math.min(1.15, 0.9 + complexity * 0.05));
  const gameTypeMult = isCoop ? 0.25 : isTeam ? 0.75 : 1.0;
  
  let recencyMult = 1.0;
  if (includeRecency) {
    const refDate = referenceDate || new Date();
    const daysSince = Math.floor((refDate - new Date(datePlayed)) / (1000 * 60 * 60 * 24));
    if (daysSince > 365 * 4) recencyMult = 0.25;
    else if (daysSince > 365) {
      const decayProgress = (daysSince - 365) / (365 * 3);
      recencyMult = 1.0 - decayProgress * 0.75;
    }
  }
  
  return basePoints * timeMult * complexityMult * gameTypeMult * recencyMult;
}

function generateMatchSummary(match) {
  const { games, match_results } = match;
  const sorted = [...match_results].sort((a, b) => a.placement - b.placement);
  const winners = sorted.filter(r => r.placement === 1);
  const others = sorted.filter(r => r.placement > 1);
  
  if (games.is_coop) {
    const won = winners.length > 0;
    const names = sorted.map(r => r.players.name);
    const nameList = names.length > 2 ? `${names.slice(0, -1).join(', ')}, and ${names.slice(-1)}` : names.join(' and ');
    return won ? `${nameList} conquered ${games.name}!` : `${games.name} defeated ${nameList}.`;
  }
  
  const winnerNames = winners.map(r => r.players.name);
  const otherNames = others.map(r => r.players.name);
  const winnerList = winnerNames.length > 1 ? winnerNames.join(' & ') : winnerNames[0];
  
  if (otherNames.length === 0) return `${winnerList} played ${games.name}.`;
  if (otherNames.length === 1) return `${winnerList} defeats ${otherNames[0]} in ${games.name}.`;
  const otherList = otherNames.length > 2 ? `${otherNames.slice(0, -1).join(', ')}, and ${otherNames.slice(-1)}` : otherNames.join(' and ');
  return `${winnerList} wins ${games.name} against ${otherList}.`;
}

// Light theme colors
const COLORS = {
  gold: '#B8860B',
  silver: '#6B7280',
  bronze: '#B45309',
  accent: '#4F46E5',
  accentLight: '#EEF2FF',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardHover: '#F1F5F9',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
  success: '#059669',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#DC2626',
  errorLight: '#FEF2F2'
};

function Avatar({ name, url, size = 40 }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const colors = ['#4F46E5', '#7C3AED', '#DB2777', '#D97706', '#059669', '#0891B2'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  
  if (url) {
    return (
      <img 
        src={url} 
        alt={name} 
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
      />
    );
  }
  
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: colors[colorIndex], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function RankBadge({ rank }) {
  const colors = { 1: COLORS.gold, 2: COLORS.silver, 3: COLORS.bronze };
  const bgColors = { 1: '#FEF3C7', 2: '#F3F4F6', 3: '#FED7AA' };
  const icons = { 1: Crown, 2: Medal, 3: Award };
  const Icon = icons[rank] || null;
  
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: bgColors[rank] || COLORS.cardHover, border: `2px solid ${colors[rank] || COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: colors[rank] || COLORS.textMuted, flexShrink: 0 }}>
      {Icon ? <Icon size={18} /> : rank}
    </div>
  );
}

function Card({ children, style = {}, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: hovered && onClick ? COLORS.cardHover : COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 20, cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', disabled, style = {} }) {
  const variants = {
    primary: { bg: COLORS.accent, color: 'white', border: 'none' },
    secondary: { bg: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}` },
    ghost: { bg: 'transparent', color: COLORS.textMuted, border: 'none' }
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ backgroundColor: variants[variant].bg, color: variants[variant].color, border: variants[variant].border, borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s ease', ...style }}>
      {children}
    </button>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ backgroundColor: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: `1px solid ${COLORS.border}` }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function Leaderboard({ players, matches, onPlayerClick }) {
  const rankings = useMemo(() => {
    const playerScores = {};
    players.forEach(p => { playerScores[p.id] = { player: p, totalPoints: 0, games: 0 }; });
    
    matches.forEach(match => {
      const playerCount = match.match_results.length;
      match.match_results.forEach(result => {
        if (playerScores[result.player_id]) {
          const points = calculateMatchPoints({ placement: result.placement, playerCount, durationMinutes: match.games.duration_minutes, complexity: parseFloat(match.games.complexity), isCoop: match.games.is_coop, isTeam: match.games.is_team, datePlayed: match.date_played, includeRecency: true });
          playerScores[result.player_id].totalPoints += points;
          playerScores[result.player_id].games++;
        }
      });
    });
    
    // Calculate raw scores first
    const rawScores = Object.values(playerScores)
      .filter(ps => ps.games > 0)
      .map(ps => {
        const avgPoints = ps.totalPoints / ps.games;
        const participationBonus = Math.sqrt(ps.games) * SCORING_CONFIG.PARTICIPATION_MULTIPLIER;
        return { ...ps.player, avgPoints, participationBonus, rawScore: avgPoints + participationBonus, gamesPlayed: ps.games };
      });
    
    // Calculate league average
    const totalRawScore = rawScores.reduce((sum, p) => sum + p.rawScore, 0);
    const leagueAverage = rawScores.length > 0 ? totalRawScore / rawScores.length : 1;
    
    // Scale to 100 = average (like wRC+)
    return rawScores
      .map(p => ({ ...p, scaledScore: Math.round((p.rawScore / leagueAverage) * 100) }))
      .sort((a, b) => b.scaledScore - a.scaledScore);
  }, [players, matches]);
  
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={22} color={COLORS.gold} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Current Standings</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rankings.map((player, idx) => (
          <div key={player.id} onClick={() => onPlayerClick && onPlayerClick(player)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, backgroundColor: COLORS.bg, borderRadius: 10, cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.cardHover} onMouseLeave={e => e.currentTarget.style.backgroundColor = COLORS.bg}>
            <RankBadge rank={idx + 1} />
            <Avatar name={player.name} url={player.avatar_url} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: COLORS.text }}>{player.name}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 13 }}>{player.gamesPlayed} games played</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 22, color: player.scaledScore >= 100 ? COLORS.success : COLORS.accent }}>{player.scaledScore}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentGames({ matches }) {
  const recent = matches.slice(0, 5);
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <History size={22} color={COLORS.accent} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Recent Games</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recent.map(match => (
          <div key={match.id} style={{ padding: 14, backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Calendar size={14} color={COLORS.textMuted} />
              <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{new Date(match.date_played).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, padding: '2px 8px', backgroundColor: COLORS.accentLight, color: COLORS.accent, borderRadius: 4, fontWeight: 500 }}>{match.games.name}</span>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: COLORS.text }}>{generateMatchSummary(match)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RatingHistoryChart({ players, matches }) {
  const chartData = useMemo(() => {
    if (matches.length === 0) return [];
    
    const sortedMatches = [...matches].sort((a, b) => new Date(a.date_played) - new Date(b.date_played));
    
    // Get all unique months from the data
    const months = [...new Set(sortedMatches.map(m => m.date_played.substring(0, 7)))].sort();
    
    // For each month, calculate what the standings would have been at that point
    return months.map(monthKey => {
      // Reference date is end of this month
      const [year, month] = monthKey.split('-').map(Number);
      const referenceDate = new Date(year, month, 0); // Last day of month
      
      // Get all matches up to and including this month
      const matchesToDate = sortedMatches.filter(m => m.date_played.substring(0, 7) <= monthKey);
      
      // Skip if fewer than 10 matches (let ratings stabilize)
      if (matchesToDate.length < 10) return null;
      
      // Calculate scores for each player as of this date
      const playerScores = {};
      players.forEach(p => { playerScores[p.id] = { totalPoints: 0, games: 0 }; });
      
      matchesToDate.forEach(match => {
        const playerCount = match.match_results.length;
        match.match_results.forEach(result => {
          if (playerScores[result.player_id]) {
            // Calculate points with recency relative to this historical date
            const points = calculateMatchPoints({
              placement: result.placement,
              playerCount,
              durationMinutes: match.games.duration_minutes,
              complexity: parseFloat(match.games.complexity),
              isCoop: match.games.is_coop,
              isTeam: match.games.is_team,
              datePlayed: match.date_played,
              includeRecency: true,
              referenceDate
            });
            playerScores[result.player_id].totalPoints += points;
            playerScores[result.player_id].games++;
          }
        });
      });
      
      // Calculate raw scores
      const rawScores = Object.entries(playerScores)
        .filter(([_, data]) => data.games > 0)
        .map(([id, data]) => {
          const avgPoints = data.totalPoints / data.games;
          const participationBonus = Math.sqrt(data.games) * SCORING_CONFIG.PARTICIPATION_MULTIPLIER;
          return { id, rawScore: avgPoints + participationBonus };
        });
      
      // Calculate league average and scale to 100
      const totalRawScore = rawScores.reduce((sum, p) => sum + p.rawScore, 0);
      const leagueAverage = rawScores.length > 0 ? totalRawScore / rawScores.length : 1;
      
      const entry = { month: monthKey };
      players.forEach(p => {
        const playerData = rawScores.find(r => r.id === p.id);
        entry[p.name] = playerData ? Math.round((playerData.rawScore / leagueAverage) * 100) : null;
      });
      
      return entry;
    }).filter(Boolean);
  }, [players, matches]);
  
  const playerColors = ['#4F46E5', '#DB2777', '#059669', '#D97706', '#0891B2'];
  
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={22} color={COLORS.success} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Rating History</h2>
      </div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="month" stroke={COLORS.textMuted} fontSize={11} />
            <YAxis stroke={COLORS.textMuted} fontSize={11} domain={[80, 120]} />
            <Tooltip contentStyle={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
            <Legend />
            {players.map((player, idx) => (
              <Line key={player.id} type="monotone" dataKey={player.name} stroke={playerColors[idx % playerColors.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PlayerProfile({ player, matches, games, onClose }) {
  const playerMatches = matches.filter(m => m.match_results.some(r => r.player_id === player.id));
  
  const stats = useMemo(() => {
    let wins = 0, totalPlacement = 0;
    const gamePerformance = {};
    
    playerMatches.forEach(match => {
      const result = match.match_results.find(r => r.player_id === player.id);
      if (result.placement === 1) wins++;
      totalPlacement += result.placement;
      const gameName = match.games.name;
      if (!gamePerformance[gameName]) gamePerformance[gameName] = { games: 0, wins: 0, totalPlacement: 0, losses: 0 };
      gamePerformance[gameName].games++;
      if (result.placement === 1) gamePerformance[gameName].wins++;
      else gamePerformance[gameName].losses++;
      gamePerformance[gameName].totalPlacement += result.placement;
    });
    
    const gameStats = Object.entries(gamePerformance).map(([name, data]) => ({
      name,
      games: data.games,
      wins: data.wins,
      losses: data.losses,
      avgPlacement: data.totalPlacement / data.games,
      winRate: (data.wins / data.games) * 100
    })).sort((a, b) => b.games - a.games);
    
    return {
      totalGames: playerMatches.length,
      wins,
      winRate: playerMatches.length > 0 ? (wins / playerMatches.length) * 100 : 0,
      avgPlacement: playerMatches.length > 0 ? totalPlacement / playerMatches.length : 0,
      gameStats,
      bestGames: [...gameStats].filter(g => g.games >= 2).sort((a, b) => b.winRate - a.winRate).slice(0, 3),
      worstGames: [...gameStats].filter(g => g.games >= 2).sort((a, b) => a.winRate - b.winRate).slice(0, 3)
    };
  }, [playerMatches, player.id]);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Avatar name={player.name} url={player.avatar_url} size={80} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: COLORS.text }}>{player.name}</h2>
          <p style={{ margin: '4px 0 0', color: COLORS.textMuted }}>{stats.totalGames} games played · {stats.wins} wins</p>
        </div>
        <div style={{ backgroundColor: COLORS.accentLight, padding: 12, borderRadius: 10, textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.accent }}>{stats.winRate.toFixed(0)}%</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>Win Rate</div>
        </div>
      </div>
      
      {/* Game Records Summary */}
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gamepad2 size={18} color={COLORS.accent} />
          Game Records
        </h3>
        <div style={{ backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 70px', padding: '10px 12px', backgroundColor: COLORS.cardHover, fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase' }}>
            <span>Game</span>
            <span style={{ textAlign: 'center' }}>Played</span>
            <span style={{ textAlign: 'center' }}>Wins</span>
            <span style={{ textAlign: 'center' }}>Losses</span>
            <span style={{ textAlign: 'center' }}>Win %</span>
          </div>
          {stats.gameStats.map((game, idx) => (
            <div key={game.name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 70px', padding: '12px', borderTop: idx > 0 ? `1px solid ${COLORS.border}` : 'none', fontSize: 14 }}>
              <span style={{ fontWeight: 500, color: COLORS.text }}>{game.name}</span>
              <span style={{ textAlign: 'center', color: COLORS.textMuted }}>{game.games}</span>
              <span style={{ textAlign: 'center', color: COLORS.success, fontWeight: 600 }}>{game.wins}</span>
              <span style={{ textAlign: 'center', color: COLORS.error }}>{game.losses}</span>
              <span style={{ textAlign: 'center', fontWeight: 600, color: game.winRate >= 50 ? COLORS.success : COLORS.textMuted }}>{game.winRate.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      
      {stats.bestGames.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: COLORS.success, display: 'flex', alignItems: 'center', gap: 8 }}><Star size={16} />Best Games</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.bestGames.map(game => (
              <div key={game.name} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, backgroundColor: COLORS.successLight, borderRadius: 8, border: `1px solid #A7F3D0` }}>
                <span style={{ fontWeight: 500, color: COLORS.text }}>{game.name}</span>
                <span style={{ color: COLORS.success, fontWeight: 600 }}>{game.winRate.toFixed(0)}% wins ({game.games} played)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {stats.worstGames.length > 0 && stats.worstGames[0].winRate < 50 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: COLORS.warning, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={16} />Needs Practice</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.worstGames.filter(g => g.winRate < 50).map(game => (
              <div key={game.name} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, backgroundColor: COLORS.warningLight, borderRadius: 8, border: `1px solid #FDE68A` }}>
                <span style={{ fontWeight: 500, color: COLORS.text }}>{game.name}</span>
                <span style={{ color: COLORS.warning, fontWeight: 600 }}>{game.winRate.toFixed(0)}% wins ({game.games} played)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnnualChampions({ players, matches, onYearClick }) {
  const currentYear = new Date().getFullYear();
  
  const years = useMemo(() => {
    const yearSet = new Set(matches.map(m => new Date(m.date_played).getFullYear()));
    // Exclude current year - champion only crowned after year ends
    return [...yearSet].filter(y => y < currentYear).sort((a, b) => b - a);
  }, [matches, currentYear]);
  
  const champions = useMemo(() => {
    return years.map(year => {
      const yearMatches = matches.filter(m => new Date(m.date_played).getFullYear() === year);
      const playerScores = {};
      players.forEach(p => { playerScores[p.id] = { player: p, totalPoints: 0, games: 0 }; });
      
      yearMatches.forEach(match => {
        match.match_results.forEach(result => {
          if (playerScores[result.player_id]) {
            const points = calculateMatchPoints({ placement: result.placement, playerCount: match.match_results.length, durationMinutes: match.games.duration_minutes, complexity: parseFloat(match.games.complexity), isCoop: match.games.is_coop, isTeam: match.games.is_team, datePlayed: match.date_played, includeRecency: false });
            playerScores[result.player_id].totalPoints += points;
            playerScores[result.player_id].games++;
          }
        });
      });
      
      const rawScores = Object.values(playerScores).filter(ps => ps.games > 0).map(ps => {
        const avgPoints = ps.totalPoints / ps.games;
        const participationBonus = Math.sqrt(ps.games) * SCORING_CONFIG.PARTICIPATION_MULTIPLIER;
        return { ...ps.player, avgPoints, participationBonus, rawScore: avgPoints + participationBonus, gamesPlayed: ps.games };
      });
      
      const totalRawScore = rawScores.reduce((sum, p) => sum + p.rawScore, 0);
      const leagueAverage = rawScores.length > 0 ? totalRawScore / rawScores.length : 1;
      
      const rankings = rawScores
        .map(p => ({ ...p, scaledScore: Math.round((p.rawScore / leagueAverage) * 100) }))
        .sort((a, b) => b.scaledScore - a.scaledScore);
      
      return { year, champion: rankings[0], runnerUp: rankings[1], rankings, matchCount: yearMatches.length };
    });
  }, [years, players, matches]);
  
  if (champions.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Crown size={22} color={COLORS.gold} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>Annual Champions</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {champions.map(({ year, champion, runnerUp, rankings, matchCount }) => champion && (
          <div key={year} onClick={() => onYearClick && onYearClick({ year, rankings, matchCount })} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}`, cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.cardHover} onMouseLeave={e => e.currentTarget.style.backgroundColor = COLORS.bg}>
            <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.gold, width: 50 }}>{year}</div>
            <Avatar name={champion.name} url={champion.avatar_url} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: COLORS.text }}>{champion.name}</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>{champion.gamesPlayed} games · Score: {champion.scaledScore}</div>
            </div>
            {runnerUp && <div style={{ textAlign: 'right', color: COLORS.textMuted, fontSize: 13 }}>Runner-up: {runnerUp.name}</div>}
            <ChevronRight size={18} color={COLORS.textMuted} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function YearDetailModal({ yearData, onClose }) {
  if (!yearData) return null;
  
  const { year, rankings, matchCount } = yearData;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.gold }}>{year}</div>
        <div style={{ color: COLORS.textMuted }}>{matchCount} games played</div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rankings.map((player, idx) => (
          <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: idx === 0 ? '#FFFBEB' : COLORS.bg, borderRadius: 8, border: idx === 0 ? `2px solid ${COLORS.gold}` : `1px solid ${COLORS.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: idx < 3 ? [{c: COLORS.gold}, {c: COLORS.silver}, {c: COLORS.bronze}][idx].c : COLORS.border, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>
              {idx + 1}
            </div>
            <Avatar name={player.name} url={player.avatar_url} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: COLORS.text }}>{player.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{player.gamesPlayed} games</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: player.scaledScore >= 100 ? COLORS.success : COLORS.accent }}>{player.scaledScore}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPage({ matches, games, players }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      if (gameFilter !== 'all' && match.game_id !== gameFilter) return false;
      if (playerFilter !== 'all' && !match.match_results.some(r => r.player_id === playerFilter)) return false;
      if (dateFrom && match.date_played < dateFrom) return false;
      if (dateTo && match.date_played > dateTo) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = match.games.name.toLowerCase().includes(term) ||
          match.match_results.some(r => r.players.name.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [matches, gameFilter, playerFilter, dateFrom, dateTo, searchTerm]);
  
  const inputStyle = { padding: '8px 12px', backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14 };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Filter size={20} color={COLORS.accent} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.text }}>Filters</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: COLORS.textMuted }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} color={COLORS.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Game or player..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: 34 }} />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: COLORS.textMuted }}>Game</label>
            <select value={gameFilter} onChange={e => setGameFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="all">All Games</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: COLORS.textMuted }}>Player</label>
            <select value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="all">All Players</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: COLORS.textMuted }}>From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: COLORS.textMuted }}>To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
        </div>
        
        <div style={{ marginTop: 12, fontSize: 13, color: COLORS.textMuted }}>
          Showing {filteredMatches.length} of {matches.length} games
        </div>
      </Card>
      
      <Card style={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 2fr 120px', padding: '14px 20px', backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`, fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase' }}>
          <span>Date</span>
          <span>Game</span>
          <span>Result</span>
          <span style={{ textAlign: 'right' }}>Players</span>
        </div>
        
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          {filteredMatches.map((match, idx) => {
            const winner = match.match_results.find(r => r.placement === 1);
            const sorted = [...match.match_results].sort((a, b) => a.placement - b.placement);
            
            return (
              <div key={match.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 2fr 120px', padding: '14px 20px', borderBottom: idx < filteredMatches.length - 1 ? `1px solid ${COLORS.border}` : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>
                  {new Date(match.date_played).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
                <div>
                  <span style={{ fontWeight: 500, color: COLORS.text }}>{match.games.name}</span>
                  {match.games.is_coop && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', backgroundColor: COLORS.successLight, color: COLORS.success, borderRadius: 4 }}>Co-op</span>}
                  {match.games.is_team && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', backgroundColor: COLORS.warningLight, color: COLORS.warning, borderRadius: 4 }}>Team</span>}
                </div>
                <div style={{ fontSize: 14, color: COLORS.text }}>
                  {sorted.map((r, i) => (
                    <span key={r.player_id}>
                      <span style={{ color: r.placement === 1 ? COLORS.gold : COLORS.textMuted, fontWeight: r.placement === 1 ? 600 : 400 }}>
                        {r.placement === 1 ? '🏆 ' : ''}{r.players.name}
                      </span>
                      {i < sorted.length - 1 && <span style={{ color: COLORS.border }}> → </span>}
                    </span>
                  ))}
                </div>
                <span style={{ textAlign: 'right', fontSize: 13, color: COLORS.textMuted }}>{match.match_results.length} players</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function GamesPage({ games, matches }) {
  const gameStats = useMemo(() => {
    return games.map(game => {
      const gameMatches = matches.filter(m => m.game_id === game.id);
      const playerWins = {};
      gameMatches.forEach(match => {
        match.match_results.forEach(result => {
          if (result.placement === 1) {
            const name = result.players.name;
            playerWins[name] = (playerWins[name] || 0) + 1;
          }
        });
      });
      const sortedWinners = Object.entries(playerWins).sort((a, b) => b[1] - a[1]).slice(0, 3);
      
      // Calculate game weight (impact on scores)
      const timeMult = game.duration_minutes / 60;
      const complexityMult = Math.max(0.9, Math.min(1.15, 0.9 + parseFloat(game.complexity) * 0.05));
      const typeMult = game.is_coop ? 0.25 : game.is_team ? 0.75 : 1.0;
      const gameWeight = timeMult * complexityMult * typeMult;
      
      return { ...game, timesPlayed: gameMatches.length, lastPlayed: gameMatches[0]?.date_played, topPlayers: sortedWinners, gameWeight };
    }).sort((a, b) => b.timesPlayed - a.timesPlayed);
  }, [games, matches]);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {gameStats.map(game => (
        <Card key={game.id}>
          <div style={{ display: 'flex', gap: 16 }}>
            {game.image_url ? (
              <img src={game.image_url} alt={game.name} style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 70, height: 70, backgroundColor: COLORS.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
                <Gamepad2 size={28} color={COLORS.textMuted} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: COLORS.text }}>{game.name}</h3>
                {game.is_coop && <span style={{ fontSize: 11, padding: '2px 8px', backgroundColor: COLORS.successLight, color: COLORS.success, borderRadius: 4, fontWeight: 500 }}>Co-op</span>}
                {game.is_team && <span style={{ fontSize: 11, padding: '2px 8px', backgroundColor: COLORS.warningLight, color: COLORS.warning, borderRadius: 4, fontWeight: 500 }}>Team</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, color: COLORS.textMuted, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} />{game.duration_minutes} min</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Brain size={14} />Complexity: {game.complexity}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: game.gameWeight >= 1 ? COLORS.success : COLORS.warning, fontWeight: 500 }}>
                  <TrendingUp size={14} />Weight: {game.gameWeight.toFixed(2)}×
                </span>
              </div>
              <div style={{ fontSize: 14 }}>
                <span style={{ color: COLORS.accent, fontWeight: 500 }}>Played {game.timesPlayed} {game.timesPlayed === 1 ? 'time' : 'times'}</span>
                {game.topPlayers.length > 0 && (
                  <span style={{ marginLeft: 16, color: COLORS.textMuted }}>
                    Top: {game.topPlayers.map(([name, wins]) => `${name} (${wins} ${wins === 1 ? 'win' : 'wins'})`).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AddResultForm({ games, players, onSubmit, onClose }) {
  const [gameId, setGameId] = useState('');
  const [datePlayed, setDatePlayed] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [placements, setPlacements] = useState({});
  
  const selectedGame = games.find(g => g.id === gameId);
  
  const handlePlayerToggle = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
      setPlacements(prev => { const next = { ...prev }; delete next[playerId]; return next; });
    } else if (selectedPlayers.length < 8) {
      setSelectedPlayers(prev => [...prev, playerId]);
      setPlacements(prev => ({ ...prev, [playerId]: 1 }));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!gameId || selectedPlayers.length < 2) return;
    onSubmit({ gameId, datePlayed, results: selectedPlayers.map(playerId => ({ playerId, placement: placements[playerId] })) });
  };
  
  const inputStyle = { width: '100%', padding: '10px 12px', backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14 };
  
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Game</label>
        <select value={gameId} onChange={e => setGameId(e.target.value)} style={inputStyle} required>
          <option value="">Select a game...</option>
          {games.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}
        </select>
        {selectedGame && <div style={{ marginTop: 8, fontSize: 13, color: COLORS.textMuted }}>{selectedGame.duration_minutes} min · Complexity: {selectedGame.complexity}{selectedGame.is_coop && ' · Co-op'}{selectedGame.is_team && ' · Team'}</div>}
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Date Played</label>
        <input type="date" value={datePlayed} onChange={e => setDatePlayed(e.target.value)} style={inputStyle} required />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Players ({selectedPlayers.length}/8)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {players.map(player => (
            <button key={player.id} type="button" onClick={() => handlePlayerToggle(player.id)}
              style={{ padding: '8px 16px', backgroundColor: selectedPlayers.includes(player.id) ? COLORS.accent : COLORS.bg, border: `1px solid ${selectedPlayers.includes(player.id) ? COLORS.accent : COLORS.border}`, borderRadius: 20, color: selectedPlayers.includes(player.id) ? 'white' : COLORS.text, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              {player.name}
            </button>
          ))}
        </div>
      </div>
      {selectedPlayers.length > 0 && (
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Placements</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedPlayers.map(playerId => {
              const player = players.find(p => p.id === playerId);
              return (
                <div key={playerId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 80, color: COLORS.text }}>{player.name}</span>
                  <select value={placements[playerId]} onChange={e => setPlacements(prev => ({ ...prev, [playerId]: parseInt(e.target.value) }))} style={{ ...inputStyle, width: 'auto' }}>
                    {[...Array(selectedPlayers.length)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!gameId || selectedPlayers.length < 2}><Check size={16} /> Save Result</Button>
      </div>
    </form>
  );
}

function AddGameForm({ onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(60);
  const [complexity, setComplexity] = useState(2.0);
  const [isCoop, setIsCoop] = useState(false);
  const [isTeam, setIsTeam] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), duration_minutes: duration, complexity, is_coop: isCoop, is_team: isTeam });
  };
  
  const inputStyle = { width: '100%', padding: '10px 12px', backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14 };
  
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Game Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} required placeholder="e.g. Wingspan" />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Duration (minutes)</label>
          <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} style={inputStyle} min={5} max={480} />
          <div style={{ marginTop: 4, fontSize: 12, color: COLORS.textMuted }}>From BGG average playtime</div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Complexity (1-5)</label>
          <input type="number" value={complexity} onChange={e => setComplexity(parseFloat(e.target.value) || 2.0)} style={inputStyle} min={1} max={5} step={0.01} />
          <div style={{ marginTop: 4, fontSize: 12, color: COLORS.textMuted }}>From BGG weight rating</div>
        </div>
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: COLORS.text }}>Game Type</label>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', backgroundColor: isCoop ? COLORS.successLight : COLORS.bg, border: `1px solid ${isCoop ? COLORS.success : COLORS.border}`, borderRadius: 8 }}>
            <input type="checkbox" checked={isCoop} onChange={e => { setIsCoop(e.target.checked); if (e.target.checked) setIsTeam(false); }} style={{ accentColor: COLORS.success }} />
            <span style={{ color: COLORS.text }}>Cooperative (0.25× points)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', backgroundColor: isTeam ? COLORS.warningLight : COLORS.bg, border: `1px solid ${isTeam ? COLORS.warning : COLORS.border}`, borderRadius: 8 }}>
            <input type="checkbox" checked={isTeam} onChange={e => { setIsTeam(e.target.checked); if (e.target.checked) setIsCoop(false); }} style={{ accentColor: COLORS.warning }} />
            <span style={{ color: COLORS.text }}>Team Game (0.75× points)</span>
          </label>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!name.trim()}><Check size={16} /> Add Game</Button>
      </div>
    </form>
  );
}

export default function App() {
  const [view, setView] = useState('home');
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showAddResult, setShowAddResult] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all data from Supabase on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .order('name');
        if (playersError) throw playersError;
        
        // Fetch games
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .order('name');
        if (gamesError) throw gamesError;
        
        // Fetch matches with related data
        const { data: matchesData, error: matchesError } = await supabase
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
        if (matchesError) throw matchesError;
        
        setPlayers(playersData || []);
        setGames(gamesData || []);
        setMatches(matchesData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  const handleAddResult = async (data) => {
    try {
      // Insert match
      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({
          game_id: data.gameId,
          date_played: data.datePlayed
        })
        .select()
        .single();
      
      if (matchError) throw matchError;
      
      // Insert match results
      const matchResults = data.results.map(r => ({
        match_id: newMatch.id,
        player_id: r.playerId,
        placement: r.placement
      }));
      
      const { error: resultsError } = await supabase
        .from('match_results')
        .insert(matchResults);
      
      if (resultsError) throw resultsError;
      
      // Refetch matches to get the complete data with joins
      const { data: updatedMatches } = await supabase
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
      
      setMatches(updatedMatches || []);
      setShowAddResult(false);
    } catch (err) {
      console.error('Error adding result:', err);
      alert('Failed to add result: ' + err.message);
    }
  };
  
  const handleAddGame = async (data) => {
    try {
      const { data: newGame, error } = await supabase
        .from('games')
        .insert({
          name: data.name,
          duration_minutes: data.duration_minutes,
          complexity: data.complexity,
          is_coop: data.is_coop,
          is_team: data.is_team
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setGames(prev => [...prev, newGame].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddGame(false);
    } catch (err) {
      console.error('Error adding game:', err);
      alert('Failed to add game: ' + err.message);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} color={COLORS.accent} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: 16, color: COLORS.textMuted, fontSize: 16 }}>Loading leaderboard...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ color: COLORS.error, fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: COLORS.text, marginBottom: 8 }}>Failed to load data</h2>
          <p style={{ color: COLORS.textMuted, marginBottom: 16 }}>{error}</p>
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Check that your Supabase URL and API key are correct in your .env file.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <header style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '12px 24px', position: 'sticky', top: 0, backgroundColor: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(8px)', zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={22} color={COLORS.gold} />
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>The League Leaderboard</h1>
          </div>
          
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[
              { id: 'home', label: 'Home', icon: Trophy },
              { id: 'history', label: 'History', icon: History },
              { id: 'players', label: 'Players', icon: Users },
              { id: 'games', label: 'Games', icon: Gamepad2 }
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setView(id)} style={{ padding: '8px 14px', backgroundColor: view === id ? COLORS.accent : 'transparent', border: 'none', borderRadius: 8, color: view === id ? 'white' : COLORS.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, transition: 'all 0.2s' }}>
                <Icon size={16} />{label}
              </button>
            ))}
          </nav>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setShowAddGame(true)}><Plus size={16} /> Add Game</Button>
            <Button onClick={() => setShowAddResult(true)}><Plus size={16} /> Add Result</Button>
          </div>
        </div>
      </header>
      
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {view === 'home' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Leaderboard players={players} matches={matches} onPlayerClick={setSelectedPlayer} />
              <AnnualChampions players={players} matches={matches} onYearClick={setSelectedYear} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <RecentGames matches={matches} />
              <RatingHistoryChart players={players} matches={matches} />
            </div>
          </div>
        )}
        
        {view === 'history' && <HistoryPage matches={matches} games={games} players={players} />}
        
        {view === 'players' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {players.map(player => (
              <Card key={player.id} onClick={() => setSelectedPlayer(player)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Avatar name={player.name} url={player.avatar_url} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: COLORS.text }}>{player.name}</h3>
                    <p style={{ margin: '4px 0 0', color: COLORS.textMuted, fontSize: 14 }}>{matches.filter(m => m.match_results.some(r => r.player_id === player.id)).length} games</p>
                  </div>
                  <ChevronRight size={20} color={COLORS.textMuted} />
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {view === 'games' && <GamesPage games={games} matches={matches} />}
      </main>
      
      <Modal isOpen={showAddResult} onClose={() => setShowAddResult(false)} title="Add Game Result">
        <AddResultForm games={games} players={players} onSubmit={handleAddResult} onClose={() => setShowAddResult(false)} />
      </Modal>
      
      <Modal isOpen={showAddGame} onClose={() => setShowAddGame(false)} title="Add New Game">
        <AddGameForm onSubmit={handleAddGame} onClose={() => setShowAddGame(false)} />
      </Modal>
      
      <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title="Player Profile">
        {selectedPlayer && <PlayerProfile player={selectedPlayer} matches={matches} games={games} onClose={() => setSelectedPlayer(null)} />}
      </Modal>
      
      <Modal isOpen={!!selectedYear} onClose={() => setSelectedYear(null)} title={`${selectedYear?.year} Season`}>
        {selectedYear && <YearDetailModal yearData={selectedYear} onClose={() => setSelectedYear(null)} />}
      </Modal>
    </div>
  );
}
