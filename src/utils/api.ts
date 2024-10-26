import axios from "axios";
import type {Player, Commentator, ScoreboardResponse, CommentatorResponse} from "./types";
import {objectToCamel} from "ts-case-convert";

export const retrieveScoreboard: () => Promise<Player[]> = async (): Promise<Player[]> => {
    const { data } = await axios.get<ScoreboardResponse>('/api/scoreboard');
    return objectToCamel(data.player_scores)
}

export const retrieveCommentators: () => Promise<Commentator[]> = async (): Promise<Commentator[]> => {
    const { data } = await axios.get<CommentatorResponse>('/api/commentators');
    return objectToCamel(data.commentator_info);
}