<script lang="ts">
  import { onMount } from "svelte";
  import type {
    Commentator,
    Player,
    UpdateData,
    GameInfo,
    QueuedMatch,
    ScoreboardsSimple,
  } from "../utils/types";
  import { getDatabase, ref, onValue, get, update } from "firebase/database";
  import { derived, writable } from "svelte/store";
  import { firebase } from "../utils/firebase";
  import { games, header } from "../utils/data";
  import axios from "axios";
  import { streamQueueQuery, tournamentQuery } from "../utils/gqlQueries";
  import debounce from "debounce";
  import { Link } from "svelte-routing";

  const players = writable<Player[]>([]);
  const commentators = writable<Commentator[]>([]);
  const scoreboardId = writable<String>("");
  const scoreboards = writable<ScoreboardsSimple[]>([]);
  const gameInfo = writable<GameInfo>({ title: "sf6", round: "" });
  const isTeams = writable<boolean>(false);

  const tournamentUrl = writable<string>("");
  const tournamentId = writable<string>("");
  const currentSetId = writable<string>("");
  const streamChannel = writable<string>("");

  const isLoading = writable<boolean>(false);
  const errMsg = writable<string | null>(null);

  const updateScoreboard = async (): Promise<void> => {
    isLoading.set(true);
    const updateInfo: UpdateData = {
      players: $players,
      commentators: $commentators,
      gameInfo: $gameInfo!,
    };
    if (!updateInfo.players[0].score) updateInfo.players[0].score = 0;
    if (!updateInfo.players[1].score) updateInfo.players[1].score = 0;
    const db = getDatabase(firebase);
    const reference = ref(db, `/scoreboards/${$scoreboardId}`);
    update(reference, updateInfo)
      .then((_) => {
        isLoading.set(false);
      })
      .catch((_) => {
        errMsg.set("Error updating info. Try again.");
        isLoading.set(false);
      });
  };

  const combined = derived(
    [players, commentators, gameInfo],
    ([$players, $commentators, $gameInfo]) => {
      return null;
    },
  );

  const debouncedUpdate = debounce(updateScoreboard, 3000);

  combined.subscribe(() => {
    if ($players && $players.length >= 2) {
      debouncedUpdate();
    }
  });

  const generateSlug = (): string => {
    return $tournamentUrl.replace("https://www.start.gg/", "");
  };

  const retrieveTournament = (): void => {
    isLoading.set(true);
    const slug = generateSlug();
    axios
      .post(
        "https://api.start.gg/gql/alpha",
        {
          query: tournamentQuery,
          variables: { slug },
        },
        {
          headers: header,
        },
      )
      .then((res) => {
        tournamentId.set(res.data.data.tournament.id);
        retrieveStreamQueue();
      });
  };

  const retrieveStreamQueue = (
    shouldUpdateScoreboard: boolean = true,
  ): void => {
    isLoading.set(true);
    axios
      .post(
        "https://api.start.gg/gql/alpha",
        {
          query: streamQueueQuery,
          variables: { tournamentId: $tournamentId },
        },
        {
          headers: header,
        },
      )
      .then((res) => {
        const leftPlayer: Player = {
          id: 1,
          playerName:
            res.data.data.streamQueue[0].sets[0].slots[0].entrant.name.replace(
              /^.*\s\|\s/,
              "",
            ),
          teamName:
            res.data.data.streamQueue[0].sets[0].slots[0].entrant.name.includes(
              " | ",
            )
              ? res.data.data.streamQueue[0].sets[0].slots[0].entrant.name.replace(
                  /\s\|\s.*/,
                  "",
                )
              : "",
          score: 0,
          isLosersBracket: false,
          startId: res.data.data.streamQueue[0].sets[0].slots[0].entrant.id,
        };
        const rightPlayer: Player = {
          id: 2,
          playerName:
            res.data.data.streamQueue[0].sets[0].slots[1].entrant.name.replace(
              /^.*\s\|\s/,
              "",
            ),
          teamName:
            res.data.data.streamQueue[0].sets[0].slots[1].entrant.name.includes(
              " | ",
            )
              ? res.data.data.streamQueue[0].sets[0].slots[1].entrant.name.replace(
                  /\s\|\s.*/,
                  "",
                )
              : "",
          score: 0,
          isLosersBracket: false,
          startId: res.data.data.streamQueue[0].sets[0].slots[1].entrant.id,
        };
        $players = [leftPlayer, rightPlayer];
        $currentSetId = res.data.data.streamQueue[0].sets[0].id;
        if (shouldUpdateScoreboard) updateScoreboard();
        updateStreamQueue(res.data.data.streamQueue[0].sets);
      })
      .catch((err) => {
        errMsg.set(err.message);
      });
  };

  const updateStreamQueue = (sets: any[]): void => {
    const updateInfo: any = {
      streamQueue: [],
    };
    sets.forEach((set: any) => {
      const match: QueuedMatch = {
        id: set.id,
        game: set.event.videogame.name,
        players: [
          {
            name: set.slots[0].entrant.name.replace(/^.*\s\|\s/, ""),
            teamName: (set.slots[0].entrant.name =
              set.slots[0].entrant.name.includes("|")
                ? set.slots[0].entrant.name.replace(/\s*\|\s*/g, "")
                : ""),
          },
          {
            name: set.slots[1].entrant.name.replace(/^.*\s\|\s/, ""),
            teamName: (set.slots[1].entrant.name =
              set.slots[1].entrant.name.includes("|")
                ? set.slots[1].entrant.name.replace(/\s*\|\s*/g, "")
                : ""),
          },
        ],
      };
      updateInfo.streamQueue.push(match);
    });
    const db = getDatabase(firebase);
    const reference = ref(db, `streamQueue/${$streamChannel}`);
    update(reference, updateInfo.streamQueue)
      .then((_) => {
        isLoading.set(false);
      })
      .catch((_) => {
        errMsg.set("Error updating stream queue. Try again.");
        isLoading.set(false);
      });
  };

  const clearScores = (e: Event): void => {
    e.preventDefault();
    $players.forEach((player: Player): void => {
      player.score = 0;
      player.isLosersBracket = false;
    });
    updateScoreboard();
  };

  const updateScore = (variable: number, operand: "+" | "-"): void => {
    variable = operand === "+" ? (variable += 1) : (variable -= 1);
  };

  const submitResults = (e: Event): void => {
    e.preventDefault();
    const gameData: any = [];
    const winnerId: string =
      $players[0].score > $players[1].score
        ? $players[0].startId
        : $players[1].startId;
    const loserId: string =
      $players[0].score < $players[1].score
        ? $players[0].startId
        : $players[1].startId;
    const winnerScore: number = Math.max($players[0].score, $players[1].score);
    const loserScore: number = Math.min($players[0].score, $players[1].score);
    let gameNum: number = 1;
    for (let i = 0; i < loserScore; i++) {
      const set: any = {
        winnerId: loserId,
        gameNum,
      };
      gameData.push(set);
      gameNum++;
    }
    for (let i = 0; i < winnerScore; i++) {
      const set: any = {
        winnerId: winnerId,
        gameNum,
      };
      gameData.push(set);
      gameNum++;
    }
    const setData: any = {
      setId: currentSetId,
      winnerId,
      gameData,
    };
    const query = `mutation ReportSetMutation($setId: ID!, $winnerId: ID, $gameData: [BracketSetGameDataInput]) {
            reportBracketSet(setId: $setId, winnerId: $winnerId, gameData: $gameData) { id }
        }`;
    axios
      .post(
        "https://api.start.gg/gql/alpha",
        {
          query,
          variables: setData,
        },
        {
          headers: header,
        },
      )
      .then((_) =>
        $tournamentId ? retrieveStreamQueue() : retrieveTournament(),
      )
      .catch((err) => errMsg.set(err.message));
  };

  const swapSides = (e: Event): void => {
    e.preventDefault();
    const oldLeft: Player = { ...$players[0] };
    const oldRight: Player = { ...$players[1] };
    oldLeft.id = 2;
    oldRight.id = 1;
    $players[0] = oldRight;
    $players[1] = oldLeft;
    updateScoreboard();
  };

  const swapCommentatorSides = (e: Event): void => {
    e.preventDefault();
    const oldLeft: Commentator = { ...$commentators[0] };
    const oldRight: Commentator = { ...$commentators[1] };
    oldLeft.id = 2;
    oldRight.id = 1;
    $commentators[0] = oldRight;
    $commentators[1] = oldLeft;
    updateScoreboard();
  };

  const getScoreboard = (): void => {
    const database = getDatabase(firebase);
    const reference = ref(database, `/scoreboards/${$scoreboardId}`);
    onValue(reference, (res) => {
      const data = res.val();
      if (data) {
        players.set(data.players);
        commentators.set(data.commentators);
        gameInfo.set(data.gameInfo);
        tournamentUrl.set(data.tournamentUrl);
        streamChannel.set(data.streamChannel);
        isTeams.set(data.isTeams);
      }
    });
  };

  onMount(async () => {
    const database = getDatabase(firebase);
    const reference = ref(database, "/scoreboards");
    isLoading.set(true);
    get(reference).then((res) => {
      const data = res.val();
      if (data) {
        const scoreboardList: ScoreboardsSimple[] = Object.keys(data).map(
          (key) => ({
            id: key,
            scoreboardName: data[key].scoreboardName,
          }),
        );
        scoreboards.set(scoreboardList);
      } else {
        scoreboards.set([]);
      }
      isLoading.set(false);
    });
  });

  setInterval(() => {
    if ($tournamentId) {
      retrieveStreamQueue(false);
    }
  }, 30000);
