<script lang="ts">
  import { writable } from "svelte/store";
  import type { Scoreboard, ScoreboardsSimple, Player } from "../utils/types";
  import { onMount } from "svelte";
  import { get, getDatabase, onValue, push, ref, set } from "firebase/database";
  import { firebase } from "../utils/firebase";
  import { Link } from "svelte-routing";

  const database = getDatabase(firebase);
  const reference = ref(database, "/scoreboards");
  const streamUrl = writable<string>("");
  const scoreboardName = writable<string>("");
  const isTeams = writable<boolean>(false);
  const scoreboardId = writable<string | undefined>(undefined);
  const scoreboards = writable<ScoreboardsSimple[]>([]);
  const success = writable<boolean>(false);
  const error = writable<string | null>(null);
  const blankPlayer: Player = {
    id: 0,
    teamName: "",
    playerName: "",
    score: 0,
    isLosersBracket: false,
    startId: "",
  };

  const submitScoreboard = (): void => {
    if (!$scoreboardId) {
      const scoreboardData: Scoreboard = {
        scoreboardName: $scoreboardName,
        streamUrl: $streamUrl,
        isTeams: $isTeams,
        players: [blankPlayer, blankPlayer],
        commentators: [],
        gameInfo: {
          title: "sf6",
          round: "",
        },
      };
      scoreboardData.players[1].id = 1;
      push(reference, scoreboardData)
        .then(() => {
          success.set(true);
          error.set(null);
        })
        .catch((error) => {
          success.set(false);
          error.set(error.message);
        });
    } else {
      const scoreboardRef = ref(database, `/scoreboards/${$scoreboardId}`);
      set(scoreboardRef, {
        scoreboardName: $scoreboardName,
        streamUrl: $streamUrl,
        isTeams: $isTeams,
      })
        .then(() => {
          success.set(true);
          error.set(null);
        })
        .catch((error) => {
          success.set(false);
          error.set(error.message);
        });
    }
  };

  const getScoreboard = (): void => {
    const scoreboardRef = ref(database, `/scoreboards/${$scoreboardId}`);
    get(scoreboardRef)
      .then((res) => {
        const data = res.val();
        if (data) {
          scoreboardName.set(data.scoreboardName);
          streamUrl.set(data.streamUrl);
          isTeams.set(data.isTeams);
        }
      })
      .catch((error) => {
        success.set(false);
        error.set(error.message);
      });
  };

  onMount(() => {
    onValue(reference, (res) => {
      const data = res.val();
      if (data) {
        const scoreboardList: ScoreboardsSimple[] = Object.keys(data).map(
          (key) => ({
            id: key,
            scoreboardName: data[key].scoreboardName,
          }),
        );
        scoreboards.set(scoreboardList);
      }
    });
  });
</script>

<div>
  <Link to="/" class="back-button">Back</Link>
  {#if $success}
    <p class="success">Scoreboard updated successfully!</p>
  {:else if $error}
    <p class="error"><span>Error:</span> {$error}</p>
  {/if}
  <h1>Scoreboard manager</h1>
  <select bind:value={$scoreboardId} on:change={getScoreboard}>
    <option value="" disabled selected>Select a scoreboard</option>
    {#each $scoreboards as scoreboard}
      <option value={scoreboard.id}>{scoreboard.scoreboardName}</option>
    {/each}
  </select>
  <form
    on:submit={(e) => {
      e.preventDefault();
      submitScoreboard();
    }}
  >
    <div>
      <label>
        <input type="checkbox" bind:checked={$isTeams} />
        Is this a teams scoreboard?
      </label>
    </div>
    <div>
      <label>
        Stream URL:
        <input type="text" bind:value={$streamUrl} />
      </label>
    </div>
    <div>
      <label>
        Scoreboard Name:
        <input type="text" bind:value={$scoreboardName} />
      </label>
    </div>
    <div>
      <button type="submit">
        {#if $scoreboardId}
          Update Scoreboard
        {:else}
          Add Scoreboard
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .back-button {
    display: inline-block;
    padding: 15px 10px;
    position: fixed;
    top: 10px;
    left: 10px;
    text-decoration: none;
    color: #007bff;
    background-color: #f8f9fa;
    border-radius: 5px;
    font-weight: bold;
  }
</style>
