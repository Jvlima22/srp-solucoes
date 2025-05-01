import axios from 'axios';

// Crie uma instância do Axios com a URL base da sua API
const api = axios.create({
  baseURL: 'http://170.81.43.172:5000', // URL do seu servidor Express
  timeout: 10000,
});

