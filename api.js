import axios from 'axios';

// Crie uma instância do Axios com a URL base da sua API
const api = axios.create({
  baseURL: 'http://170.81.43.172:5000', // URL do seu servidor Express
  timeout: 10000,
});

export const getMinutas = async () => {
  try {
    const response = await api.get('/minuta');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter minutas:', error.message);
  }
};

export const createMinuta = async (minutaData) => {
  try {
    const response = await api.post('/minuta', minutaData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar minuta:', error.message);
  }
};

// Adicione outras funções CRUD conforme necessário
