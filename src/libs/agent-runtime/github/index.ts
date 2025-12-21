import type { ChatModelCard } from '@/types/llm';

import { AgentRuntimeErrorType } from '../error';
import { ModelProvider } from '../types';
import { LobeOpenAICompatibleFactory } from '../utils/openaiCompatibleFactory';
import { pruneReasoningPayload } from '../utils/openaiHelpers';

/**
 * GitHub Models API response structure
 * Represents a single model returned from the GitHub Models marketplace
 * @see https://github.com/marketplace/models
 */
export interface GithubModelCard {
  /** Detailed description of the model's capabilities */
  description: string;
  /** Human-friendly display name for the model */
  friendly_name: string;
  /** Unique identifier for the model */
  id: string;
  /** Model name used in API calls */
  name: string;
  /** Tags for categorizing the model */
  tags: string[];
  /** Primary task the model is designed for (e.g., 'chat-completion') */
  task: string;
}

/* eslint-enable typescript-sort-keys/interface */

/**
 * GitHub Models Runtime Implementation
 *
 * This runtime enables integration with GitHub Models marketplace, which provides
 * free access to various AI models including GPT-4o, Llama, Mistral, and others.
 *
 * ## How Model List Retrieval Works:
 *
 * 1. **API Endpoint**: Uses OpenAI-compatible API at https://models.inference.ai.azure.com
 * 2. **Authentication**: Requires a GitHub Personal Access Token
 * 3. **Model Discovery**: Calls `client.models.list()` to fetch available models dynamically
 * 4. **Model Enhancement**: Merges API response with local model metadata to add:
 *    - Context window sizes
 * - Model capabilities (function calling, vision, reasoning)
 *    - Enable/disable flags
 *
 * ## Model Capability Detection:
 *
 * The implementation uses keyword matching and local configuration to determine:
 * - **Function Calling**: Models with 'function' or 'tool' in description
 * - **Vision**: Models with 'vision' in description
 * - **Reasoning**: Models like o1, o3, deepseek-r1
 *
 * @example
 * ```typescript
 * const runtime = new LobeGithubAI({ apiKey: 'github_token' });
 * const models = await runtime.models();
 * // Returns array of ChatModelCard with enhanced metadata
 * ```
 */
export const LobeGithubAI = LobeOpenAICompatibleFactory({
  baseURL: 'https://models.inference.ai.azure.com',
  chatCompletion: {
    handlePayload: (payload) => {
      const { model } = payload;

      // Special handling for reasoning models (o1, o3 series)
      // These models don't support streaming and require specific parameter pruning
      if (model.startsWith('o1') || model.startsWith('o3')) {
        return { ...pruneReasoningPayload(payload), stream: false } as any;
      }

      return { ...payload, stream: payload.stream ?? true };
    },
  },
  debug: {
    chatCompletion: () => process.env.DEBUG_GITHUB_CHAT_COMPLETION === '1',
  },
  errorType: {
    bizError: AgentRuntimeErrorType.ProviderBizError,
    invalidAPIKey: AgentRuntimeErrorType.InvalidGithubToken,
  },
  /**
   * Fetches and processes the GitHub Models list
   *
   * This function:
   * 1. Calls the GitHub Models API to get the current list of available models
   * 2. Merges API data with local model configuration (LOBE_DEFAULT_MODEL_LIST)
   * 3. Detects model capabilities using keyword matching
   * 4. Returns a standardized ChatModelCard array
   *
   * @param client - OpenAI-compatible client configured for GitHub Models API
   * @returns Promise resolving to an array of ChatModelCard objects
   */
  models: async ({ client }) => {
    // Import local model configuration containing additional metadata
    const { LOBE_DEFAULT_MODEL_LIST } = await import('@/config/aiModels');

    // Keywords for detecting model capabilities from descriptions
    const functionCallKeywords = ['function', 'tool'];
    const visionKeywords = ['vision'];
    const reasoningKeywords = ['deepseek-r1', 'o1', 'o3'];

    // Fetch model list from GitHub Models API
    // Note: client.models.list() returns OpenAI-compatible response
    const modelsPage = (await client.models.list()) as any;
    const modelList: GithubModelCard[] = modelsPage.body;

    // Transform and enhance model data
    return modelList
      .map((model) => {
        // Try to find matching model in local configuration
        const knownModel = LOBE_DEFAULT_MODEL_LIST.find(
          (m) => model.name.toLowerCase() === m.id.toLowerCase(),
        );

        return {
          // Use context window from local config, otherwise undefined
          contextWindowTokens: knownModel?.contextWindowTokens ?? undefined,
          description: model.description,
          displayName: model.friendly_name,
          // Enable model if it's in our known list
          enabled: knownModel?.enabled || false,
          // Detect function calling capability from description or local config
          functionCall:
            functionCallKeywords.some((keyword) =>
              model.description.toLowerCase().includes(keyword),
            ) ||
            knownModel?.abilities?.functionCall ||
            false,
          id: model.name,
          // Detect reasoning capability from model name or local config
          reasoning:
            reasoningKeywords.some((keyword) => model.name.toLowerCase().includes(keyword)) ||
            knownModel?.abilities?.reasoning ||
            false,
          // Detect vision capability from description or local config
          vision:
            visionKeywords.some((keyword) => model.description.toLowerCase().includes(keyword)) ||
            knownModel?.abilities?.vision ||
            false,
        };
      })
      .filter(Boolean) as ChatModelCard[];
  },
  provider: ModelProvider.Github,
});
