import { ResultSetHeader } from "mysql2";
import Logger from "../../config/logger";
import { getPool } from "../../config/db";

const insert = async (email: string, firstName: string, lastName: string, password: string ): Promise<ResultSetHeader> => {
    Logger.info("Inserting to database user with " + email);
    const conn = await getPool().getConnection();
    const query = "INSERT INTO user (email, first_name, last_name, password) VALUES (?, ?, ?, ?)";
    const [result] = await conn.query(query, [email, firstName, lastName, password]);
    await conn.release();
    return result;
}

const checkEmailExists = async (email: string): Promise<boolean> => {
    Logger.info("Checking if email exists: " + email);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM user WHERE email = ?";
    const [result] = await conn.query(query, [email]);
    await conn.release();
    return (result[0].count > 0);
}

export {insert, checkEmailExists}
