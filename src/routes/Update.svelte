<script lang="ts">
    import {onMount} from "svelte";
    import type {Commentator, Player, UpdateData, GameInfo, QueuedMatch} from "../utils/types";
    import {getDatabase, ref, onValue, get, update} from "firebase/database";
    import {firebase} from "../utils/firebase";
    import {games, header} from "../utils/data";
    import axios from "axios";
    import {streamQueueQuery, tournamentQuery} from "../utils/gqlQueries";
    
    let players: Player[]
    let commentators: Commentator[]
    let gameInfo: GameInfo;

    let tournamentUrl: string;

    let tournamentId: string;

    let currentSetId: string;

    let isLoading: boolean = false;
    let errMsg: string | null;

    let streamChannel: string;

    const updateScoreboard = async (): Promise<void> => {
        isLoading = true;
        const updateInfo: UpdateData = {
            players,
            commentators,
            gameInfo
        }
        const db = getDatabase(firebase);
        const reference = ref(db);
        update(reference, updateInfo).then(_ => {
            isLoading = false;
        }).catch(_ => {
            errMsg = 'Error updating info. Try again.';
            isLoading = false;
        })
    }

    const generateSlug = (): string => {
        return tournamentUrl.replace('https://www.start.gg/', '');
    }

    const retrieveTournament = (): void => {
        isLoading = true;
        const slug = generateSlug();
        axios.post('https://api.start.gg/gql/alpha', {
            query: tournamentQuery,
            variables: { slug }
        }, {
            headers: header
        }).then(res => {
            tournamentId = res.data.data.tournament.id;
            retrieveStreamQueue();
        });
    }

    const retrieveStreamQueue = (): void => {
        isLoading = true;
        axios.post('https://api.start.gg/gql/alpha', {
            query: streamQueueQuery,
            variables: { tournamentId }
        }, {
            headers: header
        }).then(res => {
            const leftPlayer: Player = {
                id: 1,
                playerName: res.data.data.streamQueue[0].sets[0].slots[0].entrant.name.replace(/^.*\s\|\s/, ""),
                teamName: res.data.data.streamQueue[0].sets[0].slots[0].entrant.name.replace(/\s\|\s.*/, ""),
                score: 0,
                isLosersBracket: false,
                startId: res.data.data.streamQueue[0].sets[0].slots[0].entrant.id
            }
            const rightPlayer: Player = {
                id: 2,
                playerName: res.data.data.streamQueue[0].sets[0].slots[1].entrant.name.replace(/^.*\s\|\s/, ""),
                teamName: res.data.data.streamQueue[0].sets[0].slots[1].entrant.name.replace(/\s\|\s.*/, ""),
                score: 0,
                isLosersBracket: false,
                startId: res.data.data.streamQueue[0].sets[0].slots[1].entrant.id
            }
            players = [leftPlayer, rightPlayer];
            currentSetId = res.data.data.streamQueue[0].sets[0].id;
            updateScoreboard();
            updateStreamQueue(res.data.data.streamQueue[0].sets);
        }).catch(err => {
            errMsg = err.message;
        })
    }

    const updateStreamQueue = (sets: any[]): void => {
        const updateInfo: any = {
            streamQueue: []
        };
        sets.forEach((set: any) => {
            const match: QueuedMatch = {
                id: set.id,
                game: set.event.videogame.name,
                players: [
                    {
                        name: set.slots[0].entrant.name.replace(/^.*\s\|\s/, ""),
                        teamName: set.slots[0].entrant.name.replace(/\s\|\s.*/, "")
                    },
                    {
                        name: set.slots[1].entrant.name.replace(/^.*\s\|\s/, ""),
                        teamName: set.slots[1].entrant.name.replace(/\s\|\s.*/, "")
                    }
                ]
            }
            updateInfo.streamQueue.push(match);
        })
        const db = getDatabase(firebase);
        const reference = ref(db);
        update(reference, updateInfo).then(_ => {
            isLoading = false;
        }).catch(_ => {
            errMsg = 'Error updating stream queue. Try again.';
            isLoading = false;
        })
    }

    const clearScores = (e: Event): void => {
        e.preventDefault();
        players.forEach((player: Player): void => {
            player.score = 0;
            player.isLosersBracket = false;
        });
        updateScoreboard();
    }

    const submitResults = (e: Event): void => {
        e.preventDefault();
        const gameData: any = [];
        const winnerId: string = players[0].score > players[1].score ? players[0].startId : players[1].startId;
        let gameNum: number = 1;
        if (winnerId === players[0].startId) {
            for (let i = 0; i < players[1].score; i++) {
                const set: any = {
                    winnerId: players[1].startId,
                    gameNum
                }
                gameData.push(set);
                gameNum++;
            }
            for (let i = 0; i < players[0].score; i++) {
                const set: any = {
                    winnerId: players[0].startId,
                    gameNum
                }
                gameData.push(set);
                gameNum++;
            }
        } else {
            for (let i = 0; i < players[0].score; i++) {
                const set: any = {
                    winnerId: players[0].startId,
                    gameNum
                }
                gameData.push(set);
                gameNum++;
            }
            for (let i = 0; i < players[1].score; i++) {
                const set: any = {
                    winnerId: players[1].startId,
                    gameNum
                }
                gameData.push(set);
                gameNum++;
            }
        }
        const setData: any = {
            setId: currentSetId,
            winnerId,
            gameData
        }
        const mutation = `mutation ReportSetMutation($setId: ID!, $winnerId: ID, $gameData: [BracketSetGameDataInput]) {
            reportBracketSet(setId: $setId, winnerId: $winnerId, gameData: $gameData) {}
        }`
        axios.post('https://api.start.gg/gql/alpha', {
            mutation,
            variables: setData
        }, {
            headers: header
        }).then(_ => retrieveStreamQueue()).catch(err => errMsg = err.message);
    }

    const swapSides = (e: Event): void => {
        e.preventDefault();
        const oldLeft: Player = {...players[0]}
        const oldRight: Player = {...players[1]}
        oldLeft.id = 2;
        oldRight.id = 1;
        players[0] = oldRight;
        players[1] = oldLeft;
        updateScoreboard();
    }

    const swapCommentatorSides = (e: Event): void => {
        e.preventDefault();
        const oldLeft: Commentator = {...commentators[0]}
        const oldRight: Commentator = {...commentators[1]}
        oldLeft.id = 2;
        oldRight.id = 1;
        commentators[0] = oldRight;
        commentators[1] = oldLeft;
        updateScoreboard();
    }

    onMount(async () => {
        const database = getDatabase(firebase);
        const playersRef = ref(database, '/players');
        const commentatorsRef = ref(database, '/commentators');
        const gameRef = ref(database, '/gameInfo');
        onValue(playersRef, res => {
            players = res.val();
        });
        get(commentatorsRef).then(res => {
            commentators = res.val();
        });
        get(gameRef).then(res => {
            gameInfo = res.val();
        });
    });
