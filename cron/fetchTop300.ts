import { getPlayerDataThrottled } from './slippi';
import * as syncFs from 'fs';
import * as path from 'path';

const fs = syncFs.promises;

interface LeaderboardPlayer {
  displayName: string;
  connectCode: {
    code: string;
  };
  rankedNetplayProfile: {
    ratingOrdinal: number;
    ratingUpdateCount: number;
    wins: number;
    losses: number;
    dailyGlobalPlacement: number;
    dailyRegionalPlacement: number;
    continent: string;
    characters: Array<{
      character: number;
      gameCount: number;
    }>;
  };
}

// Since the rankedLeaderboard API requires auth, we'll use a workaround:
// 1. Extract connect codes from the leaderboard page HTML
// 2. Use the existing getUser API (which works without auth) to fetch full data

const extractConnectCodesFromHTML = async (): Promise<string[]> => {
  console.log('Fetching leaderboard page to extract connect codes...');
  
  try {
    const response = await fetch('https://slippi.gg/leaderboards', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const connectCodes: string[] = [];
    
    // Extract connect codes using regex
    // Connect codes appear in the format: PLAYER#123
    // They're typically in the HTML as text or in data attributes
    const codePattern = /\b([A-Z0-9]{1,8}#[0-9]{1,3})\b/g;
    let match;
    const seen = new Set<string>();
    
    while ((match = codePattern.exec(html)) !== null) {
      const code = match[1];
      // Validate it's a real connect code format
      if (code.includes('#') && !seen.has(code)) {
        seen.add(code);
        connectCodes.push(code);
      }
    }

    console.log(`Found ${connectCodes.length} unique connect codes in HTML`);
    return connectCodes;
  } catch (error) {
    console.error('Error fetching HTML:', error);
    return [];
  }
};

// Alternative: Check network requests to find the API endpoint
// The leaderboard page makes GraphQL requests that we can intercept
const tryExtractFromNetworkRequests = async (): Promise<string[]> => {
  console.log('Note: To get top 300, you may need to:');
  console.log('1. Open https://slippi.gg/leaderboards in your browser');
  console.log('2. Open Developer Tools (F12) -> Network tab');
  console.log('3. Filter by "graphql" or "fetch"');
  console.log('4. Look for requests to internal.slippi.gg/graphql');
  console.log('5. Check the request payload to see the query structure');
  console.log('6. The response should contain player data with connect codes\n');
  
  // For now, return empty - user will need to manually inspect or we use HTML scraping
  return [];
};

const fetchTop300Players = async (): Promise<LeaderboardPlayer[]> => {
  const targetCount = 300;
  
  console.log(`\n=== Fetching top ${targetCount} players from Slippi leaderboard ===\n`);
  
  // Step 1: Get connect codes
  console.log('Step 1: Extracting connect codes...');
  let connectCodes = await extractConnectCodesFromHTML();
  
  // If HTML scraping didn't work well, try network approach
  if (connectCodes.length < 50) {
    console.log('\nHTML scraping found fewer codes than expected.');
    await tryExtractFromNetworkRequests();
    
    // For now, we'll work with what we have
    if (connectCodes.length === 0) {
      throw new Error('Could not extract connect codes. The page structure may have changed or requires JavaScript rendering.');
    }
  }

  // Limit to target count
  connectCodes = connectCodes.slice(0, targetCount);
  console.log(`\nUsing ${connectCodes.length} connect codes to fetch player data\n`);

  // Step 2: Fetch player data using existing API
  console.log('Step 2: Fetching player data using getUser API...');
  console.log('This will take approximately 1 second per player due to rate limiting.\n');
  
  const players: LeaderboardPlayer[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < connectCodes.length; i++) {
    const code = connectCodes[i];
    const progress = `[${i + 1}/${connectCodes.length}]`;
    
    try {
      process.stdout.write(`${progress} Fetching ${code}... `);
      const response = await getPlayerDataThrottled(code);
      
      if (response.data?.getUser) {
        players.push(response.data.getUser);
        successCount++;
        console.log(`✓ (${successCount} success, ${errorCount} errors)`);
      } else {
        errorCount++;
        console.log(`✗ No data`);
      }
    } catch (error) {
      errorCount++;
      console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  console.log(`\n✅ Fetched ${successCount} players successfully (${errorCount} errors)`);
  
  // Sort by rating (descending)
  return players.sort((p1, p2) => 
    p2.rankedNetplayProfile.ratingOrdinal - p1.rankedNetplayProfile.ratingOrdinal
  );
};

async function main() {
  try {
    const players = await fetchTop300Players();
    
    if (players.length === 0) {
      console.log('\n❌ Error: No players fetched. Terminating.');
      return;
    }

    // Add rank numbers
    const playersWithRank = players.map((player, index) => ({
      ...player,
      rankedNetplayProfile: {
        ...player.rankedNetplayProfile,
        rank: index + 1,
      },
    }));

    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Save to file
    const outputFile = path.join(dataDir, 'top300-leaderboard.json');
    await fs.writeFile(outputFile, JSON.stringify(playersWithRank, null, 2));
    
    console.log(`\n✅ Successfully saved ${playersWithRank.length} players to:`);
    console.log(`   ${outputFile}\n`);
    console.log('Top 10 players:');
    playersWithRank.slice(0, 10).forEach((player, index) => {
      console.log(
        `  ${index + 1}. ${player.displayName} (${player.connectCode.code}) - ` +
        `ELO: ${Math.floor(player.rankedNetplayProfile.ratingOrdinal)}`
      );
    });
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
