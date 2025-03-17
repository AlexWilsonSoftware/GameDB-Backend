import { ResultSetHeader } from "mysql2";
import Logger from "../../config/logger";
import { getPool } from "../../config/db";

const checkOwnsGame = async (userId: string, gameId: string): Promise<boolean> => {
    Logger.info("Checking user " + userId + " owns game " + gameId);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM owned WHERE user_id = ? AND game_id = ?"
    const [result] = await conn.query(query, [userId, gameId]);
    await conn.release();
    return result[0].count > 0;
}

const addToWishlist = async (userId: string, gameId: string): Promise<void> => {
    Logger.info("Adding game " + gameId + " to wishlist for user " + userId);
    const conn = await getPool().getConnection();
    const query = "INSERT INTO wishlist (game_id, user_id) VALUES (?, ?)"
    await conn.query(query, [gameId, userId]);
    await conn.release();
    return;
}

const checkWishlist = async (userId: string, gameId: string): Promise<boolean> => {
    Logger.info("Checking user " + userId + " has wishlisted game " + gameId);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM wishlist WHERE user_id = ? AND game_id = ?"
    const [result] = await conn.query(query, [userId, gameId]);
    await conn.release();
    return result[0].count > 0;
}

const unwishlist = async (userId: string, gameId: string): Promise<void> => {
    Logger.info("Removing game " + gameId + " from wishlist for user " + userId);
    const conn = await getPool().getConnection();
    const query = "DELETE FROM wishlist WHERE user_id = ? AND game_id = ?"
    await conn.query(query, [userId, gameId]);
    await conn.release();
    return;
}

const markAsOwned = async (userId: string, gameId: string): Promise<void> => {
    Logger.info("Marking game " + gameId + " as owned by user " + userId);
    const conn = await getPool().getConnection();
    const query = "INSERT INTO owned (user_id, game_id) VALUES (?, ?)";
    await conn.query(query, [userId, gameId]);
    await conn.release();
    return;
}

const unown = async (userId: string, gameId: string): Promise<void> => {
    Logger.info("Removing game " + gameId + " from owned games for user " + userId);
    const conn = await getPool().getConnection();
    const query = "DELETE FROM owned WHERE user_id = ? AND game_id = ?"
    await conn.query(query, [userId, gameId]);
    await conn.release();
    return;
}

export { checkOwnsGame, addToWishlist, checkWishlist, unwishlist, markAsOwned, unown };