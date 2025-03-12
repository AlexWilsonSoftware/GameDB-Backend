import { ResultSetHeader } from "mysql2";
import Logger from "../../config/logger";
import { getPool } from "../../config/db";

const getAll = async (filters: {
    search?: string;
    genreIds?: number[];
    priceMin?: number;
    priceMax?: number;
    platformIds?: number[];
    creatorId?: number;
    reviewerId?: number;
    sortBy?: string;
    startIndex?: string;
    count?: string;
}): Promise<any> => {
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
        WHERE 1=1
    `;
    const params = [];
    if (filters.search) {
        query += ` AND title LIKE ?`;
        params.push(`%${filters.search}%`);
    }
    if (filters.genreIds && filters.genreIds.length > 0) {
        query += ` AND genre_id IN (${filters.genreIds.map(() => '?').join(',')})`;
        params.push(...filters.genreIds);
    }
    if (filters.priceMin !== undefined) {
        query += ` AND price >= ?`;
        params.push(filters.priceMin);
    }
    if (filters.priceMax !== undefined) {
        query += ` AND price <= ?`;
        params.push(filters.priceMax);
    }
    if (filters.creatorId !== undefined) {
        query += ` AND creator_id = ?`;
        params.push(filters.creatorId);
    }
    if (filters.reviewerId !== undefined) {
        query += ` AND id IN (SELECT game_id FROM game_review WHERE user_id = ?)`;
        params.push(filters.reviewerId);
    }
    query += ' GROUP BY g.id, g.title, g.genre_id, g.creator_id, u.first_name, u.last_name, g.creation_date, g.price'
    let sqlSortBy = "creation_date ASC";
    if (filters.sortBy !== undefined) {
        sqlSortBy = sortOptions[filters.sortBy];
    }
    query += ` ORDER BY ${sqlSortBy}`;
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
    const [countRows] = await conn.query(`SELECT COUNT(*) AS count FROM game`);
    const count = countRows[0].count;

    return { games, count };
}

export { getAll };
