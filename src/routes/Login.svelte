<script lang="ts">
    import axios from "axios";
    import {setToken} from "../utils/tokenService";
    import {getAuth, signInWithEmailAndPassword, type UserCredential} from 'firebase/auth'
    import {firebase} from '../utils/firebase';
    export let setLogin: () => void;
    let email: string = '';
    let password: string = '';

    const submitLogin = async (e: Event): Promise<void> => {
        e.preventDefault();
        const auth = getAuth(firebase);
        signInWithEmailAndPassword(auth, email, password).then((user: UserCredential) => {
            setToken(JSON.stringify(user));
            setLogin();
        })
    }
</script>

<div class="login">
    <form on:submit={submitLogin}>
        <input type="email" bind:value={email} placeholder="Email address" />
        <input type="password" bind:value={password} placeholder="Password" />
        <button type="submit">Login</button>
    </form>
</div>