</script>

<div class="update">
    {#if players?.length && commentators?.length && gameInfo}
        <div class="wrapper">
            <form on:submit={(e) => {
                e.preventDefault();
                updateScoreboard();
            }}>
                <input type="text" bind:value={tournamentUrl} placeholder="Tournament URL" />
                <input type="text" bind:value={streamChannel} placeholder="Stream Channel" />
                <div class="button-grid top">
                    <button type="submit">Update</button>
                    <button on:click={clearScores}>Clear Scores</button>
                    <button on:click={swapSides}>Swap Player Sides</button>
                    <button on:click={swapCommentatorSides}>Swap Commentator Sides</button>
                    <button on:click={(e) => {
                        e.preventDefault();
                        !tournamentId ? retrieveTournament() : retrieveStreamQueue();
                    }}>Retrieve Stream Queue</button>
                    <button on:click={submitResults}>Submit Match Results</button>
                </div>
                <div class="game-info">
                    <p>Game:</p>
                    <select bind:value={gameInfo.title}>
                        {#each games as game}
                            <option value={game.data}>{game.name}</option>
                        {/each}
                    </select>
                    <p>Round:</p>
                    <input type="text" bind:value={gameInfo.round}>
                </div>
                <div class="player-info">
                    <div class="player-one">
                        <p>Left Player:</p>
                        <div class="player-one-wrapper">
                            <div class="team">
                                <p>Team:</p>
                                <input type="text" bind:value={players[0].teamName} />
                            </div>
                            <div class="player-name">
                                <p>Player Name:</p>
                                <input type="text" bind:value={players[0].playerName} />
                            </div>
                            <div class="score">
                                <p>Score:</p>
                                <input type="number" bind:value={players[0].score} />
                            </div>
                            <div class="losers-bracket">
                                <p>Losers Bracket:</p>
                                <input type="checkbox" bind:checked={players[0].isLosersBracket} />
                            </div>
                        </div>
                    </div>
                    <div class="player-two">
                        <p>Right Player:</p>
                        <div class="player-two-wrapper">
                            <div class="team">
                                <p>Team:</p>
                                <input type="text" bind:value={players[1].teamName} />
                            </div>
                            <div class="player-name">
                                <p>Player Name:</p>
                                <input type="text" bind:value={players[1].playerName} />
                            </div>
                            <div class="score">
                                <p>Score:</p>
                                <input type="number" bind:value={players[1].score} />
                            </div>
                            <div class="losers-bracket">
                                <p>Losers Bracket:</p>
                                <input type="checkbox" bind:checked={players[1].isLosersBracket} />
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
                                <input type="text" bind:value={commentators[0].teamName} />
                            </div>
                            <div class="commentator-name">
                                <p>Player Name:</p>
                                <input type="text" bind:value={commentators[0].commentatorName} />
                            </div>
                            <div class="x-handle">
                                <p>Twitter (Exclude @):</p>
                                <input type="text" bind:value={commentators[0].xHandle} />
                            </div>
                        </div>
                    </div>
                    <div class="commentator-two">
                        <p>Right Commentator:</p>
                        <div class="commentator-two-wrapper">
                            <div class="team">
                                <p>Team:</p>
                                <input type="text" bind:value={commentators[1].teamName} />
                            </div>
                            <div class="commentator-name">
                                <p>Player Name:</p>
                                <input type="text" bind:value={commentators[1].commentatorName} />
                            </div>
                            <div class="x-handle">
                                <p>Twitter (Exclude @):</p>
                                <input type="text" bind:value={commentators[1].xHandle} />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="button-grid">
                    <button type="submit">Update</button>
                    <button on:click={clearScores}>Clear Scores</button>
                    <button on:click={swapSides}>Swap Player Sides</button>
                    <button on:click={swapCommentatorSides}>Swap Commentator Sides</button>
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
    .player-one, .commentator-one {
        padding: 10px;
        border-radius: 5px;
        border: 2px solid #FFED97;
    }
    .player-two, .commentator-two {
        margin-top: 15px;
        padding: 10px;
        border-radius: 5px;
        border: 2px solid #235BA8;
    }
    .player-info {
        margin-bottom: 20px;
    }
    p {
        margin: 0;
    }
    .player-one-wrapper, .player-two-wrapper, .commentator-one-wrapper, .commentator-two-wrapper {
        display: grid;
        grid-gap: 5px;
    }

    .losers-bracket {
        text-align: center;
    }

    .player-one-wrapper, .player-two-wrapper {
        grid-template-columns: 1fr 1fr 1fr 1fr;
    }

    .commentator-one-wrapper, .commentator-two-wrapper {
        grid-template-columns: 1fr 1fr 1fr;
    }
    .button-grid {
        margin-top: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        grid-gap: 15px;
    }
    .button-grid.top{
        margin-bottom: 20px;
    }
    select {
        margin-bottom: 20px;
    }
    .game-info input[type="text"] {
        margin-bottom: 20px;
    }
</style>