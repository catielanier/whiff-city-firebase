<script lang="ts">
  import { onMount } from "svelte";
  import type {
    Commentator,
    Player,
    UpdateData,
    GameInfo,
    QueuedMatch,
    ScoreboardsSimple,
    Teammate,
  } from "../utils/types";
  import {
    getDatabase,
    ref,
    onValue,
    get,
    update,
    set,
  } from "firebase/database";
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
  const isUserInput = writable<boolean>(false);

  const tournamentUrl = writable<string>("");
  const tournamentId = writable<string>("");
  const currentSetId = writable<string>("");
  const streamChannel = writable<string>("");
  const leftTeammates = writable<string[]>([]);
  const rightTeammates = writable<string[]>([]);

  const isLoading = writable<boolean>(false);
  const errMsg = writable<string | null>(null);

  const copyScene = (scene: string): void => {
    navigator.clipboard.writeText(
      `${window.location.origin}/${scene}/${$scoreboardId}`,
    );
  };

  const updateScoreboard = async (): Promise<void> => {
    isLoading.set(true);
    const updateInfo: UpdateData = {
      players: $players,
      commentators: $commentators,
      gameInfo: $gameInfo!,
      startGGUri: $tournamentUrl,
    };
    if (!updateInfo.players[0].score || updateInfo.players[0].score < 0)
      updateInfo.players[0].score = 0;
    if (!updateInfo.players[1].score || updateInfo.players[1].score < 0)
      updateInfo.players[1].score = 0;
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
      return {
        players: $players,
        commentators: $commentators,
        gameInfo: $gameInfo,
      };
    },
  );

  const debouncedUpdate = debounce(updateScoreboard, 3000);

  combined.subscribe(() => {
    if ($isUserInput) {
      debouncedUpdate();
      isUserInput.set(false);
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

  const rotateTeammates = (side: string): void => {
    let prevPlayer: Teammate | undefined;
    switch (side) {
      case "left":
        prevPlayer = {
          name: $players[0].playerName,
          isEliminated: false,
        };
        $players[0].teammates?.push(prevPlayer);
        $players[0].playerName = $players[0].teammates
          ? $players[0].teammates[0].name
          : "";
        $players[0].teammates?.shift();
        break;
      case "right":
        prevPlayer = {
          name: $players[1].playerName,
          isEliminated: false,
        };
        $players[1].teammates?.push(prevPlayer);
        $players[1].playerName = $players[1].teammates
          ? $players[1].teammates[0].name
          : "";
        $players[1].teammates?.shift();
        break;
      default:
        break;
    }
    updateScoreboard();
  };

  const eliminatePlayer = (side: string): void => {
    let prevPlayer: Teammate | undefined;
    switch (side) {
      case "left":
        prevPlayer = {
          name: $players[0].playerName,
          isEliminated: true,
        };
        $players[0].teammates?.push(prevPlayer);
        $players[0].playerName = $players[0].teammates
          ? $players[0].teammates[0].name
          : "";
        $players[0].teammates?.shift();
        break;
      case "right":
        prevPlayer = {
          name: $players[1].playerName,
          isEliminated: true,
        };
        $players[1].teammates?.push(prevPlayer);
        $players[1].playerName = $players[1].teammates
          ? $players[1].teammates[0].name
          : "";
        $players[1].teammates?.shift();
        break;
      default:
        break;
    }
    updateScoreboard();
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
        const streamIndex: number = res.data.data.streamQueue.findIndex(
          (x: any) => {
            return (
              x.stream.streamName.toLowerCase() === $streamChannel.toLowerCase()
            );
          },
        );
        const set = res.data.data.streamQueue[streamIndex].sets[0];
        const leftPlayerXHandleIndex: number =
          set.slots[0].entrant.participants[0].user.authorizations?.findIndex(
            (x) => {
              return x.type === "TWITTER";
            },
          ) ?? -1;
        const leftPlayerXHandle: string =
          leftPlayerXHandleIndex > -1
            ? set.slots[0].entrant.participants[0].user.authorizations[
                leftPlayerXHandleIndex
              ].externalUsername
            : "";
        const rightPlayerXHandleIndex: number =
          set.slots[1].entrant.participants[0].user.authorizations?.findIndex(
            (x) => {
              return x.type === "TWITTER";
            },
          ) ?? -1;
        const rightPlayerXHandle: string =
          rightPlayerXHandleIndex > -1
            ? set.slots[1].entrant.participants[0].user.authorizations[
                rightPlayerXHandleIndex
              ].externalUsername
            : "";
        const leftPlayer: Player = {
          id: 1,
          playerName: set.slots[0].entrant.name.replace(/^.*\s\|\s/, ""),
          teamName: set.slots[0].entrant.name.includes(" | ")
            ? set.slots[0].entrant.name.replace(/\|.*/, "")
            : "",
          score: 0,
          isLosersBracket: false,
          startId:
            res.data.data.streamQueue[streamIndex].sets[0].slots[0].entrant.id,
          xHandle: leftPlayerXHandle,
          pronouns:
            set.slots[0].entrant.participants[0].user.genderPronoun ?? "",
          seed: set.slots[0].entrant.initialSeedNum,
          teammates: [],
        };
        const rightPlayer: Player = {
          id: 2,
          playerName: set.slots[1].entrant.name.replace(/^.*\s\|\s/, ""),
          teamName: set.slots[1].entrant.name.includes(" | ")
            ? set.slots[1].entrant.name.replace(/\|.*/, "")
            : "",
          score: 0,
          isLosersBracket: false,
          startId: set.slots[1].entrant.id,
          xHandle: rightPlayerXHandle,
          pronouns:
            set.slots[1].entrant.participants[0].user.genderPronoun ?? "",
          seed: set.slots[1].entrant.initialSeedNum,
          teammates: [],
        };
        $players[0] = leftPlayer;
        $players[1] = rightPlayer;
        currentSetId.set(set.id);
        updateStreamQueue(res.data.data.streamQueue[streamIndex].sets);
      })
      .finally(() => {
        if (shouldUpdateScoreboard) {
          updateScoreboard();
        }
      })
      .catch((err) => {
        errMsg.set(err.message);
      });
  };

  const updateStreamQueue = (sets: any[]): void => {
    const updateInfo: any = {
      streamQueue: [],
    };
    console.log("updating stream queue");
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
    set(reference, updateInfo.streamQueue)
      .then(() => {
        isLoading.set(false);
        console.log("set");
      })
      .catch(() => {
        errMsg.set("Error updating stream queue. Try again.");
        console.log("cannot set");
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

  const updateScore = (side: string, operand: "+" | "-"): void => {
    switch (side) {
      case "left":
        if (operand === "+") $players[0].score++;
        else $players[0].score--;
        break;
      case "right":
        if (operand === "+") $players[1].score++;
        else $players[1].score--;
        break;
    }
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
    if ($isTeams) {
      const oldLeftTeammates: string[] = $leftTeammates;
      const oldRightTeammates: string[] = $rightTeammates;
      leftTeammates.set(oldRightTeammates);
      rightTeammates.set(oldLeftTeammates);
    }
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
    get(reference).then((res) => {
      const data = res.val();
      if (data) {
        players.set(data.players);
        commentators.set(data.commentators);
        gameInfo.set(data.gameInfo);
        tournamentUrl.set(data.startGGUri);
        streamChannel.set(data.streamUrl);
        isTeams.set(data.isTeams);
      }
    });
  };

  const openStreamQueue = (e: Event): void => {
    e.preventDefault();
    window.open(`${window.location.origin}/queue/${$streamChannel}`);
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
    <div class="menu-wrapper">
      <div class="menu">
        <p>Select a scoreboard:</p>
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
        {#if $scoreboardId}
          <p>Tournament URL:</p>
          <input
            type="text"
            bind:value={$tournamentUrl}
            placeholder="Tournament URL"
          />
          <p>Game:</p>
          <select
            bind:value={$gameInfo.title}
            on:input={() => isUserInput.set(true)}
          >
            {#each games as game}
              <option value={game.data}>{game.name}</option>
            {/each}
          </select>
          <p>Round:</p>
          <input
            type="text"
            on:input={() => isUserInput.set(true)}
            bind:value={$gameInfo.round}
            class="round"
          />
        {/if}
      </div>
      {#if $scoreboardId}
        <div class="menu-controls">
          <button
            on:click={(e) => {
              e.preventDefault();
              !$tournamentId ? retrieveTournament() : retrieveStreamQueue();
            }}>Retrieve Stream Queue</button
          >
          <button on:click={submitResults}>Submit Match Results</button>
          <button on:click={openStreamQueue}>Launch Stream Queue</button>
        </div>
      {/if}
    </div>
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
        <h3>Players:</h3>
        <div class="players-wrapper">
          <div class="player-one">
            <div class="player-one-wrapper">
              <div class="player-info wrapper">
                <div class="team">
                  <p>Team:</p>
                  <input
                    type="text"
                    bind:value={$players[0].teamName}
                    on:input={() => isUserInput.set(true)}
                  />
                </div>
                <div class="player-name">
                  <p>Player Name:</p>
                  <input
                    type="text"
                    bind:value={$players[0].playerName}
                    on:input={() => isUserInput.set(true)}
                  />
                </div>
                {#if $isTeams && $players[0].teammates?.length}
                  <div class="teammates">
                    <p>Teammates:</p>
                    {#each $players[0].teammates as teammate}
                      <input
                        type="text"
                        bind:value={teammate.name}
                        on:input={() => isUserInput.set(true)}
                      />
                    {/each}
                  </div>
                {/if}
                {#if !$isTeams}
                  <div class="player-seed">
                    <p>Seed:</p>
                    <input
                      type="number"
                      bind:value={$players[0].seed}
                      on:input={() => isUserInput.set(true)}
                    />
                  </div>
                  <div class="player-pronouns">
                    <p>Pronouns:</p>
                    <input
                      type="text"
                      bind:value={$players[0].pronouns}
                      on:input={() => isUserInput.set(true)}
                    />
                  </div>
                  <div class="player-x-handle">
                    <p>Twitter/Bsky (Exclude @):</p>
                    <input
                      type="text"
                      on:input={() => isUserInput.set(true)}
                      bind:value={$players[0].xHandle}
                    />
                  </div>
                {/if}
                <div class="losers-bracket">
                  <p>Losers Bracket:</p>
                  <input
                    type="checkbox"
                    bind:checked={$players[0].isLosersBracket}
                    on:input={() => isUserInput.set(true)}
                  />
                </div>
              </div>
              <div class="score">
                <p>Score:</p>
                <div class="score-wrapper">
                  <div>
                    <input
                      type="number"
                      min="0"
                      bind:value={$players[0].score}
                      on:input={() => isUserInput.set(true)}
                    />
                    {#if $isTeams}
                      <button
                        on:click={() => {
                          rotateTeammates("left");
                        }}
                      >
                        Rotate
                      </button>
                      <button
                        on:click={() => {
                          eliminatePlayer("left");
                        }}
                      >
                        Eliminate
                      </button>
                    {/if}
                  </div>
                  <div class="number-buttons">
                    <button
                      class="plus"
                      on:click={() => {
                        updateScore("left", "+");
                        isUserInput.set(true);
                      }}
                    >
                      +
                    </button>
                    <button
                      class="minus"
                      on:click={() => {
                        updateScore("left", "-");
                        isUserInput.set(true);
                      }}
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="control-buttons">
            <button on:click={clearScores}>Clear Scores</button>
            <button on:click={swapSides}>Swap Sides</button>
            <button
              on:click={() => {
                copyScene("scoreboard");
              }}>Copy Scene</button
            >
          </div>
          <div class="player-two">
            <div class="player-two-wrapper">
              <div class="player-info wrapper">
                <div class="team">
                  <p>Team:</p>
                  <input
                    type="text"
                    bind:value={$players[1].teamName}
                    on:input={() => isUserInput.set(true)}
                  />
                </div>
                <div class="player-name">
                  <p>Player Name:</p>
                  <input
                    type="text"
                    bind:value={$players[1].playerName}
                    on:input={() => isUserInput.set(true)}
                  />
                </div>
                {#if $isTeams && $players[1].teammates?.length}
                  <div class="teammates">
                    <p>Teammates:</p>
                    {#each $players[1].teammates as teammate}
                      <input
                        type="text"
                        bind:value={teammate.name}
                        on:input={() => isUserInput.set(true)}
                      />
                    {/each}
                  </div>
                {/if}
                {#if !$isTeams}
                  <div class="player-seed">
                    <p>Seed:</p>
                    <input
                      type="number"
                      bind:value={$players[1].seed}
                      on:input={() => isUserInput.set(true)}
                    />
                  </div>
                  <div class="player-pronouns">
                    <p>Pronouns:</p>
                    <input
                      type="text"
                      bind:value={$players[1].pronouns}
                      on:input={() => isUserInput.set(true)}
                    />
                  </div>
                  <div class="player-x-handle">
                    <p>Twitter/Bsky (Exclude @):</p>
                    <input
                      type="text"
                      on:input={() => isUserInput.set(true)}
                      bind:value={$players[1].xHandle}
                    />
                  </div>
                {/if}
                <div class="losers-bracket">
                  <p>Losers Bracket:</p>
                  <input
                    type="checkbox"
                    bind:checked={$players[1].isLosersBracket}
                    on:input={() => isUserInput.set(true)}
                  />
                </div>
              </div>
              <div class="score">
                <p>Score:</p>
                <div class="score-wrapper">
                  <div>
                    <input
                      type="number"
                      min="0"
                      bind:value={$players[1].score}
                      on:input={() => isUserInput.set(true)}
                    />
                    {#if $isTeams}
                      <button on:click={() => rotateTeammates("right")}>
                        Rotate
                      </button>
                      <button on:click={() => eliminatePlayer("right")}>
                        Eliminate
                      </button>
                    {/if}
                  </div>
                  <div class="number-buttons">
                    <button
                      class="plus"
                      on:click={() => {
                        updateScore("right", "+");
                        isUserInput.set(true);
                      }}
                    >
                      +
                    </button>
                    <button
                      class="minus"
                      on:click={() => {
                        updateScore("right", "-");
                        isUserInput.set(true);
                      }}
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <h3>Commentators:</h3>
        <div class="commentator-info">
          <div class="commentator-one">
            <p>Left Commentator:</p>
            <div class="commentator-one-wrapper">
              <div class="team">
                <p>Team:</p>
                <input type="text" bind:value={$commentators[0].teamName} />
              </div>
              <div class="commentator-name">
                <p>Commentator Name:</p>
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
          <div class="control-buttons">
            <button on:click={swapCommentatorSides}>Swap Sides</button>
            <button
              on:click={() => {
                copyScene("commentators");
              }}>Copy Scene</button
            >
          </div>
          <div class="commentator-two">
            <p>Right Commentator:</p>
            <div class="commentator-two-wrapper">
              <div class="team">
                <p>Team:</p>
                <input
                  type="text"
                  bind:value={$commentators[1].teamName}
                  on:input={() => isUserInput.set(true)}
                />
              </div>
              <div class="commentator-name">
                <p>Commentator Name:</p>
                <input
                  type="text"
                  on:input={() => isUserInput.set(true)}
                  bind:value={$commentators[1].commentatorName}
                />
              </div>
              <div class="x-handle">
                <p>Twitter/Bsky (Exclude @):</p>
                <input
                  type="text"
                  on:input={() => isUserInput.set(true)}
                  bind:value={$commentators[1].xHandle}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .round {
    margin-bottom: 0 !important;
  }
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
    padding: 10px;
    border-radius: 5px;
    border: 2px solid #235ba8;
  }
  .players-wrapper {
    margin-bottom: 20px;
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 1fr 1fr 1fr;
  }

  p {
    margin: 0;
  }
  .commentator-info {
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 1.7fr 1fr 1.7fr;
  }
  .player-one-wrapper,
  .player-two-wrapper {
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 1fr 1fr;
  }

  .player-one-wrapper .player-info,
  .player-two-wrapper .player-info {
    width: 105px;
    margin-right: 15px;
  }
  .player-one-wrapper .player-info input,
  .player-two-wrapper .player-info input {
    width: 100%;
  }
  input[type="number"] {
    margin-right: 5px;
  }

  .losers-bracket {
    text-align: center;
  }

  .player-one-wrapper,
  .player-two-wrapper {
    grid-template-columns: 4fr 1fr;
  }

  .score-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 20px;
  }

  .score-wrapper input {
    font-size: 2.1rem;
    max-width: 2.7rem;
    padding: 20px 15px;
    -webkit-appearance: none;
    -moz-appearance: textfield;
    appearance: none;
    border: 1px solid red;
    text-align: center;
    border-radius: 5px;
  }

  .score-wrapper input::-moz-outer-spin-button,
  .score-wrapper input::-moz-inner-spin-button {
    display: none;
  }

  .score-wrapper input::-webkit-outer-spin-button,
  .score-wrapper input::-webkit-inner-spin-button {
    display: none;
  }

  .score-wrapper .number-buttons button {
    height: 40px;
    width: 40px;
    font-size: 1.3rem;
    font-weight: bold;
    padding: 0;
    text-align: center;
    color: black;
    margin-bottom: 0;
    margin-top: 0;
  }

  .score-wrapper button {
    width: 100%;
    font-size: 0.9rem;
    background: #c065ff;
    color: #280137;
    margin-bottom: 5px;
    margin-top: 5px;
  }

  .score-wrapper button.minus {
    background: yellow;
  }

  .score-wrapper button.plus {
    background: green;
  }
  .control-buttons {
    margin: 20px 10px;
  }

  .control-buttons button {
    margin-top: 15px;
    background: #c065ff;
    color: #280137;
    width: 100%;
  }

  select {
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
  .menu-wrapper {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 10px;
  }
  .menu-wrapper select {
    margin-bottom: 5px;
  }
  .menu-wrapper button {
    margin-top: 35px;
    background: #c065ff;
    color: #280137;
    width: 100%;
  }
</style>
