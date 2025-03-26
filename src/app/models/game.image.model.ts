import { ResultSetHeader } from "mysql2";
import Logger from "../../config/logger";
import { getPool } from "../../config/db";

const checkGameHasImage = async (id: string): Promise<boolean> => {
    Logger.info("Checking game with " + id + " has image");
    const conn = await getPool().getConnection();
    const query = "SELECT image_filename FROM game WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return result[0].image_filename !== null;
}

const getImagePath = async (id: string): Promise<any> => {
    Logger.info("Getting image from game with id: " + id);
    const conn = await getPool().getConnection();
    const query = "SELECT image_filename FROM game WHERE id = ?";
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return result[0].image_filename;
}

const setGameImage = async (id: string, filename: string): Promise<void> => {
    Logger.info("Setting game image with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE game SET image_filename = ? WHERE id = ?";
    const [result] = await conn.query(query, [filename, id]);
    await conn.release();
    return;
}

export { checkGameHasImage, getImagePath, setGameImage };