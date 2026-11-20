import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "./pool.js";

/** Values allowed as SQL placeholders (?). */
export type SqlParam = string | number | boolean | Date | null;

/**
 * Runs a SELECT and returns the rows typed as Row.
 * Constraint: Row must be an object type (one row = one object), so query<string> is rejected.
 */
export async function query<Row extends object>(sql: string, params: SqlParam[] = []): Promise<Row[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as Row[];
}

/** Runs INSERT / UPDATE / DELETE and returns the result header (affectedRows, insertId). */
export async function exec(sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}
