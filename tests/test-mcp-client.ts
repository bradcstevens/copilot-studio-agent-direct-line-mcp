/**
 * Test MCP client to verify server functionality
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMCPServer() {
  console.log('🧪 Testing MCP Server...\n');

  // Create client transport by spawning the server process
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
  });

  // Create MCP client
  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // Connect to server
    console.log('📡 Connecting to MCP server...');
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: List available tools
    console.log('📋 Test 1: Listing available tools');
    const toolsResponse = await client.listTools();
    console.log(`Found ${toolsResponse.tools.length} tools:`);
    toolsResponse.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Test 2: Start a new conversation
    console.log('🆕 Test 2: Starting new conversation');
    const startResult = await client.callTool({
      name: 'start_conversation',
      arguments: {
        initialMessage: 'Hello from MCP test client!',
      },
    });
    console.log('Response:', JSON.parse(startResult.content[0].text));
    const conversationData = JSON.parse(startResult.content[0].text);
    const conversationId = conversationData.conversationId;
    console.log('');

    // Test 3: Send a message to the conversation
    console.log('💬 Test 3: Sending message to conversation');
    const sendResult = await client.callTool({
      name: 'send_message',
      arguments: {
        message: 'What can you help me with?',
        conversationId,
      },
    });
    console.log('Response:', JSON.parse(sendResult.content[0].text));
    console.log('');

    // Test 4: Get conversation history
    console.log('📜 Test 4: Getting conversation history');
    const historyResult = await client.callTool({
      name: 'get_conversation_history',
      arguments: {
        conversationId,
        limit: 5,
      },
    });
    const history = JSON.parse(historyResult.content[0].text);
    console.log(`Message count: ${history.messageCount}/${history.totalMessages}`);
    console.log('');

    // Test 5: End the conversation
    console.log('🛑 Test 5: Ending conversation');
    const endResult = await client.callTool({
      name: 'end_conversation',
      arguments: {
        conversationId,
      },
    });
    console.log('Response:', JSON.parse(endResult.content[0].text));
    console.log('');

    // Test 6: Try to use ended conversation (should fail)
    console.log('❌ Test 6: Testing error handling (using ended conversation)');
    try {
      await client.callTool({
        name: 'send_message',
        arguments: {
          message: 'This should fail',
          conversationId,
        },
      });
      console.log('⚠️  Expected error but succeeded');
    } catch (error) {
      console.log('✅ Correctly rejected ended conversation');
      const errorResponse = JSON.parse((error as any).content[0].text);
      console.log('Error:', errorResponse.message);
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    await client.close();
    serverProcess.kill();
  }
}

// Run tests
testMCPServer().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
