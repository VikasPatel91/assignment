CREATE DATABASE myDb;
use myDb;
SELECT * FROM transactions; 
SELECT DISTINCT status FROM transactions;
DESCRIBE transactions;
ALTER TABLE transactions ADD COLUMN status VARCHAR(20);
UPDATE transactions
SET status = 'sold'
WHERE some_condition;
SET SQL_SAFE_UPDATES=0;
UPDATE transactions
SET status = 'sold'
WHERE status = 'sold item'; 
SELECT
  SUM(price) AS totalSales,
  SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS soldItems,
  SUM(CASE WHEN status = 'not sold' THEN 1 ELSE 0 END) AS notSoldItems
FROM transactions
WHERE MONTH(dateOfSale) = 3;

SELECT DISTINCT status FROM transactions;
UPDATE transactions
SET status = 'not sold'
WHERE status IS NULL;