</script>

<div class="update">
  <div class="add-button">
    <Link to="/manager">Add/Edit Scoreboards</Link>
  </div>
  {#if $scoreboards.length >= 1}
    <select
      name="scoreboards"
      bind:value={$scoreboardId}
      on:change={getScoreboard}
    >
      <option value="" disabled selected>Select a scoreboard</option>
      {#each $scoreboards as scoreboard}
        <option value={scoreboard.id}>{scoreboard.scoreboardName}</option>
      {/each}
    </select>
  {:else if $scoreboards.length === 0}
    <p class="error">No scoreboards found. Please create a scoreboard first.</p>
  {/if}
  {#if $players.length && $commentators.length && $gameInfo}
    <div class="wrapper">
      <form
        on:submit={(e) => {
          e.preventDefault();
          updateScoreboard();
        }}
      >
        <input
          type="text"
          bind:value={$tournamentUrl}
          placeholder="Tournament URL"
        />
        <div class="button-grid top">
          <button on:click={clearScores}>Clear Scores</button>
          <button on:click={swapSides}>Swap Player Sides</button>
          <!--<button on:click={swapCommentatorSides}>Swap Commentator Sides</button>-->
          <button
            on:click={(e) => {
              e.preventDefault();
              !tournamentId ? retrieveTournament() : retrieveStreamQueue();
            }}>Retrieve Stream Queue</button
          >
          <button on:click={submitResults}>Submit Match Results</button>
        </div>
        <div class="game-info">
          <p>Game:</p>
          <select bind:value={$gameInfo.title}>
            {#each games as game}
              <option value={game.data}>{game.name}</option>
            {/each}
          </select>
          <p>Round:</p>
          <input type="text" bind:value={$gameInfo.round} />
        </div>
        <div class="player-info">
          <div class="player-one">
            <p>Left Player:</p>
            <div class="player-one-wrapper">
              <div class="team">
                <p>Team:</p>
                <input type="text" bind:value={$players[0].teamName} />
              </div>
              <div class="player-name">
                <p>Player Name:</p>
                <input type="text" bind:value={$players[0].playerName} />
              </div>
              <div class="losers-bracket">
                <p>Losers Bracket:</p>
                <input
                  type="checkbox"
                  bind:checked={$players[0].isLosersBracket}
                />
              </div>
              <div class="score">
                <p>Score:</p>
                <div class="score-wrapper">
                  <div>
                    <input type="number" bind:value={$players[0].score} />
                  </div>
                  <div>
                    <button
                      on:click={() => {
                        updateScore($players[0].score, "+");
                      }}
                    >
                      +
                    </button>
                    <button
                      on:click={() => {
                        updateScore($players[0].score, "-");
                      }}
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="player-two">
            <p>Right Player:</p>
            <div class="player-two-wrapper">
              <div class="team">
                <p>Team:</p>
                <input type="text" bind:value={$players[1].teamName} />
              </div>
              <div class="player-name">
                <p>Player Name:</p>
                <input type="text" bind:value={$players[1].playerName} />
              </div>
              <div class="score">
                <p>Score:</p>
                <input type="number" bind:value={$players[1].score} />
              </div>
              <div class="losers-bracket">
                <p>Losers Bracket:</p>
                <input
                  type="checkbox"
                  bind:checked={$players[1].isLosersBracket}
                />
              </div>
            </div>
          </div>
        </div>
        <div class="commentator-info">
          <div class="commentator-one">
            <p>Left Commentator:</p>
            <div class="commentator-one-wrapper">
              <div class="team">
                <p>Team:</p>
                <input type="text" bind:value={$commentators[0].teamName} />
              </div>
              <div class="commentator-name">
                <p>Player Name:</p>
                <input
                  type="text"
                  bind:value={$commentators[0].commentatorName}
                />
              </div>
              <div class="x-handle">
                <p>Twitter/Bsky (Exclude @):</p>
                <input type="text" bind:value={$commentators[0].xHandle} />
              </div>
            </div>
          </div>
          <div class="commentator-two">
            <p>Right Commentator:</p>
            <div class="commentator-two-wrapper">
              <div class="team">
                <p>Team:</p>
                <input type="text" bind:value={$commentators[1].teamName} />
              </div>
              <div class="commentator-name">
                <p>Player Name:</p>
                <input
                  type="text"
                  bind:value={$commentators[1].commentatorName}
                />
              </div>
              <div class="x-handle">
                <p>Twitter/Bsky (Exclude @):</p>
                <input type="text" bind:value={$commentators[1].xHandle} />
              </div>
            </div>
          </div>
        </div>
        <div class="button-grid">
          <button type="submit">Update</button>
          <button on:click={clearScores}>Clear Scores</button>
          <button on:click={swapSides}>Swap Player Sides</button>
          <button on:click={swapCommentatorSides}>Swap Commentator Sides</button
          >
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .update {
    text-align: left;
    max-width: 720px;
    margin: 0 auto;
  }
  .player-one,
  .commentator-one {
    padding: 10px;
    border-radius: 5px;
    border: 2px solid #ffed97;
  }
  .player-two,
  .commentator-two {
    margin-top: 15px;
    padding: 10px;
    border-radius: 5px;
    border: 2px solid #235ba8;
  }
  .player-info {
    margin-bottom: 20px;
  }
  p {
    margin: 0;
  }
  .player-one-wrapper,
  .player-two-wrapper,
  .commentator-one-wrapper,
  .commentator-two-wrapper {
    display: grid;
    grid-gap: 5px;
  }

  .losers-bracket {
    text-align: center;
  }

  .player-one-wrapper,
  .player-two-wrapper {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }

  .commentator-one-wrapper,
  .commentator-two-wrapper {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .button-grid {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    grid-gap: 15px;
  }
  .button-grid.top {
    margin-bottom: 20px;
  }
  select {
    margin-bottom: 20px;
  }
  .game-info input[type="text"] {
    margin-bottom: 20px;
  }
  .add-button {
    display: inline-block;
    padding: 15px 10px;
    position: fixed;
    top: 10px;
    left: 10px;
    text-decoration: none;
    background-color: red;
    border-radius: 5px;
    font-weight: bold;
  }
  :global(.add-button a) {
    color: white;
  }
</style>
