import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const isAuthenticated = ref(false);
    const errorMsg = ref('');

    const defaultCredentials = {
        user: 'administrador',
        pass: '12345678A*'
    }

    function login(user: string, pass: string) {
        if (user.trim() === defaultCredentials.user && pass.trim() === defaultCredentials.pass) {
            isAuthenticated.value = true;
            errorMsg.value = '';
            return true;
        }
        errorMsg.value = 'Credenciales incorrectas. Por favor, inténtalo de nuevo.';
        return false;

    }

    function logout() { isAuthenticated.value = false; }

    return {
        isAuthenticated,
        errorMsg,
        defaultCredentials,
        login,
        logout
    }


})