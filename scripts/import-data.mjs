/**
 * Data Import Script for Board Game Leaderboard
 * 
 * This script helps you import your existing Google Sheets data into Supabase.
 * 
 * INSTRUCTIONS:
 * 1. Export your Google Sheet as a CSV file
 * 2. Place the CSV file in the same directory as this script
 * 3. Update the SUPABASE_URL and SUPABASE_KEY below
 * 4. Run: node import-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Use service role key for imports

const CSV_FILE = './game_history.csv';

// ============================================
// Expected CSV columns (adjust to match your sheet):
// Match ID, Date, Game, Player 1, P1 Placement, Player 2, P2 Placement, ...
// ============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map of game names to their metadata (duration, complexity, is_coop, is_team)
// Add your games here with their BGG stats
const GAME_METADATA = {
  'Wingspan': { duration_minutes: 60, complexity: 2.45, is_coop: false, is_team: false },
  'Catan': { duration_minutes: 90, complexity: 2.32, is_coop: false, is_team: false },
  'Pandemic': { duration_minutes: 45, complexity: 2.42, is_coop: true, is_team: false },
  'Ticket to Ride': { duration_minutes: 60, complexity: 1.83, is_coop: false, is_team: false },
  'Codenames': { duration_minutes: 20, complexity: 1.31, is_coop: false, is_team: true },
  'Azul': { duration_minutes: 45, complexity: 1.77, is_coop: false, is_team: false },
  'Splendor': { duration_minutes: 30, complexity: 1.78, is_coop: false, is_team: false },
  'Carcassonne': { duration_minutes: 45, complexity: 1.91, is_coop: false, is_team: false },
  '7 Wonders': { duration_minutes: 30, complexity: 2.33, is_coop: false, is_team: false },
  'Dominion': { duration_minutes: 30, complexity: 2.36, is_coop: false, is_team: false },
  // Add more games as needed...
  'DEFAULT': { duration_minutes: 60, complexity: 2.0, is_coop: false, is_team: false }
};

async function importData() {
  console.log('🎲 Board Game Leaderboard - Data Import Script\n');
  
  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    console.log('\nPlease export your Google Sheet as CSV and place it in this directory.');
    process.exit(1);
  }
  
  // Read and parse CSV
  console.log(`📄 Reading ${CSV_FILE}...`);
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`   Found ${records.length} match records\n`);
  
  // Extract unique players and games
  const players = new Set();
  const games = new Set();
  
  records.forEach(record => {
    // Extract game name
    const gameName = record['Game'] || record['game'];
    if (gameName) games.add(gameName);
    
    // Extract player names (columns like "Player 1", "Player 2", etc.)
    for (let i = 1; i <= 8; i++) {
      const playerCol = record[`Player ${i}`] || record[`player_${i}`] || record[`Player${i}`];
      if (playerCol && playerCol.trim()) {
        players.add(playerCol.trim());
      }
    }
  });
  
  console.log(`👥 Found ${players.size} unique players: ${[...players].join(', ')}`);
  console.log(`🎮 Found ${games.size} unique games: ${[...games].join(', ')}\n`);
  
  // Insert players
  console.log('📥 Importing players...');
  const playerMap = {};
  
  for (const playerName of players) {
    const { data, error } = await supabase
      .from('players')
      .upsert({ name: playerName }, { onConflict: 'name' })
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Failed to insert player ${playerName}:`, error.message);
    } else {
      playerMap[playerName] = data.id;
      console.log(`   ✓ ${playerName}`);
    }
  }
  
  // Insert games
  console.log('\n📥 Importing games...');
  const gameMap = {};
  
  for (const gameName of games) {
    const metadata = GAME_METADATA[gameName] || GAME_METADATA['DEFAULT'];
    
    const { data, error } = await supabase
      .from('games')
      .upsert({
        name: gameName,
        duration_minutes: metadata.duration_minutes,
        complexity: metadata.complexity,
        is_coop: metadata.is_coop,
        is_team: metadata.is_team
      }, { onConflict: 'name' })
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Failed to insert game ${gameName}:`, error.message);
    } else {
      gameMap[gameName] = data.id;
      const coopTag = metadata.is_coop ? ' [CO-OP]' : '';
      const teamTag = metadata.is_team ? ' [TEAM]' : '';
      console.log(`   ✓ ${gameName}${coopTag}${teamTag} (${metadata.duration_minutes}min, complexity: ${metadata.complexity})`);
    }
  }
  
  // Insert matches
  console.log('\n📥 Importing matches...');
  let successCount = 0;
  let errorCount = 0;
  
  for (const record of records) {
    const gameName = record['Game'] || record['game'];
    const dateStr = record['Date'] || record['date'];
    
    if (!gameName || !gameMap[gameName]) {
      console.error(`   ⚠️ Skipping record - unknown game: ${gameName}`);
      errorCount++;
      continue;
    }
    
    // Parse date (handle various formats)
    let datePlayed;
    try {
      // Try parsing as ISO date first
      datePlayed = new Date(dateStr).toISOString().split('T')[0];
    } catch {
      console.error(`   ⚠️ Skipping record - invalid date: ${dateStr}`);
      errorCount++;
      continue;
    }
    
    // Collect player results
    const results = [];
    for (let i = 1; i <= 8; i++) {
      const playerCol = record[`Player ${i}`] || record[`player_${i}`] || record[`Player${i}`];
      const placementCol = record[`P${i} Placement`] || record[`p${i}_placement`] || record[`P${i}Placement`] || record[`Placement ${i}`];
      
      if (playerCol && playerCol.trim() && placementCol) {
        const playerName = playerCol.trim();
        const placement = parseInt(placementCol, 10);
        
        if (playerMap[playerName] && !isNaN(placement)) {
          results.push({
            playerId: playerMap[playerName],
            placement
          });
        }
      }
    }
    
    if (results.length < 2) {
      console.error(`   ⚠️ Skipping record - not enough players for ${gameName} on ${datePlayed}`);
      errorCount++;
      continue;
    }
    
    // Insert match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        game_id: gameMap[gameName],
        date_played: datePlayed
      })
      .select()
      .single();
    
    if (matchError) {
      console.error(`   ❌ Failed to create match for ${gameName}:`, matchError.message);
      errorCount++;
      continue;
    }
    
    // Insert match results
    const matchResults = results.map(r => ({
      match_id: match.id,
      player_id: r.playerId,
      placement: r.placement
    }));
    
    const { error: resultsError } = await supabase
      .from('match_results')
      .insert(matchResults);
    
    if (resultsError) {
      console.error(`   ❌ Failed to add results for ${gameName}:`, resultsError.message);
      errorCount++;
    } else {
      successCount++;
      const playerList = results.map(r => {
        const name = Object.keys(playerMap).find(k => playerMap[k] === r.playerId);
        return `${name}(${r.placement})`;
      }).join(', ');
      console.log(`   ✓ ${datePlayed} - ${gameName}: ${playerList}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Players: ${players.size}`);
  console.log(`   Games: ${games.size}`);
  console.log(`   Matches imported: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount}`);
  }
  console.log('\n✅ Import complete!');
}

// Run the import
importData().catch(console.error);
