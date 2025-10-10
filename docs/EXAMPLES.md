# 🎩 Examples & Best Practices

This guide demonstrates common usage patterns and best practices for the Copilot Studio Agent Direct Line MCP Server.

## Common Usage Patterns

### Pattern 1: Simple Q&A Flow

Perfect for single-question interactions where you don't need ongoing conversation context.

```javascript
// 1. Start conversation with question
const start = await callTool("start_conversation", {
  initialMessage: "What are your business hours?"
});

// 2. Agent responds automatically in start response
console.log(start.response); // "We're open Monday-Friday, 9AM-5PM EST."

// 3. End conversation
await callTool("end_conversation", {
  conversationId: start.conversationId
});
```

**When to use:**
- FAQ lookups
- Quick information retrieval
- Simple status checks
- Single-turn interactions

---

### Pattern 2: Multi-Turn Conversation

For complex interactions requiring back-and-forth dialogue and context retention.

```javascript
// 1. Start without initial message
const conv = await callTool("start_conversation", {});

// 2. Send first message
const msg1 = await callTool("send_message", {
  message: "I need help with my order",
  conversationId: conv.conversationId
});

// 3. Continue conversation
const msg2 = await callTool("send_message", {
  message: "Order number: 12345",
  conversationId: conv.conversationId
});

// 4. Get full history
const history = await callTool("get_conversation_history", {
  conversationId: conv.conversationId
});

// 5. End when done
await callTool("end_conversation", {
  conversationId: conv.conversationId
});
```

**When to use:**
- Customer support interactions
- Multi-step workflows
- Information gathering processes
- Complex problem solving

---

### Pattern 3: Auto-Create Conversation (Quick Messages)

Simplest pattern for ad-hoc messages without manual conversation management.

```javascript
// Send message without starting conversation first
// MCP server automatically creates conversation
const response = await callTool("send_message", {
  message: "Quick question: Do you ship internationally?"
});

// Use returned conversationId for follow-ups
const followUp = await callTool("send_message", {
  message: "What countries do you ship to?",
  conversationId: response.conversationId
});
```

**When to use:**
- Rapid prototyping
- Quick tests
- Casual queries
- When conversation management isn't critical

---

### Pattern 4: Context Recovery

For recovering from interruptions or connection issues.

```javascript
// Conversation was interrupted, need to recover context
const history = await callTool("get_conversation_history", {
  conversationId: "abc123xyz789",
  limit: 5  // Get last 5 messages
});

// Review context, then continue
const nextMessage = await callTool("send_message", {
  message: "Continuing from before...",
  conversationId: "abc123xyz789"
});
```

**When to use:**
- After network interruptions
- Session recovery
- Debugging conversation flow
- Handoff between systems

---

## Best Practices by Scenario

### E-Commerce Customer Support

```javascript
async function handleCustomerInquiry(userMessage, orderId) {
  // Start with context
  const conv = await callTool("start_conversation", {
    initialMessage: `I need help with order ${orderId}: ${userMessage}`
  });

  // Store conversation ID for session
  sessionStorage.setItem('activeConversationId', conv.conversationId);

  return {
    response: conv.response,
    conversationId: conv.conversationId
  };
}

async function continueSupport(userMessage) {
  const conversationId = sessionStorage.getItem('activeConversationId');

  if (!conversationId) {
    // Fallback to new conversation
    return handleCustomerInquiry(userMessage, "unknown");
  }

  try {
    const response = await callTool("send_message", {
      message: userMessage,
      conversationId
    });
    return response;
  } catch (error) {
    if (error.code === "ConversationError") {
      // Conversation expired, start new one
      sessionStorage.removeItem('activeConversationId');
      return handleCustomerInquiry(userMessage, "unknown");
    }
    throw error;
  }
}
```

### Knowledge Base Q&A

```javascript
async function askKnowledgeBase(question) {
  // Use auto-create pattern for simplicity
  const response = await callTool("send_message", {
    message: question
  });

  // Clean up after single Q&A
  await callTool("end_conversation", {
    conversationId: response.conversationId
  });

  return response.response;
}

// Batch questions (with cleanup)
async function askMultipleQuestions(questions) {
  const answers = [];

  for (const question of questions) {
    const answer = await askKnowledgeBase(question);
    answers.push({ question, answer });
  }

  return answers;
}
```

### Long-Running Conversations with Periodic Summaries

```javascript
class ConversationManager {
  constructor() {
    this.conversationId = null;
    this.messageCount = 0;
  }

  async start(initialMessage) {
    const conv = await callTool("start_conversation", {
      initialMessage
    });
    this.conversationId = conv.conversationId;
    this.messageCount = 1;
    return conv.response;
  }

  async send(message) {
    if (!this.conversationId) {
      throw new Error("No active conversation. Call start() first.");
    }

    const response = await callTool("send_message", {
      message,
      conversationId: this.conversationId
    });

    this.messageCount++;

    // Get summary every 10 messages
    if (this.messageCount % 10 === 0) {
      await this.getSummary();
    }

    return response.response;
  }

  async getSummary() {
    const history = await callTool("get_conversation_history", {
      conversationId: this.conversationId,
      limit: 10
    });

    console.log(`Summary of last ${history.messageCount} messages:`);
    history.messages.forEach(msg => {
      console.log(`[${msg.from}]: ${msg.text}`);
    });
  }

  async end() {
    if (this.conversationId) {
      await callTool("end_conversation", {
        conversationId: this.conversationId
      });
      this.conversationId = null;
      this.messageCount = 0;
    }
  }
}
```

