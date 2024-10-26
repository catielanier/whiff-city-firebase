<script lang="ts">
    import {onMount} from "svelte";
    import {getDatabase, ref, onValue} from 'firebase/database';
    import {firebase} from "../utils/firebase";
    import type {Commentator} from "../utils/types";

    let commentators: Commentator[];

    onMount(async () => {
        const database = getDatabase(firebase);
        const commentatorReference = ref(database, '/commentators')
        onValue(commentatorReference, res => {
            commentators = res.val();
        })
    });
</script>

<div class="commentators">
    {#if commentators?.length}
        <div class="wrapper">
            <div class="left-commentator">
                <div class="commentator-name">
                    <span class="commentator-info"><span class="team-name">{commentators[0].teamName}</span> {commentators[0].commentatorName}</span>
                </div>
                <div class="commentator-socials">
                    <span class="commentator-info">@{commentators[0].xHandle}</span>
                </div>
            </div>
            <div class="right-commentator">
                <div class="commentator-name">
                    <span class="commentator-info"><span class="team-name">{commentators[1].teamName}</span> {commentators[1].commentatorName}</span>
                </div>
                <div class="commentator-socials">
                    <span class="commentator-info">@{commentators[1].xHandle}</span>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');
    .commentators {
        width: 100%;
    }
    .wrapper {
        font-family: 'Audiowide', sans-serif;
        font-weight: 400;
        font-style: normal;
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
    .wrapper .left-commentator .commentator-name {
        background: #FFED97;
        transform: skewX(30deg);
        font-size: 30px;
    }
    .wrapper .left-commentator .commentator-socials {
        background: #EB0405;
        transform: skewX(30deg);
        color: white;
        font-size: 25px;
        margin-left: 25px;
        margin-right: -25px;
    }
    .wrapper .left-commentator .commentator-info {
        display: block;
        transform: skewX(-30deg);
    }
    .wrapper .left-commentator .commentator-info .team-name {
        color: #235BA8
    }
    .wrapper .left-commentator .commentator-socials .commentator-info {
        transform: skewX(-30deg) translateX(-25px);
    }
    .wrapper .right-commentator .commentator-name {
        background: #235BA8;
        transform: skewX(-30deg);
        color: white;
        font-size: 30px;
    }
    .wrapper .right-commentator .commentator-name .team-name {
        color: #FFED97;
    }
    .wrapper .right-commentator .commentator-info {
        display: block;
        transform: skewX(30deg);
    }
    .wrapper .right-commentator .commentator-socials {
        background: #EB0405;
        transform: skewX(-30deg);
        color: white;
        font-size: 25px;
        margin-left: -25px;
        margin-right: 25px;
    }
    .wrapper .left-commentator {
        margin-right: 72px;
    }
    .wrapper .right-commentator .commentator-socials .commentator-info {
        transform: skewX(30deg) translateX(25px);
    }
</style>