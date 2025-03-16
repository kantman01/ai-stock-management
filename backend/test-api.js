const fetch = require('node-fetch');


const API_URL = 'http://localhost:5000/api';
let authToken = null;


async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  
  if (authToken && !options.noAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  
  const requestOptions = {
    method: options.method || 'GET',
    headers,
    ...options
  };
  
  
  if (options.body && requestOptions.method !== 'GET') {
    requestOptions.body = JSON.stringify(options.body);
  }
  
  try {
    console.log(`${requestOptions.method} ${url}`);
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    
    return {
      status: response.status,
      data,
      ok: response.ok
    };
  } catch (error) {
    console.error('Request failed:', error);
    return {
      status: 500,
      data: { message: error.message },
      ok: false
    };
  }
}


async function testLogin(email, password) {
  console.log('\n--- Testing Login ---');
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    noAuth: true
  });
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.ok && response.data.token) {
    authToken = response.data.token;
    console.log('Authentication token saved');
  }
  
  return response;
}

async function testGetCurrentUser() {
  console.log('\n--- Testing Get Current User ---');
  
  const response = await apiRequest('/auth/me');
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  return response;
}

async function testGetUsers() {
  console.log('\n--- Testing Get All Users ---');
  
  const response = await apiRequest('/users');
  
  console.log('Status:', response.status);
  console.log('Number of users:', response.data.users ? response.data.users.length : 0);
  if (response.data.users && response.data.users.length > 0) {
    console.log('First user:', JSON.stringify(response.data.users[0], null, 2));
  } else {
    console.log('Response:', JSON.stringify(response.data, null, 2));
  }
  
  return response;
}

async function testGetRoles() {
  console.log('\n--- Testing Get Roles ---');
  
  const response = await apiRequest('/users/roles');
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  return response;
}

async function testCreateUser(userData) {
  console.log('\n--- Testing Create User ---');
  
  const response = await apiRequest('/users', {
    method: 'POST',
    body: userData
  });
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  return response;
}


async function runTests() {
  try {
    
    const loginResponse = await testLogin('admin@example.com', 'admin123');
    
    if (!loginResponse.ok) {
      console.log('Login failed, stopping tests');
      return;
    }
    
    
    await testGetCurrentUser();
    
    
    await testGetUsers();
    
    
    const rolesResponse = await testGetRoles();
    
    if (rolesResponse.ok && rolesResponse.data.roles) {
      
      const adminRoleId = rolesResponse.data.roles.find(role => role.code === 'administrator').id;
      
      await testCreateUser({
        email: 'test@example.com',
        password: 'test123',
        firstName: 'Test',
        lastName: 'User',
        roleId: adminRoleId,
        isActive: true
      });
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}


runTests(); 