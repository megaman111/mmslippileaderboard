import { getPlayerDataThrottled } from './slippi'
// import { GoogleSpreadsheet } from 'google-spreadsheet';
// import creds from '../secrets/creds.json';
import * as syncFs from 'fs';
import * as path from 'path';
import util from 'util';
import * as settings from '../settings'

import { exec } from 'child_process';
const fs = syncFs.promises;
const execPromise = util.promisify(exec);

const getPlayerConnectCodes = async (): Promise<string[]> => {
  // Manual connect codes - replace these with actual Slippi connect codes
  // Format: "PLAYER#123" where 123 is the 3-digit connect code
  return [
    // Add your connect codes here, for example:
    "MM#391","CLICH#3", "ALEX#154", "SNAP#1", "SGUN#420", "JELO#421", 
    "MOJ#383", "SAM#0", "LOU#258", "ADWA#358", "CRAY#527", "OMAR#341", 
    "KB#795", "KJH#23", "ZEOD#609" , "FITZ#433","PENG#444", "TYPH#474",
     "SF#818","TSUK#668", "DD#0", "PREE#696", "PAL#0",  "SS#03", "MEDZ#841",
     "FFF#641",
    // "PLAYER3#789"
  ];
};

const getPlayers = async () => {
  const codes = await getPlayerConnectCodes()
  console.log(`Found ${codes.length} player codes`)
  const allData = codes.map(code => getPlayerDataThrottled(code))
  const results = await Promise.all(allData.map(p => p.catch(e => e)));
  const validResults = results.filter(result => !(result instanceof Error));
  const unsortedPlayers = validResults
    .filter((data: any) => data.data.getUser)
    .map((data: any) => data.data.getUser);
  return unsortedPlayers.sort((p1, p2) =>
    p2.rankedNetplayProfile.ratingOrdinal - p1.rankedNetplayProfile.ratingOrdinal)
}

async function main() {
  console.log('Starting player fetch.');
  const players = await getPlayers();
  if(!players.length) {
    console.log('Error fetching player data. Terminating.')
    return
  }
  console.log('Player fetch complete.');
  // rename original to players-old
  const newFile = path.join(__dirname, 'data/players-new.json')
  const oldFile = path.join(__dirname, 'data/players-old.json')
  const timestamp = path.join(__dirname, 'data/timestamp.json')

  await fs.rename(newFile, oldFile)
  console.log('Renamed existing data file.');
  await fs.writeFile(newFile, JSON.stringify(players));
  await fs.writeFile(timestamp, JSON.stringify({updated: Date.now()}));
  console.log('Wrote new data file and timestamp.');
  const rootDir = path.normalize(path.join(__dirname, '..'))
  console.log(rootDir)
  // if no current git changes
  const { stdout, stderr } = await execPromise(`git -C "${rootDir}" status --porcelain`);
  if(stdout || stderr) {
    console.log('Pending git changes... aborting deploy');
    return
  }
  console.log('Deploying.');
  const { stdout: stdout2, stderr: stderr2 } = await execPromise(`npm run --prefix "${rootDir}" deploy`);
  console.log(stdout2);
  if(stderr2) {
    console.error(stderr2);
  }
  console.log('Deploy complete.');
}

main();
