import type { GameData } from "./types";

export const games: readonly GameData[] = Object.freeze([
  {
    name: "Blazblue Central Fiction",
    width: 309,
    data: "bbcf",
  },
  {
    name: "Fatal Fury: City of the Wolves",
    width: 450,
    data: "cotw",
  },
  {
    name: "Granblue Fantasy Versus",
    width: 350,
    data: "gbvs",
  },
  {
    name: "Guilty Gear Strive",
    width: 600,
    data: "ggst",
  },
  {
    name: "Street Fighter 6",
    width: 458,
    data: "sf6",
  },
  {
    name: "Street Fighter III: 3rd Strike",
    width: 600,
    data: "3s",
  },
  {
    name: "Super Street Fighter II Turbo",
    width: 600,
    data: "st",
  },
  {
    name: "Tekken 8",
    width: 505,
    data: "tekken8",
  },
  {
    name: "Under Night In-Birth II [Sys:Celes]",
    width: 600,
    data: "uni2",
  },
  {
    name: "Virtua Fighter 5 R.E.V.O.",
    width: 640,
    data: "vf5",
  },
  {
    name: "Killer Instinct",
    width: 600,
    data: "ki",
  },
  {
    name: "Nidhogg",
    width: 600,
    data: "nidhogg",
  },
  {
    name: "ARMS",
    width: 505,
    data: "arms",
  },
  {
    name: "Lethal League Blaze",
    width: 430,
    data: "llb",
  },
]);

export const header = Object.freeze({
  "Content-Type": "application/json",
  Authorization: `Bearer ${import.meta.env.VITE_START_GG_KEY}`,
});
