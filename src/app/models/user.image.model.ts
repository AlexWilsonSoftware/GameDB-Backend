import { ResultSetHeader } from "mysql2";
import Logger from "../../config/logger";
import { getPool } from "../../config/db";

const checkUserHasImage = async (id: string) => {
    Logger.info("Checking usr has image, user id: " + id);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM user WHERE id = ? AND image_filename is not null";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return (result[0].count > 0);
}

const getImagePath = async (id: string): Promise<any> => {
    Logger.info("Getting image with id: " + id);
    const conn = await getPool().getConnection();
    const query = "SELECT image_filename FROM user WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return result[0].image_filename;
}

const setUserImage = async (id: string, filename: string): Promise<void> => {
    Logger.info("Setting image with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET image_filename = ? WHERE id = ?";
    const [result] = await conn.query(query, [filename, id]);
    await conn.release();
    return;
}

const removeUserImage = async (id: string): Promise<void> => {
    Logger.info("Setting image with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE user SET image_filename = null WHERE id = ?";
    await conn.query(query, [id]);
    await conn.release();
    return;
}

export {checkUserHasImage, getImagePath, setUserImage, removeUserImage}