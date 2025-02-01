import { CronJob } from 'cron';
import { exec } from 'child_process';
import path from 'path';

const updateScript = path.join(__dirname, 'update-models.ts');

// Runs every 10 hours
const job = new CronJob('0 */10 * * *', function() {
  exec(`ts-node ${updateScript}`, (error, stdout, stderr) => {
    if (error) console.error('Error running update script:', error);
    if (stdout) console.log('Update output:', stdout);
    if (stderr) console.error('Update errors:', stderr);
  });
});

job.start();