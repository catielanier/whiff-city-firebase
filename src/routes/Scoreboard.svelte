<script lang="ts">
    import {onDestroy, onMount} from "svelte";
    import { io, type Socket } from "socket.io-client";
    import type { Player } from "../utils/types";
    import { retrieveScoreboard } from "../utils/api";

    let players: Player[];
    let socket: Socket | null;

    onMount(async () => {
        players = await retrieveScoreboard();
        socket = io();
        socket?.on('connect', () => {
            console.log('connection established')
        })
        socket?.on('scoreboard_updated', async () => {
            players = await retrieveScoreboard();
        })
    })

    onDestroy(() => {
        socket?.disconnect()
        console.log('connection closed')
    })
</script>

<div class="scoreboard">
    {#if players?.length}
        <div class="wrapper">
            <div class="left-player">
                <div class="score"><span class="score-inner">{players[0].score}</span></div>
                <div class="player-info"><span class="player"><span class="team">{players[0].teamName}</span> {players[0].playerName}</span></div>
            </div>
            <div class="right-player">
                <div class="player-info"><span class="player"><span class="team">{players[1].teamName}</span> {players[1].playerName}</span></div>
                <div class="score"><span class="score-inner">{players[1].score}</span></div>
            </div>
        </div>
    {/if}
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');
    .scoreboard {
        max-width: 1700px;
        width: 100%;
        height: 80px;
        font-family: 'Audiowide', sans-serif;
        font-weight: 400;
        font-style: normal;
        font-size: 30px;
    }
    .wrapper, .left-player, .right-player {
        display: grid;
    }
    .wrapper {
        width: 100%;
        grid-template-columns: 1fr 1fr;
        margin-right: 200px;
        padding: 0 50px 0 25px;
    }
    .left-player, .right-player {
        width: 100%;
    }
    .left-player {
        grid-template-columns: 1fr 6fr;
        transform: skewX(30deg);
        margin-right: 25px;
    }
    .right-player {
        grid-template-columns: 6fr 1fr;
        transform: skewX(-30deg);
        margin-left: 27px;
    }
    .player-info .player, .score-inner {
        display: block;
    }
    .left-player .player-info .player, .left-player .score-inner {
        transform: skewX(-30deg);
    }
    .right-player .player-info .player, .right-player .score-inner {
        transform: skewX(30deg);
    }
    .left-player .player-info {
        text-align: left;
        padding-left: 15px;
    }
    .right-player .player-info {
        text-align: right;
        padding-right: 15px;
    }
    .score {
        background: #EB0405;
        color: #fff;
    }
    .left-player .player-info {
        background: #FFED97;
        color: #000;
    }
    .left-player .player-info, .right-player .player-info {
    }
    .left-player .player-info .team {
        color: #235BA8;
    }
    .right-player .player-info {
        background: #235BA8;
        color: #fff;
    }
    .right-player .team {
        color: #FFED97;
    }
</style>