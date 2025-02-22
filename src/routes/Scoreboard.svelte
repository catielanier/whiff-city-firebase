<script lang="ts">
    import {onMount} from "svelte";
    import {getDatabase, ref, onValue} from "firebase/database";
    import type { Player } from "../utils/types";
    import {firebase} from "../utils/firebase";

    let players: Player[];
    let gameInfo: GameInfo;

    onMount(() => {
        const database = getDatabase(firebase);
        const playersRef = ref(database, '/players');
        const gameRef = ref(database, '/gameInfo');
        onValue(gameRef, res => {
            gameInfo = res.val();
        })
        onValue(playersRef, res => {
            players = res.val();
        });
    })
</script>

{#if players?.length && gameInfo}
    <div class="scoreboard {gameInfo.title}">
        <div class="tournament-round">
            <p>
                {gameInfo.round}
            </p>
        </div>
        <div class="wrapper">
            <div class="left-player {gameInfo.title}">
                <div class="score"><span class="score-inner">{players[0].score}</span></div>
                <div class="player-info">
                    <span class="player">
                        <span class="team">{players[0].teamName}</span>
                        {players[0].playerName}
                        {#if players[0].isLosersBracket}
                            <span class="losers-bracket">[L]</span>
                        {/if}
                    </span>
                </div>
            </div>
            <div class="right-player {gameInfo.title}">
                <div class="player-info">
                    <span class="player">
                        <span class="team">{players[1].teamName}</span>
                        {players[1].playerName}
                        {#if players[1].isLosersBracket}
                            <span class="losers-bracket">[L]</span>
                        {/if}
                    </span>
                </div>
                <div class="score"><span class="score-inner">{players[1].score}</span></div>
            </div>
        </div>
    </div>
{/if}

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
        position: relative;
    }

    .scoreboard.bbcf, .scoreboard.gbvs {
        font-size: 25px;
    }

    .scoreboard.bbcf .tournament-round,
    .scoreboard.gbvs .tournament-round {
        height: 38px;
    }
    .scoreboard .tournament-round {
        font-size: 20px;
        color: #280137;
    }
    .scoreboard .tournament-round p {
        margin-top: 10px;
    }
    .scoreboard.bbcf .tournament-round p,
    .scoreboard.gbvs .tournament-round p {
        margin-top: 5px;
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
    .left-player.sf6 {
        grid-template-columns: 1fr 8fr;
        grid-gap: 65px;
    }

    .left-player.tekken8 {
        grid-template-columns: 1fr 8fr;
    }

    .left-player.sf6 .player-info {
        margin-right: 220px;
    }
    .right-player {
        grid-template-columns: 6fr 1fr;
        transform: skewX(-30deg);
        margin-left: 27px;
    }

    .right-player.sf6 {
        grid-gap: 65px;
        grid-template-columns: 8fr 1fr;
    }
    .right-player.tekken8 {
        grid-template-columns: 8fr 1fr;
    }
    .left-player.tekken8 .player-info {
        margin-right: 230px;
    }
    .right-player.sf6 .player-info {
        margin-left: 220px;
    }
    .right-player.tekken8 .player-info {
        margin-left: 230px;
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
    .left-player .losers-bracket {
        color: #6B8E23;
    }
    .right-player .losers-bracket {
        color: #FFC400
    }
    .tournament-round {
        position: absolute;
        z-index: 2;
        top: 0;
        left: 50%;
        transform: translateX(-30%);
        width: 225px;
        height: 45px;
        background: #c065ff;
        clip-path: polygon(0% 100%, 15% 0%, 85% 0%, 100% 100%);
        overflow: hidden;
    }
    .left-player.bbcf {
        margin-left: 300px;
    }
    .right-player.bbcf .score {
        margin-right: 300px;
        padding-right: 45px;
        padding-left: 45px;
    }
    .left-player.gbvs .score {
        margin-left: 200px;
        padding-left: 20px;
        padding-right: 20px;
    }
    .left-player.gbvs .player-info {
        margin-right: 215px;
    }

    .right-player.gbvs .score {
        margin-right: 200px;
        padding-left: 20px;
        padding-right: 20px;
    }

    .right-player.gbvs .player-info {
        margin-left: 215px;
    }
</style>