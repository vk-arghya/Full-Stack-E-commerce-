import api from './api';

export async function createRazorpayOrder(payload){
  const {data}=await api.post('/payments/create-order',payload);
  return data;
}

export async function verifyRazorpayPayment(payload){
  const {data}=await api.post('/payments/verify',payload);
  if(!data.verified)throw new Error('Razorpay payment verification failed.');
  return data;
}

export async function createFinalOrder(payload){
  const {data}=await api.post('/orders/finalize',payload);
  return data;
}
