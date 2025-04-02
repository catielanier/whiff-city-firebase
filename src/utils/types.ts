export interface Player {
  id: number;
  playerName: string;
  teamName: string;
  score: number;
  isLosersBracket: boolean;
  startId: string;
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
  gameInfo: GameInfo;
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

export interface GameInfo {
  title: string;
  round: string;
}

export interface GameData {
  name: string;
  data: string;
}

export interface QueuedPlayer {
  name: string;
  teamName: string;
}

export interface QueuedMatch {
  id: string;
  players: [QueuedPlayer, QueuedPlayer];
  game: string;
}

export interface Scoreboard {
  players: [Player, Player];
  commentators: Commentator[];
  gameInfo: GameInfo;
}

export interface Scoreboards {
  streamName: string;
  startGGUri: string;
  scoreboards: Scoreboard[];
}

export interface Queue {
  streamName: string;
  queue: QueuedMatch[];
}

