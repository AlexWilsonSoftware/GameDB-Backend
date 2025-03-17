import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as games from "../models/game.server.model";
import * as gameReviews from '../models/game.review.model';
import * as users from "../models/user.server.model";
import * as schemas from "../resources/schemas.json";
import {validate} from "../services/validator";



const getGameReviews = async(req: Request, res: Response): Promise<void> => {
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
        res.status(200).send(await gameReviews.getReviews(req.params.id));
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGameReview = async(req: Request, res: Response): Promise<void> => {
    try {
        if (await validate(schemas.game_review_post, req.body) !== true) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (req.body.rating === undefined) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
        if (req.body.rating < 1 || req.body.rating > 10) {
            res.statusMessage = "Bad Request";
            res.status(400).send()
            return;
        }
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
        if (await games.checkCreatorOfGame(req.params.id, userId)) {
            res.statusMessage = "Cannot review your own game.";
            res.status(403).send();
            return;
        }
        if (await gameReviews.hasUserReviewed(userId, req.params.id)) {
            res.statusMessage = "Can only review a game once.";
            res.status(403).send();
            return;
        }
        await gameReviews.addReview(userId, req.params.id, req.body.rating, req.body.review);
        res.status(201).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}




export {getGameReviews, addGameReview};