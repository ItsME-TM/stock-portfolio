const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'stellarvest_jwt_secret_key_12345';

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Set up file uploads directory for CSV imports
const upload = multer({ dest: '/tmp/uploads/' });

let db;

// Retry connection to MySQL database to handle slow startup in Docker Compose
async function connectDB() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'portfolio_db',
  };

  while (true) {
    try {
      db = await mysql.createConnection(dbConfig);
      console.log('Successfully connected to MySQL database!');
      
      // Auto-create users table if it does not exist (migrating from previous runs)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      break;
    } catch (err) {
      console.log('MySQL connection failed, retrying in 3 seconds...', err.message);
      await new Promise(resolve => setTimeout(resolve, 3050));
    }
  }
}

// Helper to determine sector based on Sri Lankan Stock Market (CSE) symbols
function getSriLankanSector(symbol) {
  const sym = symbol.toUpperCase().trim();
  if (sym.startsWith('AAIC')) return 'Financials'; // Asia Asset or Lanka Insurance
  if (sym.startsWith('AEL')) return 'Industrials'; // Access Engineering
  if (sym.startsWith('BFL')) return 'Consumer Defensive'; // Bairaha Farms
  if (sym.startsWith('BOPL')) return 'Consumer Defensive'; // Bogawantalawa Plantations
  if (sym.startsWith('CFVF')) return 'Financials'; // First Capital
  if (sym.startsWith('CHOT')) return 'Consumer Cyclical'; // Ceylon Hotels Corporation
  if (sym.startsWith('EAST')) return 'Consumer Cyclical'; // Eastern Merchants
  if (sym.startsWith('HNB')) return 'Financials'; // Hatton National Bank
  if (sym.startsWith('JKH')) return 'Industrials'; // John Keells Holdings (Conglomerate)
  if (sym.startsWith('KHC')) return 'Consumer Cyclical'; // Kandy Hotels Company
  if (sym.startsWith('LALU')) return 'Materials'; // Lanka Aluminium
  if (sym.startsWith('LMF')) return 'Consumer Defensive'; // Lanka Milk Foods
  if (sym.startsWith('LOFC')) return 'Financials'; // LOLC Finance
  if (sym.startsWith('NDB')) return 'Financials'; // National Development Bank
  if (sym.startsWith('PLC')) return 'Financials'; // People's Leasing
  if (sym.startsWith('RCL')) return 'Materials'; // Royal Ceramics Lanka
  if (sym.startsWith('SAMP')) return 'Financials'; // Sampath Bank
  if (sym.startsWith('SLTL')) return 'Communication Services'; // Sri Lanka Telecom
  if (sym.startsWith('SUN')) return 'Consumer Defensive'; // Sunshine Holdings
  if (sym.startsWith('UML')) return 'Consumer Cyclical'; // United Motors Lanka
  if (sym.startsWith('WLTH')) return 'Financials'; // Capital Alliance / Wealth Trust
  return 'Other';
}

// Custom RFC 4180 CSV parser to process CSV uploads without external packages
function parseCSV(csvText) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        row[row.length - 1] += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push("");
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        if (row.length > 1 || row[0] !== "") {
          lines.push(row);
        }
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

// Middleware: Authenticate Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
    req.user = user;
    next();
  });
}

// Authentication API Endpoints

// GET /api/auth/status - Check if any user accounts are registered
app.get('/api/auth/status', async (req, res) => {
  try {
    const [[result]] = await db.execute('SELECT COUNT(*) as count FROM users');
    res.json({ registered: result.count > 0 });
  } catch (error) {
    console.error('Error fetching auth status:', error);
    res.status(500).json({ error: 'Database verification failed' });
  }
});

// POST /api/auth/register - Register setup admin account (only if none exist)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Restrict registration if an admin has already been set up
    const [[countResult]] = await db.execute('SELECT COUNT(*) as count FROM users');
    if (countResult.count > 0) {
      return res.status(400).json({ error: 'Admin account has already been initialized' });
    }

    // Encrypt the password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    await db.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username.trim(), hashedPassword]
    );

    res.status(201).json({ message: 'Admin account successfully configured' });
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - Authenticate admin account and grant JWT
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(450).json({ error: 'Username and password are required' });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password.trim(), user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Sign jwt token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' } // Valid for 7 days
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});


