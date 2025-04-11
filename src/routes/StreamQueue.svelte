<script lang="ts">
  import { onMount } from "svelte";
  import { getDatabase, onValue, ref } from "firebase/database";
  import type { QueuedMatch } from "../utils/types";
  import { firebase } from "../utils/firebase";

  let queue: QueuedMatch[] = [];
  export let stream: string;

  onMount(() => {
    const db = getDatabase(firebase);
    const queueRef = ref(db, `/streamQueue/${stream}`);
    onValue(queueRef, (snapshot) => (queue = snapshot.val()));
  });
</script>

<div class="stream-queue">
  <div class="wrapper">
    <h1>Stream Queue:</h1>
    <h3>Twitch Channel: <span>{stream}</span></h3>
    <div class="queue-wrapper">
      <div class="queue-header">
        <div>Position</div>
        <div>Left Player</div>
        <div>Right Player</div>
        <div>Game</div>
      </div>
      {#each queue as match, i}
        <div class="queue-item {i === 0 && 'playing'} {i === 1 && 'on-deck'}">
          <div>
            {#if i === 0}Playing{:else if i === 1}On Deck{:else}#{i + 1}{/if}
          </div>
          <div>
            <span>{match.players[0].teamName}</span>
            {match.players[0].name}
          </div>
          <div>
            <span>{match.players[1].teamName}</span>
            {match.players[1].name}
          </div>
          <div>{match.game}</div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Audiowide&display=swap");
  .stream-queue {
    text-align: left;
    font-family: Audiowide;
    background: url("../assets/queue-wallpaper.gif") no-repeat;
    background-size: cover;
    height: 1097px;
  }
  .wrapper {
    max-width: 1800px;
    margin: 0 auto;
  }

  .wrapper .queue-wrapper {
    display: grid;
    grid-auto-rows: 1fr;
    grid-gap: 10px;
  }
  .queue-wrapper .queue-header,
  .queue-wrapper .queue-item {
    display: grid;
    grid-template-columns: 1fr 3fr 3fr 3fr;
    padding: 5px 25px;
  }

  .queue-wrapper .queue-item div {
    transform: skewX(-30deg);
  }
  .queue-wrapper .queue-header div {
    transform: skewX(30deg);
  }
  .queue-wrapper .queue-header {
    font-weight: 400;
    background: white;
    color: #235ba8;
    transform: skewX(-30deg);
  }

  h1 {
    color: white;
    font-size: 6rem;
    margin: 0;
    padding-top: 20px;
  }

  h3 {
    color: white;
    font-size: 2.5rem;
    margin-top: 0;
  }

  h3 span {
    color: #c065ff;
  }

  .queue-wrapper .queue-item.playing {
    background: #63c165;
  }

  .queue-wrapper .queue-item.playing span {
    color: #ffed97;
  }

  .queue-wrapper .queue-item.on-deck {
    background: #ffed97;
  }

  .queue-wrapper .queue-item.on-deck span {
    color: #eb0405;
  }
  .queue-wrapper {
    font-size: 1.6rem;
  }

  .queue-wrapper .queue-item {
    background: #c065ff;
    color: #280137;
    transform: skewX(30deg);
  }

  .queue-wrapper .queue-item span {
    color: #ffed97;
  }
</style>
