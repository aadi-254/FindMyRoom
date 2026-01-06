import cors from 'cors';
import dotenv from 'dotenv';
import db from './config/database.js';
import authRoutes from './routes/auth.js';
import listingsRoutes from './routes/listings.js';
import requestsRoutes from './routes/requests.js';
import express from 'express';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  
  // Add Content Security Policy headers for development
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; connect-src 'self' ws: wss: http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
      );
      next();
    });
  }

  // Test database connection
  try {
    const connection = await db.getConnection();
    console.log("✅ Connected to MySQL Database");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }

  app.get("/", (req, res) => {
    res.json({ message: "findMyRoom Backend Server is running!" });
  });

  app.get("/users", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM users");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  app.get("/listings", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM listings");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  app.get("/requests", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM requests");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database query failed" });
    }
  });

  app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Server is healthy' }));

  app.get('/api/maps-config', (req, res) => {
    res.json({ apiKey: process.env.API_KEY, libraries: ['places'] });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/listings', listingsRoutes);
  app.use('/api/requests', requestsRoutes);

  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
}

// Start the server
startServer().catch(console.error);
