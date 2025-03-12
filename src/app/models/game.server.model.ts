import { ResultSetHeader } from "mysql2";
import Logger from "../../config/logger";
import { getPool } from "../../config/db";

const getAll = async (filters: {
    q?: string;
    genreIds?: number[];
    price?: number;
    platformIds?: number[];
    creatorId?: number;
    reviewerId?: number;
    sortBy?: string;
    startIndex?: string;
    ownedByMe?: string;
    wishlistedByMe?: string;
    count?: string;
}, userId?: string): Promise<any> => {
    Logger.info("Getting filtered games");
    const conn = await getPool().getConnection();
    const sortOptions: Record<string, string> = {
        "ALPHABETICAL_ASC": "title ASC",
        "ALPHABETICAL_DESC": "title DESC",
        "PRICE_ASC": "price ASC",
        "PRICE_DESC": "price DESC",
        "CREATED_ASC": "creation_date ASC",
        "CREATED_DESC": "creation_date DESC",
        "RATING_ASC": "rating ASC",
        "RATING_DESC": "rating DESC"
    };
    let query = `
        SELECT
            g.id AS gameId,
            g.title,
            g.genre_id AS genreId,
            g.creator_id AS creatorId,
            u.first_name AS creatorFirstName,
            u.last_name AS creatorLastName,
            g.creation_date AS creationDate,
            g.price,
            COALESCE(AVG(gr.rating), 0) AS rating
        FROM game g
                 JOIN user u ON g.creator_id = u.id
                 LEFT JOIN game_platforms gp ON g.id = gp.game_id
                 LEFT JOIN platform p ON gp.platform_id = p.id
                 LEFT JOIN game_review gr ON g.id = gr.game_id
    `;
    if (filters.wishlistedByMe === 'true' && userId !== undefined) {
        query += '\nLEFT JOIN wishlist w ON w.game_id = g.id'
    }
    if (filters.ownedByMe === 'true' && userId !== undefined) {
        query += '\nLEFT JOIN owned o ON o.game_id = g.id'
    }
    query += '\nWHERE 1=1'
    const params = [];
    if (filters.q !== undefined) {
        query += ` AND LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)`;
        params.push('%' + filters.q + '%');
        params.push('%' + filters.q + '%');
    }
    if (filters.genreIds) {
        if (!Array.isArray(filters.genreIds)) {
            filters.genreIds = [filters.genreIds]; // Convert single value to array
        }
    }
    if (filters.genreIds && filters.genreIds.length > 0) {
        // Create the appropriate number of placeholders for genreIds
        const genrePlaceholders = filters.genreIds.map(() => '?').join(',');
        query += ` AND genre_id IN (${genrePlaceholders})`;
        // Push the values as separate parameters
        params.push(...filters.genreIds);
    }
    if (filters.platformIds) {
        if (!Array.isArray(filters.platformIds)) {
            filters.platformIds = [filters.platformIds]; // Convert single value to array
        }
    }
    if (filters.platformIds && filters.platformIds.length > 0) {
        // Create the appropriate number of placeholders for platformIds
        const genrePlaceholders = filters.platformIds.map(() => '?').join(',');
        query += ` AND platform_id IN (${genrePlaceholders})`;
        // Push the values as separate parameters
        params.push(...filters.platformIds);
    }

    if (filters.price !== undefined) {
        query += ` AND price <= ?`;
        params.push(filters.price);
    }
    if (filters.creatorId !== undefined) {
        query += ` AND creator_id = ?`;
        params.push(filters.creatorId);
    }
    if (filters.reviewerId !== undefined) {
        query += ` AND g.id IN (SELECT game_id FROM game_review WHERE user_id = ?)`;
        params.push(filters.reviewerId);
    }
    if (filters.wishlistedByMe === 'true') {
        query += ' AND w.user_id = ?';
        params.push(userId);
    }
    if (filters.ownedByMe === 'true') {
        query += ' AND o.user_id = ?';
        params.push(userId);
    }
    query += ' GROUP BY g.id, g.title, g.genre_id, g.creator_id, u.first_name, u.last_name, g.creation_date, g.price'
    let sqlSortBy = "creation_date ASC";
    if (filters.sortBy !== undefined) {
        sqlSortBy = sortOptions[filters.sortBy];
    }
    query += ` ORDER BY ${sqlSortBy}`;
    if (sqlSortBy !== 'creation_date ASC') {
        query += ', g.id ASC';
    }
    const [gamesBeforePaginaton] = await conn.query(query, params);
    const count = gamesBeforePaginaton.length;
    if (filters.startIndex !== undefined && filters.count !== undefined) {
        query += ` LIMIT ?, ?`;
        params.push(Number(filters.startIndex), Number(filters.count));
    } else if (filters.count !== undefined) {
        query += ` LIMIT ?`;
        params.push(filters.count);
    } else if (filters.startIndex !== undefined) {
        query += ' LIMIT ?, 1000000000000000';
        params.push(filters.startIndex);
    }
    Logger.info(query);
    const [games] = await conn.query(query, params);
    for (const game of games) {
        const [platforms] = await conn.query('SELECT platform_id FROM game_platforms WHERE game_id = ?', [game.gameId]);
        game.platformIds = platforms.map((row: any) => row.platform_id);

        // Convert creationDate to ISO 8601 format
        game.creationDate = game.creationDate.toISOString();
        game.rating = parseFloat(game.rating);
    }
    return { games, count };
}

const checkPlatformExists = async (platform: any): Promise<boolean> => {
    Logger.info("Check platform exists platform: " + platform);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM platform WHERE id = ?"
    const [result] = await conn.query(query, [platform]);
    return (result[0].count > 0);
}

export { getAll, checkPlatformExists };