// Secured API Routes (Require authenticateToken)

// GET /api/stocks - Fetch all stocks, supporting optional sector filter
app.get('/api/stocks', authenticateToken, async (req, res) => {
  try {
    const { sector } = req.query;
    let query = 'SELECT * FROM stocks ORDER BY symbol ASC';
    let params = [];

    if (sector) {
      query = 'SELECT * FROM stocks WHERE sector = ? ORDER BY symbol ASC';
      params = [sector];
    }

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// POST /api/stocks - Add a new stock (with duplicate symbol support updating values)
app.post('/api/stocks', authenticateToken, async (req, res) => {
  try {
    const { symbol, quantity, total_invested, sector, status } = req.body;
    
    if (!symbol || quantity === undefined || total_invested === undefined) {
      return res.status(400).json({ error: 'symbol, quantity, and total_invested are required' });
    }

    const trimmedSymbol = symbol.trim().toUpperCase();
    const mappedSector = getSriLankanSector(trimmedSymbol);
    const finalSector = sector && sector !== 'Other' ? sector : mappedSector;
    const finalStatus = status || 'Neutral';

    const sql = `
      INSERT INTO stocks (symbol, quantity, total_invested, sector, status)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity = VALUES(quantity),
        total_invested = VALUES(total_invested),
        sector = VALUES(sector),
        status = VALUES(status)
    `;

    const [result] = await db.execute(sql, [
      trimmedSymbol,
      parseInt(quantity, 10),
      parseFloat(total_invested),
      finalSector.trim(),
      finalStatus
    ]);

    res.status(201).json({ message: 'Stock added/updated successfully', id: result.insertId });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// PUT /api/stocks/:id - Update an existing stock
app.put('/api/stocks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, quantity, total_invested, sector, status } = req.body;

    if (!symbol || quantity === undefined || total_invested === undefined) {
      return res.status(400).json({ error: 'symbol, quantity, and total_invested are required' });
    }

    const trimmedSymbol = symbol.trim().toUpperCase();
    const mappedSector = getSriLankanSector(trimmedSymbol);
    const finalSector = sector && sector !== 'Other' ? sector : mappedSector;

    const sql = `
      UPDATE stocks 
      SET symbol = ?, quantity = ?, total_invested = ?, sector = ?, status = ?
      WHERE id = ?
    `;

    const [result] = await db.execute(sql, [
      trimmedSymbol,
      parseInt(quantity, 10),
      parseFloat(total_invested),
      finalSector.trim(),
      status || 'Neutral',
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({ message: 'Stock updated successfully' });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// DELETE /api/stocks/:id - Delete a stock
app.delete('/api/stocks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM stocks WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: 'Failed to delete stock' });
  }
});

// GET /api/summary - Fetch aggregation data for dashboard widgets and charts
app.get('/api/summary', authenticateToken, async (req, res) => {
  try {
    // 1. Total Investment Sum & Total Stocks Count
    const [[totals]] = await db.execute(`
      SELECT 
        COALESCE(SUM(total_invested), 0) as totalInvestment,
        COUNT(*) as totalStocks
      FROM stocks
    `);

    // 2. Sector distributions for Pie Chart
    const [sectors] = await db.execute(`
      SELECT 
        sector as name,
        COALESCE(SUM(total_invested), 0) as value
      FROM stocks
      GROUP BY sector
      ORDER BY value DESC
    `);

    // 3. Top 5 stocks by total invested for Bar Chart
    const [topStocks] = await db.execute(`
      SELECT 
        symbol as name,
        total_invested as value
      FROM stocks
      ORDER BY total_invested DESC
      LIMIT 5
    `);

    res.json({
      totalInvestment: parseFloat(totals.totalInvestment),
      totalStocks: parseInt(totals.totalStocks, 10),
      sectorDistribution: sectors.map(s => ({ ...s, value: parseFloat(s.value) })),
      topStocks: topStocks.map(s => ({ ...s, value: parseFloat(s.value) }))
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to compute portfolio summary' });
  }
});

// GET /api/export - Export stocks database as CSV file
app.get('/api/export', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT symbol, quantity, total_invested, sector, status FROM stocks ORDER BY symbol ASC');
    
    let csvContent = 'Security,Quantity,Total Cost,Sector,Status\n';
    
    for (const row of rows) {
      const escapedSymbol = `"${row.symbol.replace(/"/g, '""')}"`;
      const escapedSector = `"${row.sector.replace(/"/g, '""')}"`;
      const escapedStatus = `"${row.status.replace(/"/g, '""')}"`;
      csvContent += `${escapedSymbol},${row.quantity},${row.total_invested},${escapedSector},${escapedStatus}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="portfolio_export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting portfolio:', error);
    res.status(550).json({ error: 'Failed to export CSV' });
  }
});

// POST /api/import - Import stocks database from uploaded CSV file (handling standard and custom headers)
app.post('/api/import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file was uploaded' });
    }

    const csvText = fs.readFileSync(req.file.path, 'utf-8');
    // Remove the file after reading
    fs.unlinkSync(req.file.path);

    const parsedLines = parseCSV(csvText);
    if (parsedLines.length < 2) {
      return res.status(400).json({ error: 'CSV file must contain a header and at least one row of data' });
    }

    const headers = parsedLines[0].map(h => h.trim().toLowerCase());
    
    // Dynamically identify index mapping from headers
    const symbolIdx = headers.findIndex(h => ['symbol', 'security', 'ticker'].includes(h));
    const quantityIdx = headers.findIndex(h => ['quantity', 'qty', 'cleared balance'].includes(h));
    const costIdx = headers.findIndex(h => ['total_invested', 'total invested', 'total cost', 'cost', 'invested', 'market value'].includes(h));
    const sectorIdx = headers.findIndex(h => ['sector', 'industry'].includes(h));
    const statusIdx = headers.findIndex(h => ['status'].includes(h));

    if (symbolIdx === -1 || quantityIdx === -1 || costIdx === -1) {
      return res.status(400).json({ 
        error: `Could not map CSV columns. Make sure columns contain: 'Security' (or 'symbol'), 'Quantity', and 'Total Cost' (or 'total_invested'). Found headers: ${parsedLines[0].join(', ')}` 
      });
    }

    let insertCount = 0;

    for (let i = 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      if (row.length < Math.max(symbolIdx, quantityIdx, costIdx) + 1) continue;

      const symbol = row[symbolIdx]?.trim().toUpperCase();
      if (!symbol) continue;

      // Clean numbers of quotes, spaces, parentheses, commas
      const rawQty = row[quantityIdx]?.replace(/[",\s\(\)]/g, '') || '0';
      const quantity = parseInt(rawQty, 10) || 0;

      const rawCost = row[costIdx]?.replace(/[",\s\(\)]/g, '') || '0';
      const totalInvested = parseFloat(rawCost) || 0.0;

      // Check if sector in CSV is valid, otherwise resolve based on Sri Lankan stock CSE list
      let csvSector = sectorIdx !== -1 && row[sectorIdx] ? row[sectorIdx].trim() : 'Other';
      if (!csvSector || csvSector === '' || csvSector.toLowerCase() === 'other' || csvSector.toLowerCase() === 'uncategorized') {
        csvSector = getSriLankanSector(symbol);
      }

      const status = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : 'Neutral';

      // Perform Upsert
      const upsertSql = `
        INSERT INTO stocks (symbol, quantity, total_invested, sector, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          quantity = VALUES(quantity),
          total_invested = VALUES(total_invested),
          sector = CASE WHEN VALUES(sector) = 'Other' THEN stocks.sector ELSE VALUES(sector) END,
          status = CASE WHEN VALUES(status) = 'Neutral' THEN stocks.status ELSE VALUES(status) END
      `;

      await db.execute(upsertSql, [symbol, quantity, totalInvested, csvSector, status]);
      insertCount++;
    }

    res.json({ message: `Successfully processed CSV. Imported/Updated ${insertCount} stock entries with CSE sector intelligence.` });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to parse and import CSV file' });
  }
});

// Production: Serve frontend static build files
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Catch-all route to serve index.html for client side routing
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Application build files not found. Run "npm run build" in client directory first.');
    }
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
});

// Start backend server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
