# GitHub Models Integration - Model List Retrieval

This document explains how LobeChat retrieves and processes the GitHub Models list.

## Overview

GitHub Models is a marketplace offering free access to various AI models including GPT-4o, Llama, Mistral, and others. LobeChat integrates with GitHub Models to allow users to interact with these models.

**Note**: GitHub Models is different from GitHub Copilot. This integration is specifically for the GitHub Models marketplace, not the GitHub Copilot coding assistant.

## Architecture

### 1. API Endpoint

The GitHub Models service uses an OpenAI-compatible API endpoint:

```
https://models.inference.ai.azure.com
```

### 2. Authentication

Authentication requires a GitHub Personal Access Token (PAT). Users can obtain this from:
- https://github.com/settings/tokens

The token must have appropriate permissions and the user must be accepted into the GitHub Models waitlist.

### 3. Model List Retrieval Process

The model list retrieval happens in `/src/libs/agent-runtime/github/index.ts`:

```typescript
// Step 1: Call the GitHub Models API
const modelsPage = await client.models.list();
const modelList = modelsPage.body;

// Step 2: Enhance with local metadata
const enhancedModels = modelList.map(model => {
  const knownModel = LOBE_DEFAULT_MODEL_LIST.find(
    m => model.name.toLowerCase() === m.id.toLowerCase()
  );
  
  return {
    // Merge API data with local config
    ...
  };
});
```

#### Step-by-Step Process:

1. **API Call**: The `client.models.list()` method calls the GitHub Models API
2. **Response Parsing**: Extracts model data from the response body
3. **Metadata Merging**: Matches API models with local configuration from `/src/config/aiModels/github.ts`
4. **Capability Detection**: Determines model capabilities through:
   - Keyword matching in descriptions
   - Local configuration data
   - Model name patterns

### 4. Model Capability Detection

The system detects three main capabilities:

#### Function Calling
- **Keywords**: "function", "tool" in model description
- **Local Config**: `abilities.functionCall` flag
- **Example**: GPT-4o, Llama 3.3

#### Vision
- **Keywords**: "vision" in model description
- **Local Config**: `abilities.vision` flag
- **Example**: GPT-4o, Llama 3.2 Vision

#### Reasoning
- **Model Names**: Models starting with "o1", "o3", or containing "deepseek-r1"
- **Local Config**: `abilities.reasoning` flag
- **Example**: OpenAI o1, o3-mini, DeepSeek R1
- **Note**: These models don't support streaming

## Data Flow

```
┌─────────────────┐
│   User Request  │
│  (Get Models)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  API Route Handler          │
│  /webapi/chat/models/github │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Agent Runtime Init         │
│  (with GitHub token)        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  LobeGithubAI.models()      │
│  - Fetch from API           │
│  - Load local config        │
│  - Merge & enhance data     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Return ChatModelCard[]     │
│  (Enhanced model list)      │
└─────────────────────────────┘
```

## Configuration Files

### Local Model Configuration

File: `/src/config/aiModels/github.ts`

This file contains:
- Static list of known GitHub Models
- Model metadata (context windows, capabilities)
- Enable/disable flags
- Display names and descriptions

### Provider Configuration

File: `/src/config/modelProviders/github.ts`

This file contains:
- Provider-level settings
- Default model list
- Model fetcher settings
- Documentation URLs

## API Response Structure

The GitHub Models API returns:

```typescript
interface GithubModelCard {
  id: string;              // Unique identifier
  name: string;            // Model name for API calls
  friendly_name: string;   // Display name
  description: string;     // Capability description
  tags: string[];          // Model tags
  task: string;            // Primary task (e.g., 'chat-completion')
}
```

## Enhanced Model Card

After processing, models are returned as:

```typescript
interface ChatModelCard {
  id: string;                    // Model identifier
  displayName: string;           // Friendly name
  description: string;           // Model description
  enabled: boolean;              // Whether enabled by default
  contextWindowTokens?: number;  // Max context size
  maxOutput?: number;            // Max output tokens
  functionCall: boolean;         // Supports function calling
  vision: boolean;               // Supports image inputs
  reasoning: boolean;            // Uses chain-of-thought reasoning
}
```

## Usage Example

### Frontend: Get Available Models

```typescript
// User navigates to settings and selects GitHub provider
// Frontend calls: GET /webapi/chat/models/github

const response = await fetch('/webapi/chat/models/github', {
  headers: {
    Authorization: `Bearer ${userToken}`
  }
});

const models = await response.json();
// Returns: ChatModelCard[]
```

### Backend: Process Model Request

```typescript
// Route: /webapi/chat/models/[provider]/route.ts
const agentRuntime = await initAgentRuntimeWithUserPayload('github', {
  apiKey: userGithubToken
});

const modelList = await agentRuntime.models();
// Returns enhanced model list
```

## Testing

Test file: `/src/libs/agent-runtime/github/index.test.ts`

The tests verify:
- Initialization with API key
- Error handling (invalid token, API errors)
- Model list retrieval
- Capability detection
- Special handling for reasoning models

## Rate Limits

GitHub Models has usage limits:
- Requests per minute
- Requests per day
- Tokens per request
- Concurrent requests

These limits vary by model type. See: https://docs.github.com/en/github-models/prototyping-with-ai-models#rate-limits

## Troubleshooting

### Models Not Loading

1. **Check Token**: Ensure GitHub token is valid and not expired
2. **Waitlist**: Verify user is approved for GitHub Models access
3. **API Endpoint**: Confirm `https://models.inference.ai.azure.com` is accessible
4. **Rate Limits**: Check if rate limits have been exceeded

### Missing Model Capabilities

1. **Update Local Config**: Add model to `/src/config/aiModels/github.ts`
2. **Keyword Detection**: Ensure model description contains capability keywords
3. **Refresh Model List**: Clear cache and re-fetch from API

## Related Files

- `/src/libs/agent-runtime/github/index.ts` - Main runtime implementation
- `/src/config/aiModels/github.ts` - Local model metadata
- `/src/config/modelProviders/github.ts` - Provider configuration
- `/src/app/(backend)/webapi/chat/models/[provider]/route.ts` - API route
- `/docs/usage/providers/github.mdx` - User documentation

## References

- [GitHub Models Marketplace](https://github.com/marketplace/models)
- [GitHub Models Documentation](https://docs.github.com/en/github-models)
- [OpenAI API Compatibility](https://platform.openai.com/docs/api-reference)
