// const express = require('express');
// const mysql = require('mysql2');
// const axios = require('axios');
// const cheerio = require('cheerio');
// const dotenv = require('dotenv');

// // Load environment variables from .env file
// dotenv.config();

// const app = express();
// const port = 3003;

// // Basic Auth Credentials from .env file
// const USERNAME = process.env.BASIC_AUTH_USERNAME;
// const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

// // Middleware for Basic Authentication
// function basicAuth(req, res, next) {
//   const authHeader = req.headers['authorization'];
  
//   if (!authHeader) {
//     return res.status(401).json({ message: 'Authorization header is missing' });
//   }

//   const base64Credentials = authHeader.split(' ')[1];
//   const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
//   const [username, password] = credentials.split(':');

//   if (username === USERNAME && password === PASSWORD) {
//     next();
//   } else {
//     res.status(401).json({ message: 'Invalid username or password' });
//   }
// }

// // MySQL connection (Amazon RDS) using .env variables
// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE,
//   port: process.env.DB_PORT || 3306 // Default to port 3306 if not provided
// });

// // Connect to MySQL (Amazon RDS)
// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL (RDS):', err);
//   } else {
//     console.log('Connected to MySQL (RDS)');
//   }
// });

// // Function to scrape Amazon and store data into MySQL
// async function scrapeAmazon() {
//   try {
//     const url = 'https://www.amazon.com/s?k=laptops'; // Change the URL to the product search page you want
//     const { data } = await axios.get(url, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
//       }
//     });

//     const $ = cheerio.load(data);
//     const productspagination = [];

//     $('.s-main-slot .s-result-item').each((i, el) => {
//       const title = $(el).find('h2 a span').text().trim();
//       const price = $(el).find('.a-price span.a-offscreen').first().text().trim();
//       const rating = $(el).find('.a-row span.a-icon-alt').text().trim();
//       const url = 'https://www.amazon.com' + $(el).find('h2 a').attr('href');

//       if (title && price && url) {
//         productspagination.push([title, price, rating, url]);
//       }
//     });

//     // Insert scraped data into MySQL (Amazon RDS)
//     const insertQuery = 'INSERT INTO productspagination (title, price, rating, url) VALUES ?';
//     db.query(insertQuery, [productspagination], (err, result) => {
//       if (err) {
//         console.error('Error inserting data into MySQL (RDS):', err);
//       } else {
//         console.log('Data inserted successfully:', result.affectedRows);
//       }
//     });

//   } catch (error) {
//     console.error('Error scraping Amazon:', error);
//   }
// }

// // Endpoint to get products from MySQL with pagination and basic auth
// app.get('/api/productspagination', basicAuth, (req, res) => {
//   const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
//   const limit = 10; // Items per page
//   const offset = (page - 1) * limit;

//   const query = 'SELECT * FROM productspagination LIMIT ? OFFSET ?';
//   db.query(query, [limit, offset], (err, results) => {
//     if (err) {
//       return res.status(500).json({ error: 'Failed to retrieve productspagination' });
//     }

//     // Count total number of products for pagination metadata
//     const countQuery = 'SELECT COUNT(*) AS total FROM productspagination';
//     db.query(countQuery, (err, countResult) => {
//       if (err) {
//         return res.status(500).json({ error: 'Failed to count productspagination' });
//       }
      
//       const totalItems = countResult[0].total;
//       const totalPages = Math.ceil(totalItems / limit);

//       res.json({
//         currentPage: page,
//         totalPages: totalPages,
//         totalItems: totalItems,
//         data: results
//       });
//     });
//   });
// });

// // Start scraping Amazon once
// scrapeAmazon().then(() => {
//   console.log('Scraping completed.');
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });


const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3003;

// Basic Auth Credentials from .env file
const USERNAME = process.env.BASIC_AUTH_USERNAME;
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

// Middleware for Basic Authentication
function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === USERNAME && password === PASSWORD) {
    next();
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
}

// MySQL connection (Amazon RDS) using .env variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306 // Default to port 3306 if not provided
});

// Connect to MySQL (Amazon RDS)
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL (RDS):', err);
  } else {
    console.log('Connected to MySQL (RDS)');
  }
});

// Function to scrape Amazon and store data into MySQL
async function scrapeAmazon() {
  const totalPages = 24; // Adjust the total number of pages as needed
  const urlBase = 'https://www.amazon.com/s?k=laptops&page=';

  for (let page = 1; page <= totalPages; page++) {
    try {
      const url = `${urlBase}${page}`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
      });

      const $ = cheerio.load(data);
      const products = [];

      $('.s-main-slot .s-result-item').each((i, el) => {
        const title = $(el).find('h2 a span').text().trim();
        const price = $(el).find('.a-price span.a-offscreen').first().text().trim();
        const rating = $(el).find('.a-row span.a-icon-alt').text().trim();
        const url = 'https://www.amazon.com' + $(el).find('h2 a').attr('href');

        if (title && price && url) {
          products.push([title, price, rating, url]);
        }
      });

      // Insert scraped data into MySQL (Amazon RDS)
      const insertQuery = 'INSERT INTO productspagination (title, price, rating, url) VALUES ?';
      db.query(insertQuery, [products], (err, result) => {
        if (err) {
          console.error(`Error inserting data into MySQL (RDS) for page ${page}:`, err);
        } else {
          console.log(`Data inserted successfully for page ${page}:`, result.affectedRows);
        }
      });

      // Add a delay to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay of 1 second

    } catch (error) {
      console.error(`Error scraping page ${page}:`, error);
    }
  }
}

// Endpoint to get products from MySQL with pagination and basic auth
app.get('/api/productspagination', basicAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
  const limit = 21; // Items per page
  const offset = (page - 1) * limit;

  const query = 'SELECT * FROM productspagination LIMIT ? OFFSET ?';
  db.query(query, [limit, offset], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve products' });
    }

    // Count total number of products for pagination metadata
    const countQuery = 'SELECT COUNT(*) AS total FROM productspagination';
    db.query(countQuery, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to count products' });
      }
      
      const totalItems = countResult[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        data: results
      });
    });
  });
});

// Start scraping Amazon once
scrapeAmazon().then(() => {
  console.log('Scraping completed.');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
