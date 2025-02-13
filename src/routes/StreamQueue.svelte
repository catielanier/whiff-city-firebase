<script lang="ts">
    import {onMount} from "svelte";
    import {getDatabase, onValue, ref} from "firebase/database";
    import type {QueuedMatch} from "../utils/types";
    import {firebase} from "../utils/firebase";

    let queue: QueuedMatch[] = [];

    onMount(() => {
        const db = getDatabase(firebase)
        const queueRef = ref(db, "streamQueue");
        onValue(queueRef, snapshot => queue = snapshot.val());
    })
</script>

<div class="stream-queue">
    <h1>Stream Queue:</h1>
    <h3>Twitch Channel: <span>BarrieWhiffCity</span></h3>
    <div class="queue-wrapper">
        <div class="queue-header">
            <div>Position</div>
            <div>Left Player</div>
            <div>Right Player</div>
            <div>Game</div>
        </div>
        {#each queue as match, i}
            <div class="queue-item {i === 0 && 'playing'} {i === 1 && 'on-deck'}">
                <div>{#if i === 0}Playing{:else if i === 1}On Deck{:else}{i + 1}{/if}</div>
                <div><span>{match.players[0].teamName}</span> {match.players[0].name}</div>
                <div><span>{match.players[1].teamName}</span> {match.players[1].name}</div>
                <div>{match.game}</div>
            </div>
        {/each}
    </div>
</div>