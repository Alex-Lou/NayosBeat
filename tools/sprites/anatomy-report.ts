/**
 * Prints the anatomy issues of strips (see anatomy.ts), frame by frame:
 *
 *   npm run sprites:anatomy                    # every strip of both fighters
 *   npm run sprites:anatomy -- nayo super      # one fighter, some strips
 *   npm run sprites:anatomy -- riff            # one fighter, all its strips
 */

import { anatomyIssues } from './anatomy.ts';
import type { Fighter } from './fighter.ts';
import { NAYO } from './nayo/index.ts';
import { RIFF } from './riff/index.ts';

const args = process.argv.slice(2);
const fighters: readonly Fighter[] =
  args[0] === 'riff' ? [RIFF] : args[0] === 'nayo' ? [NAYO] : [NAYO, RIFF];
const named = args.filter((arg) => arg !== 'nayo' && arg !== 'riff');
let hard = 0;
let warnings = 0;
for (const fighter of fighters) {
  for (const sheet of named.length > 0 ? named : Object.keys(fighter.sheets)) {
    const poses = fighter.poses(sheet);
    if (!poses) continue;
    poses.forEach((pose, frame) => {
      for (const issue of anatomyIssues(pose, fighter.body)) {
        if (issue.hard) hard++;
        else warnings++;
        const tag = issue.hard ? 'LIMITE ' : 'à juger';
        console.log(
          `${fighter.name} ${sheet} ${frame} ${issue.side} ${tag} ${issue.rule} ${issue.value}`,
        );
      }
    });
  }
}
console.log(`${hard} hors limites, ${warnings} à juger`);
