const express = require("express");
const mysql = require("mysql2");
const axios = require("axios");
const path = require("path");

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const db = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "Vikas@123",
  database: "myDb",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.stack);
    return;
  }
  console.log("Connected to MySQL");
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/initialize-db", async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const transactions = response.data;
    const insertQuery =
      "INSERT INTO transactions (title, description, price, category, status, dateOfSale) VALUES ?";
    const values = transactions.map((transaction) => [
      transaction.title,
      transaction.description,
      transaction.price,
      transaction.category,
      transaction.status,
      transaction.dateOfSale,
    ]);

    db.query(insertQuery, [values], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err.stack);
        return res.status(500).send("Error initializing database");
      }
      res.send("Database initialized successfully");
    });
  } catch (error) {
    console.error("Error fetching data from API:", error);
    res.status(500).send("Error fetching data from API");
  }
});

app.get("/transactions", async (req, res) => {
  const { month = "03", search = "", page = 1, perPage = 10 } = req.query;
  const offset = (page - 1) * perPage;

  const query = `
    SELECT * FROM transactions
    WHERE MONTH(dateOfSale) = ?
    AND (title LIKE ? OR description LIKE ? OR price LIKE ?)
    LIMIT ? OFFSET ?
  `;
  const searchTerm = `%${search}%`;

  db.query(
    query,
    [
      month,
      searchTerm,
      searchTerm,
      searchTerm,
      parseInt(perPage),
      parseInt(offset),
    ],
    (err, results) => {
      if (err) {
        console.error("Error fetching transactions:", err.stack);
        return res.status(500).send("Error fetching transactions");
      }
      res.json(results);
    }
  );
});

app.get("/statistics", async (req, res) => {
  const { month = "03" } = req.query;

  const query = `
    SELECT
      SUM(price) AS totalSales,
      SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS soldItems,
      SUM(CASE WHEN status = 'not sold' THEN 1 ELSE 0 END) AS notSoldItems
    FROM transactions
    WHERE MONTH(dateOfSale) = ?
  `;

  db.query(query, [month], (err, results) => {
    if (err) {
      console.error("Error fetching statistics:", err.stack);
      return res.status(500).send("Error fetching statistics");
    }
    res.json(results[0]);
  });
});

app.get("/bar-chart", async (req, res) => {
  const { month = "03" } = req.query;

  const query = `
    SELECT
      CASE
        WHEN price BETWEEN 0 AND 100 THEN '0-100'
        WHEN price BETWEEN 101 AND 200 THEN '101-200'
        WHEN price BETWEEN 201 AND 300 THEN '201-300'
        WHEN price BETWEEN 301 AND 400 THEN '301-400'
        WHEN price BETWEEN 401 AND 500 THEN '401-500'
        WHEN price BETWEEN 501 AND 600 THEN '501-600'
        WHEN price BETWEEN 601 AND 700 THEN '601-700'
        WHEN price BETWEEN 701 AND 800 THEN '701-800'
        WHEN price BETWEEN 801 AND 900 THEN '801-900'
        WHEN price >= 901 THEN '901-above'
      END AS priceRange,
      COUNT(*) AS itemCount
    FROM transactions
    WHERE MONTH(dateOfSale) = ?
    GROUP BY priceRange
  `;

  db.query(query, [month], (err, results) => {
    if (err) {
      console.error("Error fetching bar chart data:", err.stack);
      return res.status(500).send("Error fetching bar chart data");
    }
    res.json(results);
  });
});

app.get("/pie-chart", async (req, res) => {
  const { month = "03" } = req.query;

  const query = `
    SELECT category AS categoryName, COUNT(*) AS itemCount
    FROM transactions
    WHERE MONTH(dateOfSale) = ?
    GROUP BY category
  `;

  db.query(query, [month], (err, results) => {
    if (err) {
      console.error("Error fetching pie chart data:", err.stack);
      return res.status(500).send("Error fetching pie chart data");
    }
    res.json(results);
  });
});

app.get("/combined-data", async (req, res) => {
  const { month = "03" } = req.query;

  try {
    const transactionsPromise = axios.get(
      `http://localhost:${port}/transactions?month=${month}`
    );
    const statisticsPromise = axios.get(
      `http://localhost:${port}/statistics?month=${month}`
    );
    const barChartPromise = axios.get(
      `http://localhost:${port}/bar-chart?month=${month}`
    );
    const pieChartPromise = axios.get(
      `http://localhost:${port}/pie-chart?month=${month}`
    );

    const [transactionsData, statisticsData, barChartData, pieChartData] =
      await Promise.all([
        transactionsPromise,
        statisticsPromise,
        barChartPromise,
        pieChartPromise,
      ]);

    const combinedData = {
      transactions: transactionsData.data,
      statistics: statisticsData.data,
      barChartData: barChartData.data,
      pieChartData: pieChartData.data,
    };

    res.json(combinedData);
  } catch (error) {
    console.error("Error fetching combined data:", error);
    res.status(500).send("Error fetching combined data");
  }
});

app.get("/", (req, res) => {
  const { month = "03" } = req.query;

  axios
    .get(`http://localhost:${port}/transactions?month=${month}`)
    .then((response) => {
      const transactions = response.data;

      res.render("index", { transactions, selectedMonth: month });
    })
    .catch((error) => {
      console.error("Error fetching transactions:", error);
      res.status(500).send("Error fetching transactions");
    });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
