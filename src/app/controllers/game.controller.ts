import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as games from "../models/game.server.model";
import * as users from "../models/user.server.model";
import * as schemas from "../resources/schemas.json";
import {validate} from "../services/validator";

const getAllGames = async(req: Request, res: Response): Promise<void> => {
    const sortOptions: Record<string, string> = { // copied from game.server.model
        "ALPHABETICAL_ASC": "title ASC",
        "ALPHABETICAL_DESC": "title DESC",
        "PRICE_ASC": "price ASC",
        "PRICE_DESC": "price DESC",
        "CREATED_ASC": "creation_date ASC",
        "CREATED_DESC": "creation_date DESC",
        "RATING_ASC": "rating ASC",
        "RATING_DESC": "rating DESC"
    };
    try {
        Logger.info(req.query);
        if (!(await validate(schemas.game_search, req.query))) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (req.query.sortBy !== undefined && !(String(req.query.sortBy) in sortOptions)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if((req.query.ownedByMe === 'true' || req.query.wishlistedByMe === 'true') && (req.header('X-Authorization') === null || !await users.checkUserToken(req.header('X-Authorization')))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (req.query.genreIds !== undefined && Array.isArray(req.query.genreIds)) {
            for (const id of req.query.genreIds) {
                if (isNaN(Number(id))) {
                    res.statusMessage = 'Bad Request';
                    res.status(400).send();
                    return;
                }
            }
        } else if (req.query.genreIds !== undefined && isNaN(Number(req.query.genreIds))) {
            res.statusMessage = 'Bad Request';
            res.status(400).send();
            return;
        }
        if (req.query.platformIds !== undefined && Array.isArray(req.query.platformIds)) {
            for (const id of req.query.platformIds) {
                if (!await games.checkPlatformExists(id)) {
                    res.statusMessage = 'Bad Request';
                    res.status(400).send();
                    return;
                }
            }
        } else if (req.query.platformIds !== undefined && !await games.checkPlatformExists(req.query.platformIds)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (req.query.price !== undefined && Number(req.query.price) < 0) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (req.query.creatorId !== undefined && isNaN(Number(req.query.creatorId))) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        let userId;
        if (req.query.ownedByMe === 'true' || req.query.wishlistedByMe === 'true') {
            userId = await users.getIdByToken(req.header('X-Authorization'));
        }
        const allGames = await games.getAll(req.query, userId);
        res.status(200).send(allGames);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getGame = async(req: Request, res: Response): Promise<void> => {
    try {
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (!await games.checkGameExists(req.params.id)) {
            res.statusMessage = "No game with id";
            res.status(404).send();
            return;
        }
        res.status(200).send(await games.get(req.params.id));
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGame = async(req: Request, res: Response): Promise<void> => {
    try {
        if (!await users.checkUserToken(req.header('X-Authorization'))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const validation = await validate(schemas.game_post, req.body);
        if (validation !== true) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (!await games.checkGenreExists(req.body.genreId)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (req.body.price === undefined) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (await games.checkTitleExists(req.body.title)) {
            res.statusMessage = "Game title already exists";
            res.status(403).send();
            return;
        }
        if (req.body.platformIds !== undefined && Array.isArray(req.body.platformIds)) {
            if (req.body.platformIds.length === 0) {
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }
            for (const platformId of req.body.platformIds) {
                if (!await games.checkPlatformExists(platformId)) {
                    res.statusMessage = 'Bad Request';
                    res.status(400).send();
                    return;
                }
            }
        } else if (req.query.platformIds !== undefined && !await games.checkPlatformExists(req.query.platformIds)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        const creatorId = await users.getIdByToken(req.header('X-Authorization'));
        const id = await games.add(req.body.title, req.body.description, req.body.genreId, req.body.price, req.body.platformIds, creatorId);
        res.status(201).send({"gameId": id});
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


const editGame = async(req: Request, res: Response): Promise<void> => {
    try {
        if (req.header("X-Authorization") === undefined) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        if (!await users.checkUserToken(req.header('X-Authorization'))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const creatorId = await users.getIdByToken(req.header('X-Authorization'));
        const validation = await validate(schemas.game_patch, req.body);
        if (validation !== true) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (!await games.checkCreatorOfGame(req.params.id, creatorId)) {
            res.statusMessage = "Only the creator of a game may change it";
            res.status(403).send();
            return;
        }
        if (!await games.checkGenreExists(req.body.genreId)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (req.body.price === undefined) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (await games.checkTitleExistsPatch(req.body.title, req.params.id)) {
            res.statusMessage = "Game title already exists";
            res.status(403).send();
            return;
        }
        if (req.body.platformIds !== undefined && Array.isArray(req.body.platformIds)) {
            if (req.body.platformIds.length === 0) {
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }
            for (const platformId of req.body.platformIds) {
                if (!await games.checkPlatformExists(platformId)) {
                    res.statusMessage = 'Bad Request';
                    res.status(400).send();
                    return;
                }
            }
        } else if (req.query.platformIds !== undefined && !await games.checkPlatformExists(req.query.platformIds)) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (req.body.title !== undefined) {
            await games.updateTitle(req.body.title, req.params.id)
        }
        if (req.body.description !== undefined) {
            await games.updateDescription(req.body.description, req.params.id)
        }
        if (req.body.genreId !== undefined) {
            await games.updateGenreId(req.body.genreId, req.params.id)
        }
        if (req.body.price !== undefined) {
            await games.updatePrice(req.body.price, req.params.id)
        }
        if (req.body.platforms !== undefined) {
            await games.updatePlatforms(req.body.platforms, req.params.id)
        }
        res.status(201).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const deleteGame = async(req: Request, res: Response): Promise<void> => {
    try {
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (!await games.checkGameExists(req.params.id)) {
            res.statusMessage = "No game found with id"
            res.status(404).send()
            return;
        }
        if (!await users.checkUserToken(req.header('X-Authorization'))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const userId = await users.getIdByToken(req.header('X-Authorization'));
        if (!await games.checkCreatorOfGame(req.params.id, userId)) {
            res.statusMessage = "Only the creator of a game may delete it";
            res.status(403).send();
            return;
        }
        if (await games.checkNumReviews(req.params.id)) {
            res.statusMessage = "Can not delete a game with one or more reviews";
            res.status(403).send();
            return;
        }
        await games.deleteGame(req.params.id)
        res.status(200).send()
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


const getGenres = async(req: Request, res: Response): Promise<void> => {
    try {
        res.status(200).send(await games.getGenres());
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getPlatforms = async(req: Request, res: Response): Promise<void> => {
    try {
        res.status(200).send(await games.getPlatforms());
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


export {getAllGames, getGame, addGame, editGame, deleteGame, getGenres, getPlatforms};