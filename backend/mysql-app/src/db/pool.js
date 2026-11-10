import mysql from "mysql2/promise";
import { env } from "../config/env.js";

// timezone "Z": every DATETIME is read and written as UTC. All timestamps are produced in Node,
// so results never depend on the MySQL server's time zone.
export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  connectionLimit: 10,
  waitForConnections: true,
  enableKeepAlive: true,
  timezone: "Z",
});
