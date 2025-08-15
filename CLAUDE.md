# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start the application**: `npm start` or `node p3030-whois.js`
- **Install dependencies**: `npm install`
- **Build Tailwind CSS**: `npx tailwindcss -i public/styles.css -o public/styles.tailwind.css --watch`

## Production Deployment

The application is configured for PM2 process management:
- **Start with PM2**: `pm2 start process.json`
- **PM2 configuration**: Defined in `process.json` with logging to `/root/.pm2/logs/`
- **Production path**: Application expects to run from `/var/www/whois.ciscoar.com`

## Architecture Overview

This is a Node.js web application that provides WHOIS lookup functionality for IP addresses with ISP logo detection.

### Core Components

1. **Backend (`p3030-whois.js`)**:
   - Express.js server running on port 3030
   - Single POST endpoint `/whois` that accepts IP addresses
   - Executes shell script `server/whois.sh` to perform WHOIS lookups
   - Matches organization names to ISP logos in `public/img/us_isp_logos/`
   - Uses both first and last lines of WHOIS output for logo matching

2. **Shell Script (`server/whois.sh`)**:
   - Performs actual WHOIS lookup using system `whois` command
   - Filters output for organization names using grep
   - Returns clean organization data

3. **Frontend**:
   - **HTML (`public/index.html`)**: Dual-panel interface for WAN1/WAN2 lookups
   - **JavaScript (`public/javascript.js`)**: Client-side logic with IP validation, fetch requests, and clipboard functionality
   - **CSS**: Uses Tailwind CSS for styling

### Key Features

- **Dual WAN Interface**: Separate panels for WAN1 and WAN2 IP lookups
- **ISP Logo Detection**: Automatically matches WHOIS results to ISP logos
- **IP Validation**: Client-side IPv4 address validation
- **Copy to Clipboard**: Results can be copied to clipboard
- **Logo Fallback**: Uses `generic_logo.png` when no ISP match is found

### File Structure

```
├── p3030-whois.js          # Main Express server
├── process.json            # PM2 configuration
├── server/whois.sh         # WHOIS lookup script
├── public/
│   ├── index.html          # Main web interface
│   ├── javascript.js       # Client-side functionality
│   ├── styles.css          # Base styles
│   └── img/us_isp_logos/   # ISP logo images
└── tailwind.config.js      # Tailwind CSS configuration
```

### Logo Matching Logic

The system matches WHOIS organization names to logo files by:
1. Processing organization names (lowercase, alphanumeric only)
2. Processing logo filenames (remove extension, lowercase, alphanumeric only)
3. Checking if processed organization name contains the processed filename
4. Falling back to `generic_logo.png` if no match found