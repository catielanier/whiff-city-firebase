export interface Player {
    id: number;
    playerName: string;
    teamName: string;
    score: number;
    isLosersBracket: boolean;
}

export interface Commentator {
    id: number;
    commentatorName: string;
    xHandle: string;
    teamName: string;
}

export interface UpdateData {
    players: Player[];
    commentators: Commentator[];
}

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
}