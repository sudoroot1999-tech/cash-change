/**
 * k6 Auth Load Tests
 * Performance testing for authentication endpoints
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { config, jsonHeaders, randomEmail, checkResponse, defaultOptions } from './k6-config.js';

// Test options - select based on TEST_TYPE env variable
const testType = __ENV.TEST_TYPE || 'smoke';
export const options = defaultOptions[testType];

// Shared test data
const testPassword = 'LoadTest123!';
let sharedToken = null;

export function setup() {
  // Register a user that will be used across all VUs for login tests
  const email = `shared-${randomEmail()}`;
  
  const registerRes = http.post(
    `${config.baseUrl}/auth/register`,
    JSON.stringify({ email, password: testPassword }),
    { headers: jsonHeaders() }
  );
  
  if (registerRes.status === 201) {
    const data = registerRes.json();
    return {
      sharedEmail: email,
      sharedToken: data.accessToken,
      sharedRefreshToken: data.refreshToken,
    };
  }
  
  return { sharedEmail: null, sharedToken: null };
}

export default function(data) {
  group('Auth Load Tests', function() {
    
    group('Registration', function() {
      const email = randomEmail();
      
      const res = http.post(
        `${config.baseUrl}/auth/register`,
        JSON.stringify({ email, password: testPassword }),
        { headers: jsonHeaders() }
      );
      
      const success = check(res, {
        'registration successful': (r) => r.status === 201 || r.status === 409,
        'has access token': (r) => r.status !== 201 || r.json().accessToken !== undefined,
      });
      
      checkResponse(res, res.status === 201 ? 201 : 409);
      sleep(0.5);
    });
    
    group('Login', function() {
      if (!data.sharedEmail) {
        console.log('No shared user available for login test');
        return;
      }
      
      const res = http.post(
        `${config.baseUrl}/auth/login`,
        JSON.stringify({ 
          email: data.sharedEmail, 
          password: testPassword 
        }),
        { headers: jsonHeaders() }
      );
      
      const success = check(res, {
        'login successful': (r) => r.status === 200,
        'has access token': (r) => r.json().accessToken !== undefined,
        'response time < 300ms': (r) => r.timings.duration < 300,
      });
      
      checkResponse(res, 200);
      
      if (res.status === 200) {
        sharedToken = res.json().accessToken;
      }
      
      sleep(0.3);
    });
    
    group('Get Profile', function() {
      if (!sharedToken && !data.sharedToken) {
        return;
      }
      
      const token = sharedToken || data.sharedToken;
      
      const res = http.get(
        `${config.baseUrl}/users/me`,
        { headers: jsonHeaders(token) }
      );
      
      check(res, {
        'profile retrieved': (r) => r.status === 200 || r.status === 401,
        'response time < 200ms': (r) => r.timings.duration < 200,
      });
      
      checkResponse(res, res.status);
      sleep(0.2);
    });
    
    group('Token Refresh', function() {
      if (!data.sharedRefreshToken) {
        return;
      }
      
      const res = http.post(
        `${config.baseUrl}/auth/refresh`,
        JSON.stringify({ refreshToken: data.sharedRefreshToken }),
        { headers: jsonHeaders() }
      );
      
      check(res, {
        'refresh successful': (r) => r.status === 200 || r.status === 401,
        'new token received': (r) => r.status !== 200 || r.json().accessToken !== undefined,
      });
      
      checkResponse(res, res.status);
      sleep(0.3);
    });
    
    group('Invalid Login', function() {
      const res = http.post(
        `${config.baseUrl}/auth/login`,
        JSON.stringify({ 
          email: 'nonexistent@test.com', 
          password: 'wrongpassword' 
        }),
        { headers: jsonHeaders() }
      );
      
      check(res, {
        'invalid login rejected': (r) => r.status === 401,
      });
      
      // Don't count expected 401s as errors
      sleep(0.2);
    });
  });
  
  sleep(1);
}

export function teardown(data) {
  // Cleanup: could logout shared user
  console.log(`Auth load test completed for ${testType} profile`);
}
