<script lang="ts">
  import axios from "axios";
  import debounce from "debounce";
  import { get, getDatabase, ref, set, update } from "firebase/database";
  import { onMount } from "svelte";
  import { Link } from "svelte-routing";
  import { derived, writable } from "svelte/store";
  import { games, header } from "../utils/data";
  import { firebase } from "../utils/firebase";
  import { streamQueueQuery, tournamentQuery } from "../utils/gqlQueries";
  import type {
    Commentator,
    GameInfo,
    Player,
    QueuedMatch,
    QueuedPlayer,
    ScoreboardsSimple,
    Teammate,
    UpdateData,
  } from "../utils/types";

  const players = writable<Player[]>([]);
  const commentators = writable<Commentator[]>([]);
  const scoreboardId = writable<string>("");
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

  let awaitingNextSetAfterId: string | null = null;
  let isRetrievingStreamQueue = false;

  const copyScene = (scene: string): void => {
    navigator.clipboard.writeText(
      `${window.location.origin}/${scene}/${$scoreboardId}`
    );
  };

  const updateScoreboard = async (): Promise<boolean> => {
    if (!$scoreboardId || $players.length < 2) {
      return false;
    }

    isLoading.set(true);

    const normalizedPlayers = $players.map((player) => ({
      ...player,
      score:
        Number.isFinite(player.score) && player.score >= 0
          ? player.score
          : 0,
    }));

    const updateInfo: UpdateData = {
      players: normalizedPlayers,
      commentators: $commentators,
      gameInfo: $gameInfo!,
      startGGUri: $tournamentUrl,
    };

    const db = getDatabase(firebase);
    const reference = ref(db, `/scoreboards/${$scoreboardId}`);

    try {
      await update(reference, updateInfo);
      return true;
    } catch {
      errMsg.set("Error updating info. Try again.");
      return false;
    } finally {
      isLoading.set(false);
    }
  };

  const combined = derived(
    [players, commentators, gameInfo],
    ([$players, $commentators, $gameInfo]) => {
      return {
        players: $players,
        commentators: $commentators,
        gameInfo: $gameInfo,
      };
    }
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

  const retrieveTournament = async (): Promise<void> => {
    isLoading.set(true);
    errMsg.set(null);

    const slug = generateSlug();

    try {
      const res = await axios.post(
        "https://api.start.gg/gql/alpha",
        {
          query: tournamentQuery,
          variables: { slug },
        },
        {
          headers: header,
          timeout: 15000,
        }
      );

      if (res.data?.errors?.length) {
        throw new Error(
          res.data.errors
            .map((error: any) => error.message)
            .join("; ")
        );
      }

      const id = res.data?.data?.tournament?.id;

      if (!id) {
        throw new Error("Unable to retrieve tournament from Start.gg.");
      }

      tournamentId.set(id.toString());

      await retrieveStreamQueue();
    } catch (err: any) {
      errMsg.set(
        err?.message ?? "Unable to retrieve tournament from Start.gg."
      );
    } finally {
      isLoading.set(false);
    }
  };

  const rotateTeammates = (side: string): void => {
    const playerIndex = side === "left" ? 0 : side === "right" ? 1 : -1;

    if (playerIndex === -1) {
      return;
    }

    players.update((currentPlayers) => {
      if (!currentPlayers[playerIndex]) {
        return currentPlayers;
      }

      const updatedPlayers = [...currentPlayers];
      const player = updatedPlayers[playerIndex];
      const teammates = [...(player.teammates ?? [])];

      if (!teammates.length) {
        return currentPlayers;
      }

      const prevPlayer: Teammate = {
        name: player.playerName,
        isEliminated: false,
      };

      const nextPlayer = teammates.shift();

      if (!nextPlayer) {
        return currentPlayers;
      }

      teammates.push(prevPlayer);

      updatedPlayers[playerIndex] = {
        ...player,
        playerName: nextPlayer.name,
        teammates,
      };

      return updatedPlayers;
    });

    void updateScoreboard();
  };

  const eliminatePlayer = (side: string): void => {
    const playerIndex = side === "left" ? 0 : side === "right" ? 1 : -1;

    if (playerIndex === -1) {
      return;
    }

    players.update((currentPlayers) => {
      if (!currentPlayers[playerIndex]) {
        return currentPlayers;
      }

      const updatedPlayers = [...currentPlayers];
      const player = updatedPlayers[playerIndex];
      const teammates = [...(player.teammates ?? [])];

      if (!teammates.length) {
        return currentPlayers;
      }

      const prevPlayer: Teammate = {
        name: player.playerName,
        isEliminated: true,
      };

      const nextPlayer = teammates.shift();

      if (!nextPlayer) {
        return currentPlayers;
      }

      teammates.push(prevPlayer);

      updatedPlayers[playerIndex] = {
        ...player,
        playerName: nextPlayer.name,
        teammates,
      };

      return updatedPlayers;
    });

    void updateScoreboard();
  };

  const getQueuedPlayer = (slot: any): QueuedPlayer => {
    const entrant = slot?.entrant;

    if (!entrant) {
      return {
        name: "",
        teamName: "",
        isResolved: false,
      };
    }

    const entrantName = entrant.name ?? "";

    return {
      name: entrantName.replace(/^.*\s\|\s/, ""),
      teamName: entrantName.includes("|")
        ? entrantName
            .replace(/\s*\|\s*[^|]+$/, "")
            .replace(/\s*\|\s*/g, "")
            .trim()
        : "",
      isResolved: true,
    };
  };

  const isSetFullyPopulated = (setData: any): boolean => {
    return Boolean(
      Array.isArray(setData?.slots) &&
        setData.slots.length >= 2 &&
        setData.slots[0]?.entrant &&
        setData.slots[1]?.entrant
    );
  };

  const updateStreamQueue = async (sets: any[]): Promise<void> => {
    const streamName = $streamChannel?.trim();

    if (!streamName) {
      throw new Error("No stream channel is configured for this scoreboard.");
    }

    const normalizedSets = Array.isArray(sets) ? sets : [];

    const streamQueue: QueuedMatch[] = normalizedSets.map((setData: any) => {
      const leftPlayer = getQueuedPlayer(setData?.slots?.[0]);
      const rightPlayer = getQueuedPlayer(setData?.slots?.[1]);

      return {
        id: setData?.id?.toString() ?? "",
        game: setData?.event?.videogame?.name ?? "Unknown Game",
        players: [leftPlayer, rightPlayer],
      };
    });

    const db = getDatabase(firebase);
    const reference = ref(db, `streamQueue/${streamName}`);

    await set(reference, streamQueue);
  };

  async function retrieveStreamQueue(
    shouldUpdateScoreboard = true
  ): Promise<void> {
    if (isRetrievingStreamQueue || !$tournamentId) {
      return;
    }

    if (!$streamChannel?.trim()) {
      errMsg.set("No stream channel is configured for this scoreboard.");
      return;
    }

    isRetrievingStreamQueue = true;
    isLoading.set(true);
    errMsg.set(null);

    try {
      const res = await axios.post(
        "https://api.start.gg/gql/alpha",
        {
          query: streamQueueQuery,
          variables: {
            tournamentId: $tournamentId,
          },
        },
        {
          headers: header,
          timeout: 15000,
        }
      );

      if (res.data?.errors?.length) {
        throw new Error(
          res.data.errors
            .map((error: any) => error.message)
            .join("; ")
        );
      }

      const queue = Array.isArray(res.data?.data?.streamQueue)
        ? res.data.data.streamQueue
        : [];

      const targetStreamName = $streamChannel
        .trim()
        .toLowerCase();

      const stream = queue.find(
        (queueEntry: any) =>
          queueEntry?.stream?.streamName
            ?.trim()
            .toLowerCase() === targetStreamName
      );

      const startGGSetList = Array.isArray(stream?.sets)
        ? stream.sets
        : [];

      const visibleSets =
        awaitingNextSetAfterId !== null
          ? startGGSetList.filter(
              (setData: any) =>
                setData?.id?.toString() !== awaitingNextSetAfterId
            )
          : startGGSetList;

      await updateStreamQueue(visibleSets);

      const shouldLoadMatch =
        shouldUpdateScoreboard ||
        awaitingNextSetAfterId !== null;

      if (!shouldLoadMatch) {
        return;
      }

      const nextSet = visibleSets[0];

      if (!nextSet) {
        return;
      }

      if (!isSetFullyPopulated(nextSet)) {
        return;
      }

      const makePlayer = (i: 0 | 1): Player => {
        const slot = nextSet.slots[i];
        const entrant = slot.entrant;
        const participant = entrant.participants?.[0];
        const user = participant?.user;

        const twitter =
          user?.authorizations?.find(
            (authorization: any) =>
              authorization.type === "TWITTER"
          )?.externalUsername ?? "";

        return {
          id: i + 1,
          playerName: entrant.name.replace(/^.*\s\|\s/, ""),
          teamName: entrant.name.includes(" | ")
            ? entrant.name.replace(/\|.*/, "").trim()
            : "",
          score: 0,
          isLosersBracket: false,
          startId: entrant.id.toString(),
          xHandle: twitter,
          pronouns: user?.genderPronoun ?? "",
          seed: entrant.initialSeedNum,
          teammates: [],
        };
      };

      currentSetId.set(nextSet.id.toString());

      players.set([
        makePlayer(0),
        makePlayer(1),
      ]);

      const scoreboardUpdated = await updateScoreboard();

      if (scoreboardUpdated) {
        awaitingNextSetAfterId = null;
      }
    } catch (err: any) {
      errMsg.set(
        err?.message ??
          "Unable to retrieve the Start.gg stream queue."
      );
    } finally {
      isRetrievingStreamQueue = false;
      isLoading.set(false);
    }
  }

  const clearScores = (e: Event): void => {
    e.preventDefault();

    players.update((currentPlayers) =>
      currentPlayers.map((player) => ({
        ...player,
        score: 0,
        isLosersBracket: false,
      }))
    );

    void updateScoreboard();
  };

  const updateScore = (
    side: string,
    operand: "+" | "-"
  ): void => {
    const targetIndex =
      side === "left"
        ? 0
        : side === "right"
          ? 1
          : -1;

    if (targetIndex === -1) {
      return;
    }

    players.update((currentPlayers) =>
      currentPlayers.map((player, index) => {
        if (index !== targetIndex) {
          return player;
        }

        return {
          ...player,
          score:
            operand === "+"
              ? player.score + 1
              : Math.max(0, player.score - 1),
        };
      })
    );
  };

  const submitResults = async (e: Event): Promise<void> => {
    e.preventDefault();
    errMsg.set(null);

    if ($players.length < 2) {
      errMsg.set("No match is currently loaded.");
      return;
    }

    if (!$currentSetId) {
      errMsg.set("No Start.gg set is currently loaded.");
      return;
    }

    if ($players[0].score === $players[1].score) {
      errMsg.set("Match results cannot be submitted with a tied score.");
      return;
    }

    const submittedSetId = $currentSetId;

    const gameData: any[] = [];

    const winnerId: string =
      $players[0].score > $players[1].score
        ? $players[0].startId
        : $players[1].startId;

    const loserId: string =
      $players[0].score < $players[1].score
        ? $players[0].startId
        : $players[1].startId;

    const winnerScore = Math.max(
      $players[0].score,
      $players[1].score
    );

    const loserScore = Math.min(
      $players[0].score,
      $players[1].score
    );

    let gameNum = 1;

    for (let i = 0; i < loserScore; i++) {
      gameData.push({
        winnerId: loserId,
        gameNum,
      });

      gameNum++;
    }

    for (let i = 0; i < winnerScore; i++) {
      gameData.push({
        winnerId,
        gameNum,
      });

      gameNum++;
    }

    const setData = {
      setId: submittedSetId,
      winnerId,
      gameData,
    };

    const query = `
      mutation ReportSetMutation(
        $setId: ID!,
        $winnerId: ID,
        $gameData: [BracketSetGameDataInput]
      ) {
        reportBracketSet(
          setId: $setId,
          winnerId: $winnerId,
          gameData: $gameData
        ) {
          id
        }
      }
    `;

    isLoading.set(true);

    try {
      const res = await axios.post(
        "https://api.start.gg/gql/alpha",
        {
          query,
          variables: setData,
        },
        {
          headers: header,
          timeout: 15000,
        }
      );

      if (res.data?.errors?.length) {
        throw new Error(
          res.data.errors
            .map((error: any) => error.message)
            .join("; ")
        );
      }

      awaitingNextSetAfterId = submittedSetId;
      currentSetId.set("");

      if ($tournamentId) {
        await retrieveStreamQueue(false);
      } else {
        await retrieveTournament();
      }
    } catch (err: any) {
      errMsg.set(
        err?.message ?? "Unable to submit match results."
      );
    } finally {
      isLoading.set(false);
    }
  };

  const swapSides = (e: Event): void => {
    e.preventDefault();

    players.update((currentPlayers) => {
      if (currentPlayers.length < 2) {
        return currentPlayers;
      }

      const oldLeft: Player = {
        ...currentPlayers[0],
        id: 2,
      };

      const oldRight: Player = {
        ...currentPlayers[1],
        id: 1,
      };

      return [oldRight, oldLeft];
    });

    if ($isTeams) {
      const oldLeftTeammates = [...$leftTeammates];
      const oldRightTeammates = [...$rightTeammates];

      leftTeammates.set(oldRightTeammates);
      rightTeammates.set(oldLeftTeammates);
    }

    void updateScoreboard();
  };

  const swapCommentatorSides = (e: Event): void => {
    e.preventDefault();

    commentators.update((currentCommentators) => {
      if (currentCommentators.length < 2) {
        return currentCommentators;
      }

      const oldLeft: Commentator = {
        ...currentCommentators[0],
        id: 2,
      };

      const oldRight: Commentator = {
        ...currentCommentators[1],
        id: 1,
      };

      return [oldRight, oldLeft];
    });

    void updateScoreboard();
  };

  const getScoreboard = (): void => {
    tournamentId.set("");
    currentSetId.set("");
    awaitingNextSetAfterId = null;

    const database = getDatabase(firebase);
    const reference = ref(
      database,
      `/scoreboards/${$scoreboardId}`
    );

    get(reference)
      .then((res) => {
        const data = res.val();

        if (data) {
          players.set(data.players);
          commentators.set(data.commentators);
          gameInfo.set(data.gameInfo);
          tournamentUrl.set(data.startGGUri);
          streamChannel.set(data.streamUrl);
          isTeams.set(data.isTeams);
        }
      })
      .catch((err) => {
        errMsg.set(err.message);
      });
  };

  const openStreamQueue = (e: Event): void => {
    e.preventDefault();

    window.open(
      `${window.location.origin}/queue/${$streamChannel}`
    );
  };

  onMount(() => {
    const database = getDatabase(firebase);
    const reference = ref(database, "/scoreboards");

    isLoading.set(true);

    get(reference)
      .then((res) => {
        const data = res.val();

        if (data) {
          const scoreboardList: ScoreboardsSimple[] =
            Object.keys(data).map((key) => ({
              id: key,
              scoreboardName: data[key].scoreboardName,
            }));

          scoreboards.set(scoreboardList);
        } else {
          scoreboards.set([]);
        }
      })
      .catch((err) => {
        errMsg.set(err.message);
      })
      .finally(() => {
        isLoading.set(false);
      });

    const streamQueueInterval = window.setInterval(() => {
      if ($tournamentId) {
        void retrieveStreamQueue(false);
      }
    }, 30000);

    return () => {
      window.clearInterval(streamQueueInterval);
    };
  });
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
          <option value="" disabled selected>
            Select a scoreboard
          </option>

          {#each $scoreboards as scoreboard}
            <option value={scoreboard.id}>
              {scoreboard.scoreboardName}
            </option>
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
              <option value={game.data}>
                {game.name}
              </option>
            {/each}
          </select>

          <p>Round:</p>

          <input
            type="text"
            bind:value={$gameInfo.round}
            on:input={() => isUserInput.set(true)}
            class="round"
          />
        {/if}
      </div>

      {#if $scoreboardId}
        <div class="menu-controls">
          <button
            type="button"
            on:click={(e) => {
              e.preventDefault();

              if (!$tournamentId) {
                void retrieveTournament();
              } else {
                void retrieveStreamQueue();
              }
            }}
          >
            Retrieve Stream Queue
          </button>

          <button
            type="button"
            on:click={submitResults}
            disabled={!$currentSetId}
          >
            Submit Match Results
          </button>

          <button
            type="button"
            on:click={openStreamQueue}
          >
            Launch Stream Queue
          </button>
        </div>
      {/if}
    </div>
  {:else if $scoreboards.length === 0}
    <p class="error">
      No scoreboards found. Please create a scoreboard first.
    </p>
  {/if}

  {#if $players.length && $commentators.length && $gameInfo}
    <div class="wrapper">
      <form
        on:submit={(e) => {
          e.preventDefault();
          void updateScoreboard();
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
                        on:input={() =>
                          isUserInput.set(true)}
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
                      bind:value={$players[0].xHandle}
                      on:input={() => isUserInput.set(true)}
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
                        type="button"
                        on:click={() =>
                          rotateTeammates("left")}
                      >
                        Rotate
                      </button>

                      <button
                        type="button"
                        on:click={() =>
                          eliminatePlayer("left")}
                      >
                        Eliminate
                      </button>
                    {/if}
                  </div>

                  <div class="number-buttons">
                    <button
                      type="button"
                      class="plus"
                      on:click={() => {
                        updateScore("left", "+");
                        isUserInput.set(true);
                      }}
                    >
                      +
                    </button>

                    <button
                      type="button"
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
            <button
              type="button"
              on:click={clearScores}
            >
              Clear Scores
            </button>

            <button
              type="button"
              on:click={swapSides}
            >
              Swap Sides
            </button>

            <button
              type="button"
              on:click={() => copyScene("scoreboard")}
            >
              Copy Scene
            </button>
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
                        on:input={() =>
                          isUserInput.set(true)}
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
                      bind:value={$players[1].xHandle}
                      on:input={() => isUserInput.set(true)}
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
                      <button
                        type="button"
                        on:click={() =>
                          rotateTeammates("right")}
                      >
                        Rotate
                      </button>

                      <button
                        type="button"
                        on:click={() =>
                          eliminatePlayer("right")}
                      >
                        Eliminate
                      </button>
                    {/if}
                  </div>

                  <div class="number-buttons">
                    <button
                      type="button"
                      class="plus"
                      on:click={() => {
                        updateScore("right", "+");
                        isUserInput.set(true);
                      }}
                    >
                      +
                    </button>

                    <button
                      type="button"
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

                <input
                  type="text"
                  bind:value={$commentators[0].teamName}
                  on:input={() => isUserInput.set(true)}
                />
              </div>

              <div class="commentator-name">
                <p>Commentator Name:</p>

                <input
                  type="text"
                  bind:value={$commentators[0].commentatorName}
                  on:input={() => isUserInput.set(true)}
                />
              </div>

              <div class="x-handle">
                <p>Twitter/Bsky (Exclude @):</p>

                <input
                  type="text"
                  bind:value={$commentators[0].xHandle}
                  on:input={() => isUserInput.set(true)}
                />
              </div>
            </div>
          </div>

          <div class="control-buttons">
            <button
              type="button"
              on:click={swapCommentatorSides}
            >
              Swap Sides
            </button>

            <button
              type="button"
              on:click={() => copyScene("commentators")}
            >
              Copy Scene
            </button>
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
                  bind:value={$commentators[1].commentatorName}
                  on:input={() => isUserInput.set(true)}
                />
              </div>

              <div class="x-handle">
                <p>Twitter/Bsky (Exclude @):</p>

                <input
                  type="text"
                  bind:value={$commentators[1].xHandle}
                  on:input={() => isUserInput.set(true)}
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