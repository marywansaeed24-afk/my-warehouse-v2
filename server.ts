import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API to fetch exchange rate from Qamar Al Fajr
  app.get('/api/exchange-rate', async (req, res) => {
    try {
      const response = await axios.get('https://qamaralfajr.com/production/exchange_rates.php', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      
      const $ = cheerio.load(response.data);
      let rate = 151500; // Default fallback
      
      // Target the table row containing IQD or دینار
      $('tr').each((index, element) => {
        const rowText = $(element).text().toLowerCase();
        if (rowText.includes('iqd') || rowText.includes('دینار')) {
          const buttons = $(element).find('button');
          if (buttons.length >= 2) {
            // First button is usually Sell, Second is Buy
            // We'll take the average or the Sell rate for calculation
            const sellRate = parseInt($(buttons[0]).text().trim().replace(/[.,\s]/g, ''));
            if (sellRate > 100000 && sellRate < 170000) {
              rate = sellRate;
              return false; // break loop
            }
          }
        }
      });

      res.json({ rate });
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Return fallback rate even on error so frontend doesn't break
      res.json({ rate: 151500, error: 'Timed out or failed' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
