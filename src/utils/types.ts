export interface Player {
    id: number;
    playerName: string;
    teamName: string;
    score: number;
}

export interface Commentator {
    id: number;
    commentatorName: string;
    xHandle: string;
    teamName: string;
}

export interface SnakeCommentator {
    id: number;
    commentator_name: string;
    x_handle: string;
    team_name: string;
}

export interface SnakePlayer {
    id: number;
    player_name: string;
    team_name: string;
    score: number;
}

export interface ScoreboardResponse {
    player_scores: SnakePlayer[];
    status: number;
}

export interface CommentatorResponse {
    commentator_info: SnakeCommentator[];
    status: number;
}

export interface UpdateData {
    playerScores: Player[];
    commentatorInfo: Commentator[];
}

export interface UpdateDataSnaked {
    player_scores: SnakePlayer[];
    commentator_info: SnakeCommentator[];
}