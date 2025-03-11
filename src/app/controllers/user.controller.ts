import {Request, Response} from "express";
import Logger from '../../config/logger';
import {validate} from "../services/validator";
import * as users from "../models/user.server.model";
import * as schemas from "../resources/schemas.json";
import {establishUserToken} from "../models/user.server.model";


const register = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST create user with email: ${req.body.email}`);
    const validation = await validate(schemas.user_register, req.body);
    if (validation !== true) {
        res.statusMessage = 'Bad Request: ' + validation.message;
        res.status(400).send();
        return;
    }
    try {
        const emailExists = await users.checkEmailExists(req.body.email);
        if (emailExists) {
            res.statusMessage = 'Email already exists';
            res.status(403).send();
            return;
        }

        const result = await users.insert(req.body.email, req.body.firstName, req.body.lastName, req.body.password);
        res.status(201).send({userId: result.insertId});
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    const randToken = require('rand-token');
    Logger.http(`POST login with email: ${req.body.email}`);
    const validation = await validate(schemas.user_login, req.body);
    if (validation !== true) {
        res.statusMessage = 'Invalid information';
        res.status(400).send();
        return;
    }
    const emailExists = await users.checkEmailExists(req.body.email);
    if (!emailExists) {
        res.statusMessage = 'Incorrect email/password';
        res.status(401).send();
        return;
    }
    const passwordMatches = await users.checkEmailMatchesPassword(req.body.email, req.body.password);
    if (!passwordMatches) {
        res.statusMessage = 'Incorrect email/password';
        res.status(401).send();
        return;
    }
    try {
        const authToken = randToken.generate(32);
        const id = await establishUserToken(req.body.email, authToken);
        res.status(200).send({userId: id, token: authToken});
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST logout with email: ${req.body.email}`);
    const token = req.header("X-Authorization");
    const isLoggedIn = await users.checkUserToken(token);
    if (!isLoggedIn) {
        res.statusMessage = 'Cannot log out if you are not authenticated';
        res.status(401).send();
        return;
    }
    try {
        await users.removeUserToken(token);
        res.status(200).send();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET view with email: ${req.body.email}`);
    const id = req.params.id;
    const loggedIn = await users.compareUserToken(id, req.header("X-Authorization"));
    if (isNaN(Number(id))) {
        res.statusMessage = 'Bad Request';
        res.status(400).send();
        return;
    }
    const userExists = await users.checkUserExists(id);
    if (!userExists) {
        res.statusMessage = 'No user with specified ID';
        res.status(404).send();
        return;
    }
    try {
        if (loggedIn) {
            const result = await users.getAll(id);
            res.status(200).send({"email": result.email, "firstName": result.first_name, "lastName": result.last_name});
            return
        } else {
            const result = await users.getNames(id);
            res.status(200).send({"firstName": result.first_name, "lastName": result.last_name});
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const email = req.body?.email;
    const firstName = req.body?.firstName;
    const lastName = req.body?.lastName;
    const password = req.body?.password;
    const currentPassword = req.body?.currentPassword;
    const token = req.header("X-Authorization");
    try {
        if (isNaN(Number(id))) {
            res.statusMessage = 'Bad Request';
            res.status(400).send();
            return;
        }
        if (!(await validate(schemas.user_edit, req.body) === true)) {
            res.statusMessage = 'Bad request'
            res.status(400).send();
            return;
        }
        if (!await users.checkUserToken(token)) {
            res.statusMessage = 'Unauthorized';
            res.status(401).send();
            return;
        }
        if (!await users.compareUserToken(id, token)) {
            res.statusMessage = "Can not edit another user's information";
            res.status(403).send();
            return;
        }
        if (await users.checkEmailExists(req.body.email)) {
            res.statusMessage = 'Email is already in use';
            res.status(403).send();
            return;
        }
        if (password !== undefined && currentPassword === undefined) {
            res.statusMessage = 'Bad Request';
            res.status(400).send();
            return;
        }
        if (password !== undefined && currentPassword !== undefined && password === currentPassword) {
            res.statusMessage = 'Identical current and new passwords';
            res.status(403).send();
            return;
        }
        if (!await users.checkUserExists(id)) {
            res.statusMessage = 'Not Found';
            res.status(404).send();
            return;
        }
        if (password !== undefined && currentPassword !== undefined && !await users.checkPasswordWithId(id, currentPassword)) {
            res.statusMessage = 'Invalid currentPassword';
            res.status(401).send();
            return;
        }
        if (email !== undefined) {
            await users.updateEmail(email, id);
        }
        if (firstName !== undefined) {
            await users.updateFirstName(firstName, id);
        }
        if (lastName !== undefined) {
            await users.updateLastName(lastName, id);
        }
        if (password !== undefined && currentPassword !== undefined) {
            await users.updatePassword(password, id);
        }
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {register, login, logout, view, update}