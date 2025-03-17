import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as games from "../models/game.server.model";
import * as users from "../models/user.server.model";
import * as gameActions from "../models/game.action.model"
import * as schemas from "../resources/schemas.json";
import {validate} from "../services/validator";


const addGameToWishlist = async(req: Request, res: Response): Promise<void> => {
    try {
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (req.header('X-Authorization') === null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (!await games.checkGameExists(req.params.id)) {
            res.statusMessage = "No game with id";
            res.status(404).send();
            return;
        }
        if (!await users.checkUserToken(req.header('X-Authorization'))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const userId = await users.getIdByToken(req.header('X-Authorization'));
        if (await games.checkCreatorOfGame(req.params.id, userId)) {
            res.statusMessage = "Can not wishlist a game you created";
            res.status(403).send()
            return;
        }
        if (await gameActions.checkOwnsGame(userId, req.params.id)) {
            res.statusMessage = "Can not wishlist a game you have marked as owned"
            res.status(403).send()
            return;
        }
        await gameActions.addToWishlist(userId, req.params.id)
        res.status(200).send();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const removeGameFromWishlist = async(req: Request, res: Response): Promise<void> => {
    try {
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (req.header('X-Authorization') === null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (!await games.checkGameExists(req.params.id)) {
            res.statusMessage = "No game with id";
            res.status(404).send();
            return;
        }
        if (!await users.checkUserToken(req.header('X-Authorization'))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const userId = await users.getIdByToken(req.header('X-Authorization'));
        if (!await gameActions.checkWishlist(userId, req.params.id)) {
            res.statusMessage = "Can not unwishlist a game you do not currently wishlist"
            res.status(403).send()
            return;
        }
        await gameActions.unwishlist(userId, req.params.id);
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGameToOwned = async(req: Request, res: Response): Promise<void> => {
    try {
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (req.header('X-Authorization') === null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (!await games.checkGameExists(req.params.id)) {
            res.statusMessage = "No game with id";
            res.status(404).send();
            return;
        }
        if (!await users.checkUserToken(req.header('X-Authorization'))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const userId = await users.getIdByToken(req.header('X-Authorization'));
        if (await games.checkCreatorOfGame(req.params.id, userId)) {
            res.statusMessage = "Can not mark a game you created as owned";
            res.status(403).send()
            return;
        }
        await gameActions.unwishlist(userId, req.params.id);
        await gameActions.markAsOwned(userId, req.params.id);
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const removeGameFromOwned = async(req: Request, res: Response): Promise<void> => {
    try {
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (req.header('X-Authorization') === null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        if (!await games.checkGameExists(req.params.id)) {
            res.statusMessage = "No game with id";
            res.status(404).send();
            return;
        }
        if (!await users.checkUserToken(req.header('X-Authorization'))) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const userId = await users.getIdByToken(req.header('X-Authorization'));
        if (!await gameActions.checkOwnsGame(userId, req.params.id)) {
            res.statusMessage = "Can not unmark a game you do not currently own"
            res.status(403).send()
            return;
        }
        await gameActions.unown(userId, req.params.id);
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {addGameToWishlist, removeGameFromWishlist, addGameToOwned, removeGameFromOwned};