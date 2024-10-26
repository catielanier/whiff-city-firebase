<script lang="ts">
    import {onMount} from "svelte";
    import axios from "axios";
    import type {Commentator, Player, UpdateData} from "../utils/types";
    import {getDatabase, ref, get, update} from "firebase/database";
    import {firebase} from "../utils/firebase";

    let players: Player[]
    let commentators: Commentator[]

    let isLoading: boolean = false;
    let errMsg: string | null;

    const updateScoreboard = async (): Promise<void> => {
        isLoading = true;
        const updateInfo: UpdateData = {
            players,
            commentators
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

    const clearScores = (e: Event): void => {
        e.preventDefault();
        players.forEach((player: Player): void => {
            player.score = 0;
        });
        updateScoreboard();
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
        get(playersRef).then(res => {
            players = res.val();
        })
        get(commentatorsRef).then(res => {
            commentators = res.val();
        })
    });
</script>

<div class="update">
    {#if players?.length && commentators?.length}
        <div class="wrapper">
            <form on:submit={(e) => {
                e.preventDefault();
                updateScoreboard();
            }}>
                <div class="button-grid top">
                    <button type="submit">Update</button>
                    <button on:click={clearScores}>Clear Scores</button>
                    <button on:click={swapSides}>Swap Player Sides</button>
                    <button on:click={swapCommentatorSides}>Swap Commentator Sides</button>
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
        grid-template-columns: 1fr 1fr 1fr;
        grid-gap: 20px;
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
</style>