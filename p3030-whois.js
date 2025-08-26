// p3030_whois.js (run with: node p3030_whois.js or pm2 start p3030_whois.js)

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// __dirname workaround in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3030;

app.use(cors());
app.use(express.json());


// ISP logo folder
// const logoFolder = '/var/www/whois.ciscoar.com/public/img/us_isp_logos';
const logoFolder = path.join(__dirname, 'public', 'img', 'us_isp_logos');

app.post('/whois', (req, res) => {
  const { ip } = req.body;

  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'Invalid IP address' });
  }

  exec(`sh ${path.join(__dirname, 'server', 'whois.sh')} ${ip}`, (error, stdout, stderr) => {
    if (error || stderr) {
      return res.status(500).json({ error: 'Lookup failed' });
    }

    const output = stdout.trim();
    const lines = output.split('\n').map(line => line.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Check both the first and last lines for a match
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];

    // Read the list of logo files
    const logoFiles = fs.readdirSync(logoFolder);

    // Find a matching logo file by checking both lines
    const matchedLogo = logoFiles.find((file) => {
        const fileName = path.basename(file, path.extname(file)).toLowerCase();
        const processedFileName = fileName.replace(/[^a-z0-9]/g, '');
        const filenameParts = fileName.split(/[^a-z0-9]+/).filter(part => part.length > 0);
        
        // Return true if either the first or last line includes the processed filename
        // OR if any part of the filename (split by underscores) matches the output
        return firstLine.includes(processedFileName) || 
               lastLine.includes(processedFileName) ||
               filenameParts.some(part => firstLine.includes(part) || lastLine.includes(part));
    });

    const logo = matchedLogo || 'generic_logo.png';

    res.json({ output, logo });
  });
});
// app.post('/whois', (req, res) => {
//   const { ip } = req.body;

//   if (!ip || typeof ip !== 'string') {
//     return res.status(400).json({ error: 'Invalid IP address' });
//   }

//   exec(`sh ${path.join(__dirname, 'server', 'whois.sh')} ${ip}`, (error, stdout, stderr) => {
//     if (error || stderr) {
//       return res.status(500).json({ error: 'Lookup failed' });
//     }

//     const output = stdout.trim();
//     const lines = output.split('\n');
//     const lastLine = lines[lines.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');

//     // Try to find matching logo file
//     const logoFiles = fs.readdirSync(logoFolder);
//     const matchedLogo = logoFiles.find((file) =>
//       lastLine.includes(path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]/g, ''))
//     );

//     const logo = matchedLogo || 'generic_logo.png';

//     res.json({ output, logo });
//   });
// });

app.listen(port, () => {
  console.log(`WHOIS service listening at http://localhost:${port}`);
});
