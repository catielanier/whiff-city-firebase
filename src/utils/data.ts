import type { GameData } from "./types";

export const games: readonly GameData[] = Object.freeze([
  {
    name: "Blazblue Central Fiction",
    data: "bbcf",
  },
  {
    name: "Fatal Fury: City of the Wolves",
    data: "cotw",
  },
  {
    name: "Granblue Fantasy Versus",
    data: "gbvs",
  },
  {
    name: "Guilty Gear Strive",
    data: "ggst",
  },
  {
    name: "Street Fighter 6",
    data: "sf6",
  },
  {
    name: "Street Fighter III: 3rd Strike",
    data: "3s",
  },
  {
    name: "Super Street Fighter II Turbo",
    data: "st",
  },
  {
    name: "Tekken 8",
    data: "tekken8",
  },
  {
    name: "Under Night In-Birth II [Sys:Celes]",
    data: "uni2",
  },
  {
    name: "Virtua Fighter 5 R.E.V.O.",
    data: "vf5",
  },
  {
    name: "Killer Instinct",
    data: "ki",
  },
  {
    name: "Nidhogg",
    data: "nidhogg",
  },
  {
    name: "ARMS",
    data: "arms",
  },
]);

export const header = Object.freeze({
  "Content-Type": "application/json",
  Authorization: `Bearer ${import.meta.env.VITE_START_GG_KEY}`,
});

