// services/otherModelService.ts
import axios from 'axios';

export const getOtherModelResponse = async (prompt: string) => {
  const response = await axios.post('/api/other', { prompt });
  return response.data.response;
};