<script lang="ts">
  import {onDestroy, onMount} from "svelte";
  import {Router, Route} from "svelte-routing";
  import {io, Socket} from "socket.io-client";
  import Home from "./routes/Home.svelte";
  import Update from "./routes/Update.svelte";
  import Login from "./routes/Login.svelte";
  import Scoreboard from "./routes/Scoreboard.svelte";
  import Commentators from "./routes/Commentators.svelte";
  import type {Commentator, Player, ScoreboardResponse} from "./utils/types";
  import axios from "axios";
  import {objectToCamel} from "ts-case-convert";
  import {getToken} from "./utils/tokenService";

  let loggedIn: boolean | null;
  let socket: Socket | null;

  export const setLogin = (): void => {
    loggedIn = true;
  }

  const retrieveScoreboard = async (): Promise<void> => {
    const { data } = await axios.get<ScoreboardResponse>("/api/scoreboard");
    players = objectToCamel(data.player_scores);
  }

  onMount(() => {
    loggedIn = !!getToken();
    if (loggedIn) {
      retrieveScoreboard();
    }
    socket = io();
    socket.on('connect', () => {
      console.log('connection established')
    })
    socket.on('scoreboard_updated', () => {
      retrieveScoreboard();
    })
  })

  let players: Player[] = []
  let commentators: Commentator[] = []

  let url: string = "";
  onDestroy(() => {
    socket?.disconnect()
    console.log('connection closed')
  })
</script>

<Router {url}>
  <main>
    {#if loggedIn}
      <Route path="/" component={Home} />
      <Route path="/update" component={Update} />
    {:else}
      <Route path="/"><Login {setLogin} /></Route>
    {/if}
    <Route path="/scoreboard" component={Scoreboard} />
    <Route path="/commentators" component={Commentators} />
  </main>
</Router>
