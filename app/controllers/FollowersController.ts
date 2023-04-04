import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { Follower, User, knexInstance } from '../utils/globals';
import { craftError, errorCodes } from '../utils/error';

function getFollower(follows: string, followedBy: string){
    return knexInstance('Followers')
    .select('*')
    .where('follows', follows)
    .andWhere('followedBy', followedBy)
    .first();
}

function userExists(id: string){
    return knexInstance('Users')
    .select('*')
    .where('id', id)
    .first();
}

export class FollowersController{
    request(req: Request, res: Response, next: NextFunction){
        userExists(req.body.userId)
        .then((user: User) => {
            if (user){
                if (user.id == req.session.user!.id){
                    throw {
                        error: craftError(errorCodes.other, "Cannot follow yourself!"),
                        content: undefined,
                    }
                }
                return;
            }
            throw {
                error: craftError(errorCodes.notFound, "User does not exist!"),
                content: undefined,
            }
        })
        .then(() => getFollower(req.body.userId, req.session.user!.id))
        .then((follower: Follower) => {
            if (follower){
                let msg = follower.accepted ? "Already following!" : "Follow request already sent!";
                throw {
                    error: craftError(errorCodes.entityExists, msg),
                    content: undefined,
                }
            }else{
                let newFollower: Follower = {
                    follows: req.body.userId,
                    followedBy: req.session.user!.id,
                    accepted: false,
                }
                knexInstance('Followers')
                .insert(newFollower)
                .then(arr => {
                    if (arr.length === 0){
                        throw {
                            error: craftError(errorCodes.other, "Please try again!"),
                            content: undefined,
                        }
                    }else{
                        return res.status(200).json(newFollower);
                    }
                })
            }
        })
        .catch(err => {
            if (!err.error){
            console.error(err.message);
            const error = craftError(errorCodes.other, "Please try again!");
            return res.status(500).json({ error, content: undefined });
            }else{
                console.error(err.error.errorMsg);
                return res.status(404).json(err);
            }
        });
    }
}