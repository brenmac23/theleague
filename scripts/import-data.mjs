/**
 * Data Import Script for Board Game Leaderboard
 * 
 * This script helps you import your existing Google Sheets data into Supabase.
 * 
 * INSTRUCTIONS:
 * 1. Export your Google Sheet as a CSV file
 * 2. Place the CSV file in the same directory as this script (named game_history.csv)
 * 3. Update the SUPABASE_URL and SUPABASE_KEY below
 * 4. Add ALL your games to GAME_METADATA (the script will tell you if any are missing)
 * 5. Run: node import-data.mjs
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
// GAME METADATA
// Add ALL your games here with their BGG stats.
// The script will warn you if any games in your CSV are missing.
// 
// To find BGG data:
// 1. Search for your game on boardgamegeek.com
// 2. Duration = "Playing Time" on the game page
// 3. Complexity = "Weight" rating (1-5 scale)
// ============================================

const GAME_METADATA = {
  // Example entries - replace/add your actual games:
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
  'Suburbia': { duration_minutes: 75, complexity: 2.76, is_coop: false, is_team: false },
  
  // ADD YOUR GAMES HERE - copy this format:
  // 'Game Name': { duration_minutes: XX, complexity: X.XX, is_coop: false, is_team: false },
  
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Normalize game names for matching (trim whitespace, consistent case)
function normalizeGameName(name) {
  return name ? name.trim() : '';
}

// Find a game in metadata (case-insensitive matching)
function findGameMetadata(gameName) {
  const normalized = normalizeGameName(gameName).toLowerCase();
  
  // First try exact match
  if (GAME_METADATA[gameName]) {
    return { name: gameName, metadata: GAME_METADATA[gameName] };
  }
  
  // Then try case-insensitive match
  for (const [key, value] of Object.entries(GAME_METADATA)) {
    if (key.toLowerCase() === normalized) {
      return { name: key, metadata: value };
    }
  }
  
  return null;
}

// ============================================
// MAIN IMPORT FUNCTION
// ============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importData() {
  console.log('🎲 Board Game Leaderboard - Data Import Script\n');
  console.log('='.repeat(50));
  
  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    console.log('\nPlease export your Google Sheet as CSV and place it in this directory.');
    process.exit(1);
  }
  
  // Read and parse CSV
  console.log(`\n📄 Reading ${CSV_FILE}...`);
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true
  });
  
  console.log(`   Found ${records.length} match records\n`);
  
  // ============================================
  // STEP 1: Extract unique players and games
  // ============================================
  
  const players = new Set();
  const games = new Set();
  
  records.forEach(record => {
    // Extract game name - try common column names
    const gameName = normalizeGameName(
      record['Game'] || record['game'] || record['Game Name'] || record['game_name'] || ''
    );
    if (gameName) games.add(gameName);
    
    // Extract player names (columns like "Player 1", "Player 2", etc.)
    for (let i = 1; i <= 8; i++) {
      const playerCol = record[`Player ${i}`] || record[`player_${i}`] || record[`Player${i}`] || record[`P${i}`];
      if (playerCol && playerCol.trim()) {
        players.add(playerCol.trim());
      }
    }
  });
  
  console.log(`👥 Found ${players.size} unique players: ${[...players].join(', ')}`);
  console.log(`🎮 Found ${games.size} unique games\n`);
  
  // ============================================
  // STEP 2: Check for missing game metadata
  // ============================================
  
  console.log('📋 Checking game metadata...');
  const missingGames = [];
  const gameNameMapping = {}; // Maps CSV names to canonical names
  
  for (const gameName of games) {
    const found = findGameMetadata(gameName);
    if (found) {
      gameNameMapping[gameName] = found.name;
      console.log(`   ✓ ${gameName}${gameName !== found.name ? ` (matched to "${found.name}")` : ''}`);
    } else {
      missingGames.push(gameName);
      console.log(`   ❌ ${gameName} - NOT FOUND IN METADATA`);
    }
  }
  
  if (missingGames.length > 0) {
    console.log('\n' + '='.repeat(50));
    console.log('⚠️  MISSING GAMES - Please add these to GAME_METADATA');
    console.log('='.repeat(50));
    console.log('\nCopy and paste this into the GAME_METADATA object:\n');
    
    for (const game of missingGames) {
      console.log(`  '${game}': { duration_minutes: 60, complexity: 2.0, is_coop: false, is_team: false },`);
    }
    
    console.log('\nThen update the duration_minutes and complexity values from BoardGameGeek.');
    console.log('Re-run this script after adding the missing games.\n');
    process.exit(1);
  }
  
  console.log('\n   All games found in metadata! ✓\n');
  
  // ============================================
  // STEP 3: Insert players
  // ============================================
  
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
  
  // ============================================
  // STEP 4: Insert games
  // ============================================
  
  console.log('\n📥 Importing games...');
  const gameMap = {};
  
  for (const csvGameName of games) {
    const canonicalName = gameNameMapping[csvGameName];
    const metadata = GAME_METADATA[canonicalName];
    
    const { data, error } = await supabase
      .from('games')
      .upsert({
        name: canonicalName,
        duration_minutes: metadata.duration_minutes,
        complexity: metadata.complexity,
        is_coop: metadata.is_coop,
        is_team: metadata.is_team
      }, { onConflict: 'name' })
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Failed to insert game ${canonicalName}:`, error.message);
    } else {
      // Map both CSV name and canonical name to the game ID
      gameMap[csvGameName] = data.id;
      gameMap[canonicalName] = data.id;
      const coopTag = metadata.is_coop ? ' [CO-OP]' : '';
      const teamTag = metadata.is_team ? ' [TEAM]' : '';
      console.log(`   ✓ ${canonicalName}${coopTag}${teamTag} (${metadata.duration_minutes}min, complexity: ${metadata.complexity})`);
    }
  }
  
  // ============================================
  // STEP 5: Insert matches
  // ============================================
  
  console.log('\n📥 Importing matches...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const recordNum = i + 1;
    
    // Get game name
    const csvGameName = normalizeGameName(
      record['Game'] || record['game'] || record['Game Name'] || record['game_name'] || ''
    );
    
    if (!csvGameName || !gameMap[csvGameName]) {
      console.error(`   ⚠️ Row ${recordNum}: Skipping - unknown game "${csvGameName}"`);
      errorCount++;
      continue;
    }
    
    // Parse date (handle various formats)
    const dateStr = record['Date'] || record['date'] || record['DATE'];
    let datePlayed;
    
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        throw new Error('Invalid date');
      }
      datePlayed = parsed.toISOString().split('T')[0];
    } catch {
      console.error(`   ⚠️ Row ${recordNum}: Skipping - invalid date "${dateStr}"`);
      errorCount++;
      continue;
    }
    
    // Collect player results
    const results = [];
    for (let p = 1; p <= 8; p++) {
      // Try various column name formats
      const playerCol = record[`Player ${p}`] || record[`player_${p}`] || record[`Player${p}`] || record[`P${p}`];
      const placementCol = record[`P${p} Placement`] || record[`p${p}_placement`] || record[`P${p}Placement`] || 
                          record[`Placement ${p}`] || record[`Player ${p} Placement`] || record[`Place${p}`] ||
                          record[`P${p} Place`] || record[`P${p}Place`];
      
      if (playerCol && playerCol.trim() && placementCol) {
        const playerName = playerCol.trim();
        const placement = parseInt(placementCol, 10);
        
        if (playerMap[playerName] && !isNaN(placement) && placement >= 1 && placement <= 8) {
          results.push({
            playerId: playerMap[playerName],
            playerName: playerName,
            placement
          });
        }
      }
    }
    
    if (results.length < 2) {
      console.error(`   ⚠️ Row ${recordNum}: Skipping - found only ${results.length} valid player(s) for ${csvGameName}`);
      errorCount++;
      continue;
    }
    
    // Insert match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        game_id: gameMap[csvGameName],
        date_played: datePlayed
      })
      .select()
      .single();
    
    if (matchError) {
      console.error(`   ❌ Row ${recordNum}: Failed to create match -`, matchError.message);
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
      console.error(`   ❌ Row ${recordNum}: Failed to add results -`, resultsError.message);
      errorCount++;
    } else {
      successCount++;
      const playerList = results
        .sort((a, b) => a.placement - b.placement)
        .map(r => `${r.playerName}(${r.placement})`)
        .join(', ');
      console.log(`   ✓ ${datePlayed} - ${csvGameName}: ${playerList}`);
    }
  }
  
  // ============================================
  // SUMMARY
  // ============================================
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Players imported: ${Object.keys(playerMap).length}`);
  console.log(`   Games imported: ${games.size}`);
  console.log(`   Matches imported: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   Errors/Skipped: ${errorCount}`);
  }
  console.log('\n✅ Import complete!');
}

// Run the import
importData().catch(err => {
  console.error('\n❌ Import failed with error:', err.message);
  process.exit(1);
});
