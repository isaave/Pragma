import axios from 'axios';

// Cria uma instância do Axios apontando para o backend do Laravel
const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api', // Endereço base da nossa API
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor opcional: se já tivermos um token guardado, injeta-o automaticamente nos pedidos
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pragma_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;