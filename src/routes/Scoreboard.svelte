<script lang="ts">
  import { getDatabase, onValue, ref } from "firebase/database";
  import { afterUpdate, onMount } from "svelte";
  import { games } from "../utils/data";
  import { firebase } from "../utils/firebase";
  import type { GameInfo, Player } from "../utils/types";

  export let id: string;
  let players: Player[];
  let gameInfo: GameInfo;
  let isTeams: boolean = false;

  // Bind both outer .player and inner .player-inner
  let leftPlayerEl: HTMLSpanElement;
  let rightPlayerEl: HTMLSpanElement;
  let leftPlayerInner: HTMLSpanElement;
  let rightPlayerInner: HTMLSpanElement;

  const resizeText = (
    wrapperEl: HTMLElement,
    innerEl: HTMLElement,
    maxWidth: number,
    direction: "left" | "right"
  ) => {
    requestAnimationFrame(() => {
      if (!wrapperEl || !innerEl) return;

      wrapperEl.style.maxWidth = `${maxWidth}px`;
      const actualWidth = innerEl.offsetWidth;
      const scale = Math.min(maxWidth / actualWidth, 1);
      innerEl.style.transform = `scale(${scale})`;
      innerEl.style.transformOrigin = `${direction} center`;
    });
  };

  const resizeAllText = () => {
    const gameWidth: number | undefined = games.find(
      (x) => x.data === gameInfo.title
    )?.width;
    if (!gameWidth) return;
    resizeText(leftPlayerEl, leftPlayerInner, gameWidth, "left");
    resizeText(rightPlayerEl, rightPlayerInner, gameWidth, "right");
  };

  onMount(() => {
    const database = getDatabase(firebase);
    const reference = ref(database, `/scoreboards/${id}`);
    onValue(reference, (res) => {
      const data = res.val();
      players = data.players;
      gameInfo = data.gameInfo;
      isTeams = data.isTeams;
      setTimeout(() => {
        resizeAllText();
      }, 0);
    });
  });

  afterUpdate(() => {
    if (players?.length && gameInfo) {
      resizeAllText();
    }
  });
</script>

