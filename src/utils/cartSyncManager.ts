// Cart Synchronization Manager
// This utility helps keep frontend and backend cart states in sync

import { cartApi } from '../services/apiService';
import { getCartItems, saveCartItems } from '../utils/cartStorage';
import { getUser } from '../services/userService';

export interface CartSyncResult {
  success: boolean;
  localItems: any[];
  backendItems: any[];
  synced: boolean;
  issues: string[];
}

// Sync local cart with backend cart
export const syncCartWithBackend = async (): Promise<CartSyncResult> => {
  console.log('🔄 Starting cart synchronization...');
  
  const result: CartSyncResult = {
    success: false,
    localItems: [],
    backendItems: [],
    synced: false,
    issues: []
  };

  try {
    // Get local cart items
    const localItems = await getCartItems();
    result.localItems = localItems || [];
    console.log('📱 Local cart items:', result.localItems.length);

    // Get current user
    const user = await getUser();
    if (!user) {
      result.issues.push('No user logged in');
      return result;
    }

    // Get backend cart items
    const backendResponse = await cartApi.getCart(user.id);
    if (backendResponse.success && backendResponse.data) {
      result.backendItems = Array.isArray(backendResponse.data) 
        ? backendResponse.data 
        : backendResponse.data.items || [];
      console.log('🌐 Backend cart items:', result.backendItems.length);
    } else {
      console.log('🌐 Backend cart is empty or failed to fetch');
      result.backendItems = [];
    }

    // Compare and sync
    const syncRequired = !arraysEqual(
      result.localItems.map(item => ({ id: item.productId || item.id, qty: item.quantity })),
      result.backendItems.map(item => ({ id: item.productId || item.id, qty: item.quantity }))
    );

    if (syncRequired) {
      console.log('🔄 Cart sync required - items differ between local and backend');
      
      // For now, prioritize local cart (user's latest actions)
      // Push local cart state to backend
      for (const localItem of result.localItems) {
        try {
          const productId = localItem.productId || localItem.id;
          await cartApi.updateQuantity(productId, localItem.quantity);
          console.log(`✅ Synced item ${productId} with quantity ${localItem.quantity}`);
        } catch (error) {
          console.warn(`⚠️ Failed to sync item ${localItem.productId || localItem.id}:`, error);
          result.issues.push(`Failed to sync item ${localItem.productId || localItem.id}`);
        }
      }
      
      result.synced = true;
    } else {
      console.log('✅ Cart already in sync');
      result.synced = true;
    }

    result.success = true;

  } catch (error) {
    console.error('❌ Cart sync failed:', error);
    result.issues.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('🔄 Cart sync completed:', result);
  return result;
};

// Helper function to compare arrays
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  
  const sortedA = [...a].sort((x, y) => x.id.localeCompare(y.id));
  const sortedB = [...b].sort((x, y) => x.id.localeCompare(y.id));
  
  return sortedA.every((item, index) => {
    const otherItem = sortedB[index];
    return item.id === otherItem.id && item.qty === otherItem.qty;
  });
}

// Remove item with better error handling
export const removeItemSafely = async (productId: string): Promise<{ success: boolean; error?: string }> => {
  console.log('🗑️ Safely removing item from cart:', productId);
  
  try {
    // First try POST with quantity 0 (usually more reliable)
    let result = await cartApi.removeItem(productId);
    
    if (result.success) {
      console.log('✅ Item removed via POST quantity=0');
      return { success: true };
    }
    
    // If POST fails, try DELETE
    result = await cartApi.deleteItem(productId);
    
    if (result.success) {
      console.log('✅ Item removed via DELETE');
      return { success: true };
    }
    
    // If both fail with "not found", consider it success
    if (result.error?.includes('not found') || result.error?.includes('Item not found')) {
      console.log('✅ Item already removed (not found in backend)');
      return { success: true };
    }
    
    console.error('❌ Failed to remove item:', result.error);
    return { success: false, error: result.error };
    
  } catch (error) {
    console.error('❌ Error removing item:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Add/update item with better error handling  
export const updateItemSafely = async (productId: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
  console.log('🔄 Safely updating cart item:', { productId, quantity });
  
  if (quantity === 0) {
    return removeItemSafely(productId);
  }
  
  try {
    // Use the smart cart operation
    const result = await cartApi.smartCartOperation(productId, quantity, false);
    
    if (result.success) {
      console.log('✅ Item updated successfully');
      return { success: true };
    }
    
    console.error('❌ Failed to update item:', result.error);
    return { success: false, error: result.error };
    
  } catch (error) {
    console.error('❌ Error updating item:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};