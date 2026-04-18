import axios from 'axios';
import { getCurrentBaseURL } from './databaseService';

function getBaseURL() {
  return getCurrentBaseURL() || 'http://localhost:3001';
}

export const backendClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

backendClient.interceptors.request.use((config) => {
  config.baseURL = getBaseURL();
  return config;
});

