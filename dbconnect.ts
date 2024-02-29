import mysql from "mysql";

export const conn = mysql.createPool({
    connectionLimit: 10,
    host: "sql6.freemysqlhosting.net",
    user: "sql6687386",
    password: "Egfy6rvubc",
    database: "sql6687386"
  });