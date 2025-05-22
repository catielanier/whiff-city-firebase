export interface Player {
  id: number;
  playerName: string;
  teamName: string;
  score: number;
  seed: number | undefined;
  pronouns: string;
  isLosersBracket: boolean;
  startId: string;
  teammates: Teammate[] | undefined;
  xHandle: string;
  country: string | undefined;
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
  startGGUri: string | undefined;
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
  scoreboardName: string;
  streamUrl: string;
  isTeams: boolean;
  startGGUri: string | undefined;
}

export interface Teammate {
  name: string;
  isEliminated: boolean;
}

export interface Scoreboards {
  startGGUri: string;
  scoreboards: Scoreboard[];
}

export interface ScoreboardsSimple {
  scoreboardName: string;
  id: string;
}

export interface Queue {
  streamName: string;
  queue: QueuedMatch[];
}

export interface CountryList {
  label: string;
  value: string;
}
