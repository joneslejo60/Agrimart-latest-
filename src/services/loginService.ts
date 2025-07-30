// frontend/src/services/loginService.ts

import { authApi } from './apiService';
import type { ApiResponse } from './apiConfig';

/**
 * Generate OTP for the given phone number
 * @param {string} phoneNumber - The phone number to send OTP to
 * @returns {Promise<ApiResponse>} - Response from the API
 */
export const generateOtp = async (phoneNumber: string): Promise<ApiResponse> => {
  console.log('Generating OTP for:', phoneNumber);
  const response = await authApi.generateOtp(phoneNumber);
  
  if (response.success) {
    console.log('OTP Generated successfully');
  } else {
    console.error('Failed to generate OTP:', response.error);
  }
  
  return response;
};

/**
 * Verify OTP for the given phone number
 * @param {string} phoneNumber - The phone number
 * @param {string} otp - The OTP to verify
 * @returns {Promise<ApiResponse>} - Response from the API
 */
export const verifyOtp = async (phoneNumber: string, otp: string): Promise<ApiResponse> => {
  console.log('Verifying OTP for:', phoneNumber);
  const response = await authApi.verifyOtp(phoneNumber, otp);
  
  if (response.success) {
    console.log('OTP Verified successfully');
  } else {
    console.error('Failed to verify OTP:', response.error);
  }
  
  return response;
};
