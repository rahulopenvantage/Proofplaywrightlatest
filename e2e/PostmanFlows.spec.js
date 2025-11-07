import { test, expect } from '@playwright/test';
import { ApiHelper } from '../backend/ApiHelper.js';

test.describe('API Integration Tests', () => {
  test('should send alerts to all API endpoints and receive 200', async () => {
    const apiHelper = new ApiHelper();
    
    // Validate API configuration
    if (!apiHelper.validateApiConfig()) {
      throw new Error('API configuration is invalid. Check environment variables.');
    }

    console.log('🚀 Testing all 4 API endpoints...');

    const [r1, r2, r3, r4] = await Promise.all([
      apiHelper.sendAlert('trex_public'),
      apiHelper.sendAlert('trex_private'), 
      apiHelper.sendAlert('unusual_behaviour'),
      apiHelper.sendAlert('public_lpr'),
    ]);

    const results = [r1, r2, r3, r4];
    const alertTypes = ['trex_public', 'trex_private', 'unusual_behaviour', 'public_lpr'];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const alertType = alertTypes[i];
      
      console.log(`✅ [${alertType.toUpperCase()}] Status: ${result.status}, Success: ${result.ok}`);
      expect(result.status, `Unexpected status ${result.status} for ${alertType}`).toBe(200);
      expect(result.ok, `API call failed for ${alertType}`).toBe(true);
    }
    
    console.log('🎉 All API endpoints working correctly!');
  });
});
