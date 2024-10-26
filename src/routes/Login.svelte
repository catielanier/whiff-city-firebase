<script lang="ts">
    import axios from "axios";
    import {setToken} from "../utils/tokenService";
    export let setLogin: () => void;
    let email: string = '';
    let password: string = '';
    let error: string | null;

    const submitLogin = async (e: Event): Promise<void> => {
        e.preventDefault();
        const res = await axios.post('/api/users/login', {
            email,
            password
        });
        if (res.data.status === 201) {
            setToken(res.data.token);
            setLogin();
        } else {
            error = 'Invalid email or password';
        }
    }
</script>

<div class="login">
    <form on:submit={submitLogin}>
        <input type="email" bind:value={email} placeholder="Email address" />
        <input type="password" bind:value={password} placeholder="Password" />
        <button type="submit">Login</button>
    </form>
</div>