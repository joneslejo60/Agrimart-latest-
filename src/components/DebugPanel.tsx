// Debug Panel Component
// Add this temporarily to your CartScreen to debug authentication and backend issues

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { debugAuth, testCartApi } from '../utils/authDebugger';
import { checkBackendHealth, checkDatabaseType } from '../utils/backendDebugger';
import { syncCartWithBackend } from '../utils/cartSyncManager';

interface DebugPanelProps {
  visible?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ visible = true }) => {
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const addOutput = (message: string) => {
    setDebugOutput(prev => prev + '\n' + message);
    console.log(message);
  };

  const clearOutput = () => {
    setDebugOutput('');
  };

  const runAuthDebug = async () => {
    if (isRunning) return;
    setIsRunning(true);
    clearOutput();
    
    try {
      addOutput('🔍 === AUTHENTICATION DEBUG ===');
      const authInfo = await debugAuth();
      
      addOutput(`✅ Has Token: ${authInfo.hasToken}`);
      addOutput(`📱 User ID: ${authInfo.user?.id || 'None'}`);
      addOutput(`👤 User Role: ${authInfo.user?.role || 'None'}`);
      addOutput(`📧 User Email: ${authInfo.user?.email || 'None'}`);
      addOutput(`🌐 API Base URL: ${authInfo.apiBaseUrl}`);
      
      if (authInfo.tokenExpiry) {
        const isExpired = new Date(authInfo.tokenExpiry) < new Date();
        addOutput(`⏰ Token Expiry: ${authInfo.tokenExpiry} ${isExpired ? '(EXPIRED!)' : '(Valid)'}`);
      }
      
    } catch (error) {
      addOutput(`❌ Auth debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runCartTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    clearOutput();
    
    try {
      addOutput('🔍 === CART API TEST ===');
      const results = await testCartApi();
      
      addOutput(`GET /api/Cart - Status: ${results.getResult.success ? 'SUCCESS' : 'FAILED'}`);
      if (!results.getResult.success) {
        addOutput(`GET Error: ${results.getResult.error}`);
      }
      
      addOutput(`POST /api/Cart - Status: ${results.postResult.success ? 'SUCCESS' : 'FAILED'}`);
      if (!results.postResult.success) {
        addOutput(`POST Error: ${results.postResult.error}`);
      }
      
    } catch (error) {
      addOutput(`❌ Cart test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runBackendCheck = async () => {
    if (isRunning) return;
    setIsRunning(true);
    clearOutput();
    
    try {
      addOutput('🔍 === BACKEND HEALTH CHECK ===');
      const health = await checkBackendHealth();
      
      addOutput(`🌐 API Reachable: ${health.apiReachable ? '✅' : '❌'}`);
      addOutput(`🔐 Auth Working: ${health.authWorking ? '✅' : '❌'}`);
      addOutput(`📖 Swagger Available: ${health.swaggerAvailable ? '✅' : '❌'}`);
      addOutput(`💾 Database Connected: ${health.databaseConnected ? '✅' : '❌'}`);
      
      if (health.issues.length > 0) {
        addOutput('\n🚨 ISSUES FOUND:');
        health.issues.forEach(issue => addOutput(`• ${issue}`));
      }
      
      // Also check database type
      addOutput('\n🔍 === DATABASE TYPE CHECK ===');
      const dbType = await checkDatabaseType();
      addOutput(`📂 Is In-Memory: ${dbType.isInMemory ? '❌ YES' : '✅ NO'}`);
      addOutput(`💾 Is Persistent: ${dbType.isPersistent ? '✅ YES' : '❌ NO'}`);
      
      if (dbType.evidence.length > 0) {
        addOutput('\n📋 EVIDENCE:');
        dbType.evidence.forEach(evidence => addOutput(`• ${evidence}`));
      }
      
    } catch (error) {
      addOutput(`❌ Backend check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runCartSync = async () => {
    if (isRunning) return;
    setIsRunning(true);
    clearOutput();
    
    try {
      addOutput('🔄 === CART SYNCHRONIZATION ===');
      const syncResult = await syncCartWithBackend();
      
      addOutput(`📱 Local Items: ${syncResult.localItems.length}`);
      addOutput(`🌐 Backend Items: ${syncResult.backendItems.length}`);
      addOutput(`🔄 Sync Required: ${syncResult.synced ? 'YES (completed)' : 'NO'}`);
      addOutput(`✅ Success: ${syncResult.success ? 'YES' : 'NO'}`);
      
      if (syncResult.issues.length > 0) {
        addOutput('\n🚨 SYNC ISSUES:');
        syncResult.issues.forEach(issue => addOutput(`• ${issue}`));
      }
      
    } catch (error) {
      addOutput(`❌ Cart sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const showResults = () => {
    Alert.alert(
      'Debug Results',
      debugOutput || 'No debug output yet. Run a test first.',
      [{ text: 'OK' }]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Panel</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.authButton]}
          onPress={runAuthDebug}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '⏳' : '🔐'} Auth Debug
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.cartButton]}
          onPress={runCartTest}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '⏳' : '🛒'} Cart Test
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.backendButton]}
          onPress={runBackendCheck}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '⏳' : '🔍'} Backend Check
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.syncButton]}
          onPress={runCartSync}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '⏳' : '🔄'} Cart Sync
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearOutput}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.button, styles.showButton]}
        onPress={showResults}
      >
        <Text style={styles.buttonText}>📋 Show Results</Text>
      </TouchableOpacity>
      
      {debugOutput.length > 0 && (
        <ScrollView style={styles.output}>
          <Text style={styles.outputText}>{debugOutput}</Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  authButton: {
    backgroundColor: '#007bff',
  },
  cartButton: {
    backgroundColor: '#28a745',
  },
  backendButton: {
    backgroundColor: '#ffc107',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  syncButton: {
    backgroundColor: '#17a2b8',
  },
  showButton: {
    backgroundColor: '#6f42c1',
    marginTop: 4,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  output: {
    maxHeight: 150,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  outputText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#333',
  },
});

export default DebugPanel;