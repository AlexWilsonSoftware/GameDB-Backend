import { ResultSetHeader } from "mysql2";
import Logger from "../../config/logger";
import { getPool } from "../../config/db";

const getReviews =  async (id: string) => {
    Logger.info("Getting reviews for game " + id);
    const conn = await getPool().getConnection();
    const query = "SELECT user_id as reviewerId, rating, review, u.first_name as reviewerFirstName,  u.last_name as reviewerLastName, timestamp FROM game_review g JOIN user u on u.id = g.user_id WHERE g.game_id = ? ORDER BY timestamp DESC"
    const [result] = await conn.query(query, [id]);
    await conn.release();
    return result;
}

const hasUserReviewed = async (userId: string, gameId: string): Promise<boolean> => {
    Logger.info("Checking if user " + userId + " has reviewd game " + gameId);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM game_review WHERE game_id = ? AND user_id = ?";
    const [result] = await conn.query(query, [gameId, userId]);
    await conn.release();
    return result[0].count > 0;
}

const addReview = async (userId: string, gameId: string, rating: string, review: string): Promise<void> => {
    Logger.info("Adding review to game " + gameId);
    const conn = await getPool().getConnection();
    const query = "INSERT INTO game_review (game_id, user_id, rating, review, timestamp) VALUES (?, ?, ?, ?, NOW())"
    await conn.query(query, [gameId, userId, rating, review]);
    await conn.release();
    return;
}

export {getReviews, hasUserReviewed, addReview};