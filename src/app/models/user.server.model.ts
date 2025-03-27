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

const getAll = async (id: string): Promise<any> => {
    Logger.info("Getting details of user with id: " + id);
    const conn = await getPool().getConnection();
    const query = "SELECT * FROM user WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return result[0];
}

const getNames = async (id: string): Promise<any> => {
    Logger.info("Getting details of user with name: " + id);
    const conn = await getPool().getConnection();
    const query = "SELECT first_name, last_name FROM user WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return result[0];
}

const checkEmailExists = async (email: string): Promise<boolean> => {
    Logger.info("Checking if email exists: " + email);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM user WHERE email = ?";
    const [result] = await conn.query(query, [email]);
    await conn.release();
    return (result[0].count > 0);
}

const checkEmailExistsPatch = async (email: string, id: string): Promise<boolean> => {
    Logger.info("Checking email is unique for patch, email: " + email);
    const conn = await getPool().getConnection();
    const query = "SELECT id FROM user WHERE id != ? AND email = ?";
    const [result] = await conn.query(query, [id, email]);
    await conn.release();
    return result.length > 0;
}

const getPasswordFromEmail = async (email: string): Promise<string> => {
    Logger.info("Checking if email matches password: " + email);
    const conn = await getPool().getConnection();
    const query = "SELECT password FROM user WHERE email = ?";
    const [result] = await conn.query(query, [email]);
    await conn.release();
    return result[0].password;
}

const getPasswordFromId = async (id: string): Promise<string> => {
    Logger.info("Checking if user with id ${id} current password is correct");
    const conn = await getPool().getConnection();
    const query = "SELECT password FROM user WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return result[0].password;
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

const checkUserToken = async (token: string): Promise<boolean> => {
    Logger.info("Checking if a user is logged in");
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM user WHERE auth_token = ?";
    const [result] = await conn.query(query, [token])
    await conn.release();
    return (result[0].count > 0);
}

const compareUserToken = async (id: string, tokenParam: string): Promise<boolean> => {
    Logger.info(`Checking user ${id} is logged in`);
    const conn = await getPool().getConnection();
    const query = "SELECT auth_token FROM user WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    if (result.length === 0) {
        return false;
    }
    await conn.release();
    return (result[0].auth_token === tokenParam);
}

const removeUserToken = async (token: string): Promise<void> => {
    Logger.info("Removing auth token");
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET auth_token = null WHERE auth_token = ?"
    conn.query(query, [token]);
    await conn.release();
    return;
}

const checkUserExists = async (id: string): Promise<boolean> => {
    Logger.info("Checking if user exists with id: " + id);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM user WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return (result[0].count > 0);
}

const getIdByToken = async (token: string): Promise<string> => {
    Logger.info("Getting id linked with token: " + token);
    const conn = await getPool().getConnection();
    const query = "SELECT id FROM user WHERE auth_token = ?";
    const [result] = await conn.query(query, [token]);
    await conn.release();
    return result[0].id;
}

const updateEmail = async (email: string, id: string): Promise<void> => {
    Logger.info("Updating email of user with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET email = ? WHERE id = ?";
    await conn.query(query, [email, id]);
    await conn.release();
    return;
}

const updateFirstName = async (firstName: string, id: string): Promise<void> => {
    Logger.info("Updating first name of user with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET first_name = ? WHERE id = ?";
    await conn.query(query, [firstName, id]);
    await conn.release();
    return;
}

const updateLastName = async (lastName: string, id: string): Promise<void> => {
    Logger.info("Updating last name of user with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET last_name = ? WHERE id = ?";
    await conn.query(query, [lastName, id]);
    await conn.release();
    return;
}

const updatePassword = async (password: string, id: string): Promise<void> => {
    Logger.info("Updating password of user with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET password = ? WHERE id = ?";
    await conn.query(query, [password, id]);
    await conn.release();
    return;
}

export {insert, checkEmailExists, getPasswordFromEmail, establishUserToken, checkUserToken, removeUserToken, checkUserExists, getAll, getNames, compareUserToken, updateEmail, updatePassword, updateLastName, updateFirstName, getPasswordFromId, getIdByToken, checkEmailExistsPatch}
