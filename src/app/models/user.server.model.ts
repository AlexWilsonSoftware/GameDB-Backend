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

const checkEmailMatchesPassword = async (email: string, password: string): Promise<boolean> => {
    Logger.info("Checking if email matches password: " + email);
    const conn = await getPool().getConnection();
    const query = "SELECT password FROM user WHERE email = ?";
    const [result] = await conn.query(query, [email]);
    await conn.release();
    return result[0].password === password;
}

const establishUserToken = async (email: string, token: string): Promise<number> => {
    Logger.info("Establishing user token in database for user: " + email);
    const conn = await getPool().getConnection();
    const query = "SELECT * FROM user WHERE email = ?";
    const [result] = await conn.query(query, [email]);
    const query2 = "UPDATE user SET auth_token = ? WHERE email = ?";
    conn.query(query2, [token, email]);
    await conn.release();
    return result[0].id;
}

const checkUserToken = async (): Promise<boolean> => {
    Logger.info("Checking if a user is logged in");
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM user WHERE auth_token is not null";
    const [result] = await conn.query(query, [])
    await conn.release();
    return (result[0].count > 0);
}

const removeUserToken = async (): Promise<void> => {
    Logger.info("Removing auth token");
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET auth_token = null WHERE auth_token is not null"
    conn.query(query, []);
    await conn.release();
    return;
}

export {insert, checkEmailExists, checkEmailMatchesPassword, establishUserToken, checkUserToken, removeUserToken}