## Error Handling Patterns

### Graceful Degradation

```javascript
async function robustSendMessage(message, conversationId) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      return await callTool("send_message", {
        message,
        conversationId
      });
    } catch (error) {
      attempts++;

      if (error.code === "ConversationError" && attempts === 1) {
        // Try starting new conversation
        console.log("Conversation expired, starting new one");
        const newConv = await callTool("start_conversation", {
          initialMessage: message
        });
        conversationId = newConv.conversationId;
        return newConv;
      }

      if (error.code === "CircuitBreakerError") {
        // Wait before retry
        await sleep(60000 * attempts);
        continue;
      }

      if (attempts >= maxAttempts) {
        throw error;
      }

      // Exponential backoff
      await sleep(1000 * Math.pow(2, attempts));
    }
  }
}
```

### Timeout Handling

```javascript
async function sendWithTimeout(message, conversationId, timeoutMs = 30000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
  });

  const sendPromise = callTool("send_message", {
    message,
    conversationId
  });

  try {
    return await Promise.race([sendPromise, timeoutPromise]);
  } catch (error) {
    if (error.message === "Request timeout") {
      console.error("Request timed out, conversation may still be active");
      // Optionally end conversation to clean up
      await callTool("end_conversation", { conversationId }).catch(() => {});
    }
    throw error;
  }
}
```

## Integration Examples

### React Hook

```typescript
import { useState, useCallback } from 'react';

interface Message {
  from: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function useCopilotStudioAgent() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const startConversation = useCallback(async (initialMessage?: string) => {
    setIsLoading(true);
    try {
      const response = await callTool("start_conversation", {
        initialMessage
      });

      setConversationId(response.conversationId);

      if (initialMessage && response.response) {
        setMessages([
          { from: 'user', text: initialMessage, timestamp: new Date() },
          { from: 'bot', text: response.response, timestamp: new Date() }
        ]);
      }

      return response;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!conversationId) {
      return await startConversation(message);
    }

    setIsLoading(true);
    setMessages(prev => [...prev, {
      from: 'user',
      text: message,
      timestamp: new Date()
    }]);

    try {
      const response = await callTool("send_message", {
        message,
        conversationId
      });

      setMessages(prev => [...prev, {
        from: 'bot',
        text: response.response,
        timestamp: new Date()
      }]);

      return response;
    } catch (error) {
      // Remove user message on failure
      setMessages(prev => prev.slice(0, -1));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, startConversation]);

  const endConversation = useCallback(async () => {
    if (conversationId) {
      await callTool("end_conversation", { conversationId });
      setConversationId(null);
      setMessages([]);
    }
  }, [conversationId]);

  return {
    conversationId,
    messages,
    isLoading,
    startConversation,
    sendMessage,
    endConversation
  };
}
```

### Express.js API Endpoint

```javascript
const express = require('express');
const router = express.Router();

router.post('/api/chat', async (req, res) => {
  const { message, conversationId } = req.body;

  try {
    let response;

    if (conversationId) {
      // Continue existing conversation
      response = await callTool("send_message", {
        message,
        conversationId
      });
    } else {
      // Start new conversation
      response = await callTool("start_conversation", {
        initialMessage: message
      });
    }

    res.json({
      success: true,
      conversationId: response.conversationId,
      response: response.response,
      activityId: response.activityId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/api/chat/:conversationId', async (req, res) => {
  try {
    const response = await callTool("end_conversation", {
      conversationId: req.params.conversationId
    });

    res.json({
      success: true,
      messageCount: response.messageCount,
      duration: response.duration
    });
  } catch (error) {
    console.error('End conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

## Performance Tips

1. **Reuse Conversations**: Don't create new conversations for every message
2. **End Conversations**: Always clean up when done to free server resources
3. **Batch History Requests**: Use the `limit` parameter to fetch only what you need
4. **Cache Responses**: Consider caching frequently asked questions
5. **Monitor Circuit Breaker**: Implement monitoring for circuit breaker state changes

## Testing Tips

1. **Use Short Timeouts**: Test conversation expiration with reduced timeout values
2. **Mock Direct Line**: Create mock responses for unit testing
3. **Test Error Paths**: Simulate failures to ensure graceful degradation
4. **Verify Cleanup**: Ensure conversations are properly ended in test teardown
5. **Load Testing**: Test with multiple concurrent conversations

## Next Steps

- **Troubleshooting**: See [Troubleshooting Guide](./TROUBLESHOOTING.md) for common issues
- **Configuration**: Review [Configuration Guide](./CONFIGURATION.md) for advanced settings
- **Usage Guide**: Check [Usage Guide](./USAGE_GUIDE.md) for detailed tool reference
- **Architecture**: Understand the design in [Architecture Documentation](./ARCHITECTURE.md)