{#if players?.length && gameInfo}
  <div class="scoreboard {gameInfo.title}">
    <div class="tournament-round {gameInfo.title}">
      <p>
        {gameInfo.round}
      </p>
    </div>
    <div class="wrapper">
      <div class="left-player {gameInfo.title}">
        <div class="score">
          <span class="score-inner">{players[0].score}</span>
        </div>
        <div class="player-info">
          <span class="player" bind:this={leftPlayerEl}>
            <span class="player-inner" bind:this={leftPlayerInner}>
              <span class="team">{players[0].teamName}</span>
              {players[0].playerName}
              {#if players[0].isLosersBracket}
                <span class="losers-bracket">[L]</span>
              {/if}
            </span>
          </span>
        </div>
      </div>
      <div class="right-player {gameInfo.title}">
        <div class="player-info">
          <span class="player" bind:this={rightPlayerEl}>
            <span class="player-inner" bind:this={rightPlayerInner}>
              <span class="team">{players[1].teamName}</span>
              {players[1].playerName}
              {#if players[1].isLosersBracket}
                <span class="losers-bracket">[L]</span>
              {/if}
            </span>
          </span>
        </div>
        <div class="score">
          <span class="score-inner">{players[1].score}</span>
        </div>
      </div>
    </div>
    <div class="left-player-details {gameInfo.title}">
      <div class="seed">
        Seed: #{players[0].seed}
      </div>
      {#if players[0].pronouns}
        <div class="pronouns">
          {players[0].pronouns}
        </div>
      {/if}
      {#if players[0].xHandle.length}
        <div class="x-handle">
          <span class="at-tag">@</span>{players[0].xHandle}
        </div>
      {/if}
    </div>
    <div class="right-player-details {gameInfo.title}">
      {#if players[1].xHandle.length}
        <div class="x-handle">
          <span class="at-tag">@</span>{players[1].xHandle}
        </div>
      {/if}
      {#if players[1].pronouns}
        <div class="pronouns">
          {players[1].pronouns}
        </div>
      {/if}
      <div class="seed">
        Seed: #{players[1].seed}
      </div>
    </div>
    {#if isTeams && players[0].teammates && players[1].teammates}
      <div class="left-team team-info">
        <h4>Teammates:</h4>
        {#each players[0].teammates as player}
          <p class="player {player.isEliminated && 'eliminated'}">
            {player.name || "&nbsp;"}
          </p>
        {/each}
      </div>
      <div class="right-team team-info">
        <h4>Teammates:</h4>
        {#each players[1].teammates as player}
          <p class="player {player.isEliminated && 'eliminated'}">
            {player.name || "&nbsp;"}
          </p>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  @import url("https://fonts.googleapis.com/css2?family=Audiowide&display=swap");
  .scoreboard {
    max-width: 1700px;
    width: 100%;
    height: 500px;
    font-family: "Audiowide", sans-serif;
    font-weight: 400;
    font-style: normal;
    font-size: 30px;
    position: relative;
  }
  .left-player-details {
    position: absolute;
    top: 110px;
    left: 120px;
    font-size: 20px;
    display: grid;
    grid-template-columns: 130px 130px;
    grid-template-rows: 1fr 1fr;
    grid-gap: 5px;
  }

  .left-player-details.sf6 {
    top: 110px;
    left: 120px;
  }
  .right-player-details {
    position: absolute;
    top: 110px;
    right: 50px;
    font-size: 20px;
    display: grid;
    grid-template-columns: 125px 125px;
    grid-template-rows: 1fr 1fr;
    grid-gap: 5px;
    align-items: end;
  }

  .left-player-details.ggst,
  .right-player-details.ggst {
    top: 50px;
    grid-template-columns: repeat(4, 125px);
    grid-template-rows: 1fr;
  }
  .left-player-details.tekken8,
  .right-player-details.tekken8 {
    top: 120px;
  }

  .left-player-details.bbcf,
  .right-player-details.bbcf {
    top: 140px;
    grid-template-columns: repeat(4, 125px);
  }

  .left-player-details.nidhogg,
  .right-player-details.nidhogg,
  .left-player-details.arms,
  .right-player-details.arms,
  .left-player-details.ki,
  .right-player-details.ki {
    top: 55px;
    grid-template-columns: repeat(4, 125px);
  }

  .left-player-details.llb,
  .right-player-details.llb {
    top: 25px;
    grid-template-columns: repeat(4, 125px);
  }

  .left-player-details.nidhogg {
    left: 270px;
  }

  .left-player-details.llb {
    left: 90px;
  }
  .right-player-details.llb {
    right: 20px;
  }

  .right-player-details.nidhogg {
    right: 200px;
  }

  .left-player-details.arms {
    left: 160px;
  }
  .right-player-details.arms {
    right: 90px;
  }

  .left-player-details.ki {
    left: 170px;
  }

  .right-player-details.ki {
    right: 100px;
  }

  .left-player-details.gbvs,
  .right-player-details.gbvs {
    top: 140px;
  }

  .left-player-details.gbvs {
    left: 450px;
  }

  .right-player-details.gbvs {
    right: 380px;
  }

  .left-player-details.tekken8 {
    left: 140px;
  }

  .right-player-details.tekken8 {
    right: 80px;
  }

  .at-tag {
    font-family: "sans-serif";
    font-weight: bold;
  }

  .right-player-details .seed {
    grid-column: 2;
  }

  .right-player-details .pronouns {
    grid-column: 1;
  }

  .right-player-details.ggst .seed,
  .right-player-details.nidhogg .seed,
  .right-player-details.arms .seed,
  .right-player-details.llb .seed,
  .right-player-details.ki .seed,
  .right-player-details.bbcf .seed {
    grid-column: 4;
  }
  .right-player-details.ggst .pronouns,
  .right-player-details.arms .pronouns,
  .right-player-details.nidhogg .pronouns,
  .right-player-details.llb .pronouns,
  .right-player-details.ki .pronouns,
  .right-player-details.bbcf .pronouns {
    grid-column: 3;
  }

  .right-player-details.sf6 {
    top: 110px;
    right: 40px;
  }

  .left-player-details .x-handle {
    grid-column: span 2;
  }

  .left-player-details .seed,
  .left-player-details .pronouns,
  .left-player-details .x-handle {
    background: #235ba8;
    color: #fff;
  }

  .right-player-details .seed,
  .right-player-details .pronouns,
  .right-player-details .x-handle {
    background: #ffed97;
    color: #000;
  }

  .right-player-details:not(.ggst):not(.nidhogg):not(.ki):not(.llb):not(
      .bbcf
    ):not(.arms)
    .x-handle {
    grid-row: 2;
    grid-column: span 2;
  }

  .right-player-details:is(.ggst, .nidhogg, .ki, .llb, .arms, .bbcf) .x-handle {
    grid-column: span 2;
    padding: 4px 8px;
  }

  .left-player-details .seed,
  .right-player-details .seed,
  .left-player-details .pronouns,
  .right-player-details .pronouns {
    padding: 4px 8px;
  }

  .scoreboard.bbcf,
  .scoreboard.gbvs {
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

  .scoreboard.cotw .tournament-round {
    width: 180px;
  }

  .scoreboard.vf5 .tournament-round {
    margin-top: 150px;
  }

  .scoreboard.arms .tournament-round {
    margin-top: 130px;
  }

  .wrapper,
  .left-player,
  .right-player {
    display: grid;
  }
  .wrapper {
    width: 100%;
    grid-template-columns: 1fr 1fr;
    margin-right: 200px;
    padding: 0 50px 0 25px;
  }
  .left-player,
  .right-player {
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

  .left-player.llb,
  .right-player.llb {
    margin-top: 70px;
    font-size: 1.6rem;
  }

  .left-player.llb .player-info {
    margin-right: 275px;
  }
  .right-player.llb .player-info {
    margin-left: 275px;
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
  .left-player.vf5 .player-info {
    margin-right: 65px;
  }
  .right-player.vf5 .player-info {
    margin-left: 65px;
  }

  .left-player.arms .player-info {
    margin-right: 200px;
  }
  .right-player.arms .player-info {
    margin-left: 200px;
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
  .score-inner {
    display: block;
  }
  .player-info .player {
    display: flex;
    justify-content: flex-start;
    white-space: nowrap;
  }

  .right-player .player {
    justify-content: flex-end;
  }
  .left-player .player-info .player .player-inner {
    display: inline-block;
    transform-origin: left center;
    white-space: nowrap;
    align-self: flex-start;
  }
  .right-player .player-info .player .player-inner {
    display: inline-block;
    transform-origin: right center;
    white-space: nowrap;
    align-self: flex-end;
  }
  .right-player.ggst .player-info .player-inner,
  .right-player.sf33s .player-info .player-inner,
  .right-player.ki .player-info .player-inner,
  .right-player.nidhogg .player-info .player-inner,
  .right-player.bbcf .player-info .player-inner,
  .right-player.st .player-info .player-inner {
    margin-right: -110px;
  }
  .left-player .player-info .player,
  .left-player .score-inner {
    transform: skewX(-30deg);
  }
  .right-player .player-info .player,
  .right-player .score-inner {
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
    background: #eb0405;
    color: #fff;
  }
  .left-player .player-info {
    background: #ffed97;
    color: #000;
  }
  .left-player.cotw .player-info {
    margin-right: 150px;
  }
  .right-player.cotw .player-info {
    margin-left: 150px;
  }

  .left-player.cotw .score {
    margin-left: 120px;
    padding-right: 40px;
    padding-left: 40px;
  }
  .right-player.cotw .score {
    margin-right: 120px;
    padding-right: 40px;
    padding-left: 40px;
  }

  .left-player .player-info .team {
    color: #235ba8;
  }
  .right-player .player-info {
    background: #235ba8;
    color: #fff;
  }
  .right-player .team {
    color: #ffed97;
  }
  .left-player .losers-bracket {
    color: #6b8e23;
  }
  .right-player .losers-bracket {
    color: #ffc400;
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

  .team-info {
    background: #eb0405;
    color: #fff;
    width: 150px;
    font-size: 1.2rem;
    position: absolute;
    top: 120px;
  }
  .team-info h4,
  .team-info p {
    margin: 0;
    padding: 0;
  }

  .team-info h4 {
    background-color: #ffed97;
    color: #eb0405;
  }
  .left-team {
    left: 0;
  }
  .right-team {
    right: -80px;
  }
  .team-info p.eliminated {
    text-decoration: line-through;
    color: #ccc;
  }
</style>
