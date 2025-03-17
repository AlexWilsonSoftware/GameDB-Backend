import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as games from "../models/game.server.model";
import * as gameImages from "../models/game.image.model";
import * as users from "../models/user.server.model";
import * as schemas from "../resources/schemas.json";
import {validate} from "../services/validator";
import * as userImages from "../models/user.image.model";
import fs from "mz/fs";
import path from "node:path";


const getImage = async (req: Request, res: Response): Promise<void> => {
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
        if (!await gameImages.checkGameHasImage(req.params.id)) {
            res.statusMessage = "Game has no image";
            res.status(404).send();
            return;
        }
        const imageName = await gameImages.getImagePath(req.params.id);
        let imageType = imageName.split(".")[1];
        if (imageType === 'jpg') {
            imageType = 'jpeg'
        }
        const imagePath = __dirname + "/../../../storage/images/" + imageName;
        const imageBuffer = fs.readFileSync(imagePath);
        res.set('Content-Type', 'image/' + imageType);
        res.status(200).send(imageBuffer);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const extention = req.header("Content-Type").split("/")[1];
        if (extention !== 'jpeg' && extention !== 'png' && extention !== 'gif' && extention !== undefined) {
            res.statusMessage = 'Bad Request';
            res.status(400).send();
            return;
        }
        if (isNaN(Number(req.params.id))) {
            res.statusMessage = 'Bad Request';
            res.status(400).send();
            return;
        }
        if (!await games.checkGameExists(req.params.id)) {
            res.statusMessage = 'No game found with id';
            res.status(404).send();
            return;
        }
        if (!req.header("X-Authorization") === undefined) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        if (!await users.checkUserToken(req.header("X-Authorization"))) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        const userId = await users.getIdByToken(req.header("X-Authorization"));
        if (!await games.checkCreatorOfGame(req.params.id, userId)) {
            res.statusMessage = 'Only the creator of a game can change the hero image';
            res.status(403).send();
            return;
        }
        const photoDir = __dirname + "/../../../storage/images/"
        const imageName = `uploaded_${Date.now()}.${extention}`
        const filePath = path.join(photoDir, imageName);
        try {
            fs.writeFileSync(filePath, req.body)
        } catch (err) {
            res.statusMessage = "Invalid image supplied";
            res.status(400).send()
            return;
        }
        if (await gameImages.checkGameHasImage(req.params.id)) {
            await gameImages.setGameImage(req.params.id, imageName);
            res.statusMessage = "Image updated";
            res.status(200).send();
            return;
        } else {
            await gameImages.setGameImage(req.params.id, imageName);
            res.statusMessage = "New image created";
            res.status(201).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


export {getImage, setImage};