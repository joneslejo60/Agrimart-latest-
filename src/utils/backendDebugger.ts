// Backend Issue Debugger
// This utility helps identify backend database/persistence issues

import { API_BASE_URL } from '../services/apiConfig';
import { getAuthToken } from '../services/userService';

export interface BackendHealthCheck {
  apiReachable: boolean;
  databaseConnected: boolean;
  authWorking: boolean;
  swaggerAvailable: boolean;
  timestamp: string;
  issues: string[];
}

export const checkBackendHealth = async (): Promise<BackendHealthCheck> => {
  console.log('🔍 === BACKEND HEALTH CHECK START ===');
  
  const result: BackendHealthCheck = {
    apiReachable: false,
    databaseConnected: false,
    authWorking: false,
    swaggerAvailable: false,
    timestamp: new Date().toISOString(),
    issues: []
  };

  // 1. Check if API is reachable
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
      }
    });
    result.apiReachable = response.ok;
    if (!response.ok) {
      result.issues.push(`API health check failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    result.issues.push(`API not reachable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 2. Check if Swagger is available
  try {
    const response = await fetch(`${API_BASE_URL}/swagger`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      }
    });
    result.swaggerAvailable = response.ok;
    if (!response.ok) {
      result.issues.push(`Swagger UI not available: ${response.status}`);
    }
  } catch (error) {
    result.issues.push(`Swagger check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 3. Test authentication
  const token = await getAuthToken();
  if (token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Authentication/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
        }
      });
      result.authWorking = response.ok;
      if (!response.ok) {
        result.issues.push(`Authentication test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      result.issues.push(`Auth test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    result.issues.push('No authentication token available');
  }

  // 4. Test database persistence by creating and retrieving data
  if (token && result.authWorking) {
    try {
      // Try to create a test product (if you have admin permissions)
      const testProduct = {
        name: `Test Product ${Date.now()}`,
        description: 'Test product for database persistence check',
        price: 99.99,
        stockQuantity: 1,
        categoryId: 1,
        isActive: true
      };

      const createResponse = await fetch(`${API_BASE_URL}/api/Manager/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(testProduct)
      });

      if (createResponse.ok) {
        console.log('🔍 Test product creation response:', createResponse.status);
        
        // Try to retrieve all products to see if our test product persists
        setTimeout(async () => {
          try {
            const getResponse = await fetch(`${API_BASE_URL}/api/Products`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true',
              }
            });
            
            if (getResponse.ok) {
              const products = await getResponse.json();
              const testProductExists = products.some((p: any) => p.name.includes('Test Product'));
              result.databaseConnected = testProductExists;
              
              if (!testProductExists) {
                result.issues.push('Database persistence issue: Test product not found after creation');
                console.log('🔍 Available products:', products.map((p: any) => p.name));
              }
            }
          } catch (error) {
            result.issues.push(`Database check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }, 2000); // Wait 2 seconds for database to persist
        
      } else {
        const errorText = await createResponse.text();
        result.issues.push(`Test product creation failed: ${createResponse.status} - ${errorText}`);
      }
    } catch (error) {
      result.issues.push(`Database persistence test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('🔍 BACKEND HEALTH RESULT:', result);
  console.log('🔍 === BACKEND HEALTH CHECK END ===');
  
  return result;
};

// Check if backend is using in-memory database or mock data
export const checkDatabaseType = async (): Promise<{
  isInMemory: boolean;
  isPersistent: boolean;
  evidence: string[];
}> => {
  console.log('🔍 === DATABASE TYPE CHECK ===');
  
  const evidence: string[] = [];
  let isInMemory = false;
  let isPersistent = false;

  const token = await getAuthToken();
  if (!token) {
    evidence.push('No auth token - cannot perform database type check');
    return { isInMemory: false, isPersistent: false, evidence };
  }

  try {
    // Create a unique test item
    const testId = `test-${Date.now()}`;
    const testProduct = {
      name: testId,
      description: 'Database persistence test',
      price: 1.00,
      stockQuantity: 1,
      categoryId: 1,
      isActive: true
    };

    // Create the item
    const createResponse = await fetch(`${API_BASE_URL}/api/Manager/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(testProduct)
    });

    if (createResponse.ok) {
      evidence.push('✅ Test product created successfully');
      
      // Wait and check if it persists
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const getResponse = await fetch(`${API_BASE_URL}/api/Products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        }
      });
      
      if (getResponse.ok) {
        const products = await getResponse.json();
        const testExists = products.some((p: any) => p.name === testId);
        
        if (testExists) {
          evidence.push('✅ Test product found after creation - database appears persistent');
          isPersistent = true;
        } else {
          evidence.push('❌ Test product NOT found after creation - likely in-memory/mock data');
          isInMemory = true;
        }
        
        evidence.push(`Found ${products.length} total products in database`);
      } else {
        evidence.push(`❌ Could not retrieve products: ${getResponse.status}`);
      }
    } else {
      const errorText = await createResponse.text();
      evidence.push(`❌ Could not create test product: ${createResponse.status} - ${errorText}`);
    }

  } catch (error) {
    evidence.push(`❌ Database type check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('🔍 DATABASE TYPE CHECK RESULT:', { isInMemory, isPersistent, evidence });
  
  return { isInMemory, isPersistent, evidence };
};