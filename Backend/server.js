const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

// Request timeout middleware
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.log('⏰ Request timeout');
    res.status(408).send('Request Timeout');
  });
  next();
});

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} Query: ${JSON.stringify(req.query)}`);
  next();
});

// DB connection with optimized settings
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'Pritam',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.connect()
  .then(client => {
    console.log("✅ Database connected successfully!");
    client.release();
  })
  .catch(err => {
    console.error("❌ Failed to connect to database:", err.message);
  });

// ===== CORE API ENDPOINTS =====

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend is running successfully!',
    database: 'Connected'
  });
});

// Years endpoint - Get distinct financial years
app.get('/api/years', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT financial_year FROM industry_meter_readings WHERE financial_year IS NOT NULL ORDER BY financial_year DESC');
    const years = result.rows.map(r => ({ id: r.financial_year, name: r.financial_year }));
    console.log(`📋 Years: ${years.length} unique years found`);
    res.json(years);
  } catch (err) {
    console.error("Years error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Divisions endpoint - UPDATED to remove prefix
app.get('/api/divisions', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT division_id FROM industry_meter_readings ORDER BY division_id');
    const divisions = result.rows.map(r => {
      // Remove prefixes like "EE_", "AB_", etc. from division names
      let cleanName = r.division_id.replace(/^[A-Z]{2}_/, '');
      
      // If the clean name is empty or same as original, keep original
      if (!cleanName || cleanName === r.division_id) {
        cleanName = r.division_id;
      }
      
      return { 
        id: r.division_id,        // Keep original ID for database queries
        name: cleanName           // Display clean name in dropdown
      };
    });
    
    console.log(`📋 Divisions: ${divisions.length} unique divisions found`);
    console.log('Division sample data:', divisions.slice(0, 3));
    res.json(divisions);
  } catch (err) {
    console.error("Divisions error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Industries endpoint
app.get('/api/industries', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT industryname FROM industry_meter_readings ORDER BY industryname LIMIT 100');
    const industries = result.rows.map(r => ({ id: r.industryname, name: r.industryname }));
    console.log(`📋 Industries: ${industries.length} unique industries found`);
    res.json(industries);
  } catch (err) {
    console.error("Industries error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Months endpoint
app.get('/api/months', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT month_id FROM industry_meter_readings ORDER BY month_id');
    const months = result.rows.map(r => ({ id: r.month_id, name: `Month ${r.month_id}` }));
    console.log(`📋 Months: ${months.length} unique months found`);
    res.json(months);
  } catch (err) {
    console.error("Months error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Dashboard endpoint - Add this to your server.js
// Dashboard endpoint with improved pagination
app.get('/api/alldata', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = page * pageSize;
    
    console.log(`📄 Fetching page ${page + 1}: offset=${offset}, limit=${pageSize}`);
    
    // Get total count for pagination info
    const countResult = await pool.query('SELECT COUNT(*) as total FROM industry_meter_readings');
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / pageSize);
    const hasMore = (page + 1) < totalPages;
    
    // Get paginated data
    const dataQuery = `
      SELECT 
        industryname, 
        division_id, 
        industry_id, 
        month_id, 
        monthname,
        financial_year, 
        initialmeter_reading, 
        finalmeter_reading, 
        meterreadingdifference, 
        currentfinancialyear, 
        insert_date
      FROM industry_meter_readings
      ORDER BY division_id, month_id, industryname
      OFFSET $1 LIMIT $2
    `;
    
    const dataResult = await pool.query(dataQuery, [offset, pageSize]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Page ${page + 1} fetched in ${duration}ms. Records: ${dataResult.rows.length}/${totalRecords}`);
    
    // Return comprehensive pagination data
    res.json({
      data: dataResult.rows,
      total: totalRecords,
      page: page,
      pageSize: pageSize,
      hasMore: hasMore,
      totalPages: totalPages,
      currentPageRecords: dataResult.rows.length
    });
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ Paginated data query failed after ${duration}ms:`, err.message);
    res.status(500).json({ 
      error: 'Database query failed', 
      details: err.message 
    });
  }
});


// ===== CHART API ENDPOINTS =====

// Chart 1 - Industry vs Meter Reading Difference by Division and Year
app.get('/api/chart1', async (req, res) => {
  const { division, financial_year } = req.query;
  
  console.log(`Chart1 API called with division: ${division}, year: ${financial_year}`);
  
  if (!division || !financial_year) {
    console.log('Chart1: Missing required parameters');
    return res.status(400).json({ error: 'Missing required parameters: division and financial_year' });
  }
  
  try {
    const result = await pool.query(`
      SELECT industryname, SUM(CAST(meterreadingdifference AS numeric)) AS total_diff
      FROM industry_meter_readings
      WHERE division_id = $1 AND financial_year = $2
      GROUP BY industryname
      ORDER BY total_diff DESC
      LIMIT 50
    `, [division, financial_year]);
    
    console.log(`📊 Chart1: ${result.rows.length} industries for division "${division}", year "${financial_year}"`);
    console.log('Chart1 sample data:', result.rows.slice(0, 2));
    res.json(result.rows);
  } catch (err) {
    console.error("Chart 1 error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Chart 2 - Division vs Meter Reading Difference by Year
app.get('/api/chart2', async (req, res) => {
  const { financial_year } = req.query;
  
  console.log(`Chart2 API called with year: ${financial_year}`);
  
  if (!financial_year) {
    console.log('Chart2: Missing required parameter');
    return res.status(400).json({ error: 'Missing required parameter: financial_year' });
  }
  
  try {
    const result = await pool.query(`
      SELECT division_id, SUM(CAST(meterreadingdifference AS numeric)) AS total_diff
      FROM industry_meter_readings
      WHERE financial_year = $1
      GROUP BY division_id
      ORDER BY division_id
    `, [financial_year]);
    
    console.log(`📊 Chart2: ${result.rows.length} divisions for year "${financial_year}"`);
    console.log('Chart2 sample data:', result.rows.slice(0, 2));
    res.json(result.rows);
  } catch (err) {
    console.error("Chart 2 error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Chart 3 - Year vs Meter Reading Difference by Industry
app.get('/api/chart3', async (req, res) => {
  const { industry } = req.query;
  
  console.log(`Chart3 API called with industry: ${industry}`);
  
  if (!industry) {
    console.log('Chart3: Missing required parameter');
    return res.status(400).json({ error: 'Missing required parameter: industry' });
  }
  
  try {
    const result = await pool.query(`
      SELECT financial_year, SUM(CAST(meterreadingdifference AS numeric)) AS total_diff
      FROM industry_meter_readings
      WHERE industryname = $1
      GROUP BY financial_year
      ORDER BY financial_year
    `, [industry]);
    
    console.log(`📊 Chart3: ${result.rows.length} years for industry "${industry}"`);
    console.log('Chart3 sample data:', result.rows.slice(0, 2));
    res.json(result.rows);
  } catch (err) {
    console.error("Chart 3 error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Chart 4 - Time Series by Industry (Simplified - using month data)
app.get('/api/chart4', async (req, res) => {
  const { industry } = req.query;
  
  console.log(`Chart4 API called with industry: ${industry}`);
  
  if (!industry) {
    console.log('Chart4: Missing required parameter');
    return res.status(400).json({ error: 'Missing required parameter: industry' });
  }
  
  try {
    const result = await pool.query(`
      SELECT month_id, SUM(CAST(meterreadingdifference AS numeric)) AS total_diff,
             industry_id, insert_date
      FROM industry_meter_readings
      WHERE industryname = $1
      GROUP BY month_id, industry_id, insert_date
      ORDER BY month_id, insert_date
      LIMIT 50
    `, [industry]);
    
    console.log(`📊 Chart4: ${result.rows.length} data points for industry "${industry}"`);
    console.log('Chart4 sample data:', result.rows.slice(0, 2));
    res.json(result.rows);
  } catch (err) {
    console.error("Chart 4 error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Chart 5 - Monthly Analysis by Industry and Year (Enhanced with month names)
app.get('/api/chart5', async (req, res) => {
  const { industry, financial_year } = req.query;
  
  console.log(`Chart5 API called with industry: ${industry}, year: ${financial_year}`);
  
  if (!industry) {
    console.log('Chart5: Missing required parameter - industry');
    return res.status(400).json({ 
      error: 'Missing required parameter: industry',
      received: { industry, financial_year }
    });
  }
  
  try {
    let query, params;
    
    // Handle "All Years" case (empty financial_year)
    if (!financial_year || financial_year === '' || financial_year === 'all') {
      console.log('Chart5: Fetching data for all years');
      query = `
        SELECT 
          month_id, 
          monthname,
          SUM(CAST(meterreadingdifference AS numeric)) AS total_diff
        FROM industry_meter_readings
        WHERE industryname = $1 AND monthname IS NOT NULL
        GROUP BY month_id, monthname
        ORDER BY month_id
      `;
      params = [industry];
    } else {
      console.log('Chart5: Fetching data for specific year:', financial_year);
      query = `
        SELECT 
          month_id, 
          monthname,
          SUM(CAST(meterreadingdifference AS numeric)) AS total_diff
        FROM industry_meter_readings
        WHERE industryname = $1 AND financial_year = $2 AND monthname IS NOT NULL
        GROUP BY month_id, monthname
        ORDER BY month_id
      `;
      params = [industry, financial_year];
    }

    const result = await pool.query(query, params);
    
    console.log(`📊 Chart5: ${result.rows.length} months for industry "${industry}"${financial_year ? `, year "${financial_year}"` : ' (all years)'}`);
    console.log('Chart5 result data:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Chart 5 error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Chart 6 - Monthly Analysis by Division and Year (Enhanced with month names)
app.get('/api/chart6', async (req, res) => {
  const { division, financial_year } = req.query;
  
  console.log(`Chart6 API called with division: ${division}, year: ${financial_year}`);
  
  if (!division || !financial_year) {
    console.log('Chart6: Missing required parameters');
    return res.status(400).json({ error: 'Missing required parameters: division and financial_year' });
  }
  
  try {
    const result = await pool.query(`
      SELECT 
        month_id, 
        monthname,
        SUM(CAST(meterreadingdifference AS numeric)) AS total_diff
      FROM industry_meter_readings
      WHERE division_id = $1 AND financial_year = $2 AND monthname IS NOT NULL
      GROUP BY month_id, monthname
      ORDER BY month_id
    `, [division, financial_year]);
    
    console.log(`📊 Chart6: ${result.rows.length} months for division "${division}", year "${financial_year}"`);
    console.log('Chart6 sample data:', result.rows.slice(0, 2));
    res.json(result.rows);
  } catch (err) {
    console.error("Chart 6 error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// ===== DASHBOARD DATA ENDPOINTS =====

// All meter data with pagination
app.get('/api/alldata', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = page * pageSize;
    
    console.log(`📄 Fetching paginated data: page ${page}, pageSize ${pageSize}, offset ${offset}`);
    
    // Get total count (only on first page for performance)
    let totalRecords = 0;
    if (page === 0) {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM industry_meter_readings');
      totalRecords = parseInt(countResult.rows[0].total);
    }
    
    // Get paginated data
    const dataQuery = `
      SELECT 
        industryname, 
        division_id, 
        industry_id, 
        month_id, 
        monthname,
        financial_year, 
        initialmeter_reading, 
        finalmeter_reading, 
        meterreadingdifference, 
        currentfinancialyear, 
        insert_date
      FROM industry_meter_readings
      ORDER BY division_id, month_id, industryname
      OFFSET $1 LIMIT $2
    `;
    
    const dataResult = await pool.query(dataQuery, [offset, pageSize]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Paginated data fetched in ${duration}ms. Records: ${dataResult.rows.length}`);
    
    // Return data with metadata
    res.json({
      data: dataResult.rows,
      total: totalRecords,
      page: page,
      pageSize: pageSize,
      hasMore: dataResult.rows.length === pageSize
    });
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ Paginated data query failed after ${duration}ms:`, err.message);
    res.status(500).json({ 
      error: 'Database query failed', 
      details: err.message 
    });
  }
});

// All meter data (legacy endpoint - limited)
app.get('/api/all-meter-data', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM industry_meter_readings 
      ORDER BY division_id, month_id, industryname 
      LIMIT 100
    `);
    
    console.log(`📊 Legacy endpoint: ${result.rows.length} records`);
    res.json(result.rows);
  } catch (err) {
    console.error("Legacy endpoint error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Database statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const queries = [
      { name: 'total_records', query: 'SELECT COUNT(*) as count FROM industry_meter_readings' },
      { name: 'unique_industries', query: 'SELECT COUNT(DISTINCT industryname) as count FROM industry_meter_readings' },
      { name: 'unique_divisions', query: 'SELECT COUNT(DISTINCT division_id) as count FROM industry_meter_readings' },
      { name: 'unique_months', query: 'SELECT COUNT(DISTINCT month_id) as count FROM industry_meter_readings' },
      { name: 'total_difference', query: 'SELECT SUM(CAST(meterreadingdifference AS numeric)) as sum FROM industry_meter_readings' }
    ];

    const stats = {};
    for (const { name, query } of queries) {
      const result = await pool.query(query);
      stats[name] = result.rows[0].count || result.rows.sum || 0;
    }

    console.log('📊 Database stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({
      status: 'Database connection successful',
      current_time: result.rows[0].current_time,
      database_version: result.rows.db_version
    });
  } catch (err) {
    console.error("Database test error:", err.message);
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: err.message 
    });
  }
});

// ===== ERROR HANDLING =====

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    requested_path: req.path,
    method: req.method,
    available_endpoints: [
      'GET /api/health',
      'GET /api/years',
      'GET /api/divisions', 
      'GET /api/industries',
      'GET /api/months',
      'GET /api/chart1?division=X&financial_year=Y',
      'GET /api/chart2?financial_year=X',
      'GET /api/chart3?industry=X',
      'GET /api/chart4?industry=X',
      'GET /api/chart5?industry=X&financial_year=Y',
      'GET /api/chart6?division=X&financial_year=Y',
      'GET /api/alldata?page=0&pageSize=20',
      'GET /api/all-meter-data',
      'GET /api/stats',
      'GET /api/test-db'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ===== START SERVER =====

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Water Meter Analytics API Server`);
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 All endpoints: http://localhost:${PORT}/api/stats`);
  console.log(`🔧 Database: PostgreSQL on localhost:5432`);
  console.log('='.repeat(60));
});
