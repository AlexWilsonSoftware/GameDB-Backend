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
    await conn.release();
    return { games, count };
}

const get = async (id: string): Promise<any> => {
    Logger.info("Getting details of game with id: " + id)
    const conn = await getPool().getConnection();
    const gameTableQuery = 'SELECT g.id AS gameId, g.title, g.genre_id AS genreId, g.creator_id AS creatorId, u.first_name AS creatorFirstName, u.last_name AS creatorLastName, g.price, g.creation_date AS creationDate, g.description FROM game g JOIN user u ON g.creator_id = u.id WHERE g.id = ?';
    const [gameTableResult] = await conn.query(gameTableQuery, [id]);
    const averageRatingQuery = 'SELECT CAST(ROUND(AVG(rating), 1) AS FLOAT) AS rating FROM game_review WHERE game_id = ?';
    const [averageRatingResult] = await conn.query(averageRatingQuery, [id]);
    const numOwnersQuery = 'SELECT COUNT(*) as numberOfOwners FROM owned WHERE game_id = ?';
    const [numOwnersResult] = await conn.query(numOwnersQuery, [id]);
    const numWishlistsQuery = 'SELECT COUNT(*) as numberOfWishlists FROM wishlist WHERE game_id = ?';
    const [numWishlistsResult] = await conn.query(numWishlistsQuery, [id]);
    const platformIdsQuery = 'SELECT GROUP_CONCAT(platform_id) AS platformIds FROM game_platforms WHERE game_id = ?';
    const [platformIdsResult] = await conn.query(platformIdsQuery, [id]);
    conn.release();
    return {
        ...gameTableResult[0],
        rating: averageRatingResult[0].rating,
        numberOfOwners: numOwnersResult[0].numberOfOwners,
        numberOfWishlists: numWishlistsResult[0].numberOfWishlists,
        platformIds: platformIdsResult[0].platformIds
            ? platformIdsResult[0].platformIds.split(',').map(Number)
            : []
    };
}

const add = async (title: string, description: string, genreId: string, price: string, platformIds: any, creatorId: string): Promise<string> => {
    Logger.info("Adding game: " + title);
    const conn = await getPool().getConnection();
    const query = "INSERT INTO game (title, description, genre_id, price, creation_date, creator_id) VALUES (?, ?, ?, ?, NOW(), ?)"
    const [result] = await conn.query(query, [title, description, genreId, price, creatorId]);
    Logger.info(result);
    const id = result.insertId;
    const platformQuery = "INSERT INTO game_platforms (game_id, platform_id) VALUES (?, ?)"
    if (Array.isArray(platformIds) && platformIds.length > 0) {
        for (const platformId of platformIds) {
            await conn.query(platformQuery, [id, platformId]);
        }
    } else if (platformIds !== undefined) {
        await conn.query(platformQuery, [id, platformIds]);
    }
    await conn.release();
    return id;
}

const checkPlatformExists = async (platform: any): Promise<boolean> => {
    Logger.info("Check platform exists platform: " + platform);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM platform WHERE id = ?"
    const [result] = await conn.query(query, [platform]);
    await conn.release();
    return (result[0].count > 0);
}

const checkGenreExists = async (genre: string): Promise<boolean> => {
    Logger.info("Check genre: " + genre);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM genre WHERE id = ?"
    const [result] = await conn.query(query, [genre]);
    await conn.release();
    return (result[0].count > 0);
}

const checkTitleExists = async (title: string): Promise<boolean> => {
    Logger.info("Checking title is unique, title: " + title);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM game WHERE title = ?";
    const [result] = await conn.query(query, [title]);
    await conn.release();
    return (result[0].count > 0);
}

const checkGameExists = async (gameId: string): Promise<boolean> => {
    Logger.info("Checking game exists: " + gameId);
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM game WHERE id = ?";
    const [result] = await conn.query(query, [gameId]);
    await conn.release();
    return (result[0].count > 0);
}

const updateTitle = async (title: string, id: string): Promise<void> => {
    Logger.info("Updating title of game with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE game SET title = ? WHERE id = ?";
    await conn.query(query, [title, id]);
    await conn.release();
    return;
}

const updateDescription = async (description: string, id: string): Promise<void> => {
    Logger.info("Updating description of game with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE game SET description = ? WHERE id = ?";
    await conn.query(query, [description, id]);
    await conn.release();
    return;
}

const updateGenreId = async (genreId: string, id: string): Promise<void> => {
    Logger.info("Updating genre of game with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE game SET genre_id = ? WHERE id = ?";
    await conn.query(query, [genreId, id]);
    await conn.release();
    return;
}

const updatePlatforms = async (platforms: any, id: string): Promise<void> => {
    Logger.info("Updating platforms of game with id: " + id);
    const conn = await getPool().getConnection();
    const removePreviousRows = "DELETE FROM game_platforms WHERE game_id = ?"
    await conn.query(removePreviousRows, [id]);
    const platformQuery = "INSERT INTO game_platforms (game_id, platform_id) VALUES (?, ?)";
    if (Array.isArray(platforms) && platforms.length > 0) {
        for (const platformId of platforms) {
            await conn.query(platformQuery, [id, platformId]);
        }
    } else if (platforms !== undefined) {
        await conn.query(platformQuery, [id, platforms]);
    }
    await conn.release();
    return;
}

const updatePrice = async (price: string, id: string): Promise<void> => {
    Logger.info("Updating price of game with id: " + id);
    const conn = await getPool().getConnection();
    const query = "UPDATE game SET price = ? WHERE id = ?"
    await conn.query(query, [price, id]);
    await conn.release();
    return;
}

const checkCreatorOfGame = async (gameId: string, userId: string): Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = "SELECT creator_id FROM game WHERE id = ?";
    const [result] = await conn.query(query, [gameId]);
    await conn.release();
    return result[0].creator_id === userId;
}

const checkNumReviews = async (gameId: string): Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = "SELECT COUNT(*) as count FROM game_review WHERE game_id = ?";
    const [result] = await conn.query(query, [gameId]);
    await conn.release();
    return result[0].count > 0;
}

const deleteGame = async (gameId: string): Promise<void> => {
    Logger.info("Deleting game with id: " + gameId);
    const conn = await getPool().getConnection();
    const queryPlatform = "DELETE FROM game_platforms WHERE game_id = ?";
    await conn.query(queryPlatform, [gameId]);
    const queryFinal = "DELETE FROM game WHERE id = ?";
    await conn.query(queryFinal, [gameId]);
    await conn.release();
    return;
}

export { getAll, checkPlatformExists, checkGenreExists, checkTitleExists, add, checkGameExists, get, updateTitle, updateDescription, updateGenreId, updatePlatforms, updatePrice, checkCreatorOfGame, checkNumReviews, deleteGame };
