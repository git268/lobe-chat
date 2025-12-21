/**
 * Test script to verify GitHub Models list retrieval
 * 
 * This script demonstrates how the GitHub Models list is fetched:
 * 1. Initializes the LobeGithubAI runtime with a token
 * 2. Calls the models() method to fetch the list
 * 3. Displays the enhanced model data
 * 
 * Usage:
 *   GITHUB_TOKEN=your_token tsx src/libs/agent-runtime/github/demo-model-list.ts
 */

import { LobeGithubAI } from './index';

async function demonstrateModelListRetrieval() {
  console.log('GitHub Models List Retrieval Demo');
  console.log('='.repeat(50));
  console.log();

  // Check if token is provided
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('Error: GITHUB_TOKEN environment variable is required');
    console.log('\nUsage:');
    console.log('  GITHUB_TOKEN=your_token tsx src/libs/agent-runtime/github/demo-model-list.ts');
    process.exit(1);
  }

  try {
    console.log('1. Initializing GitHub Models runtime...');
    const runtime = new LobeGithubAI({ apiKey: githubToken });
    console.log('   ✓ Runtime initialized');
    console.log('   Base URL: https://models.inference.ai.azure.com');
    console.log();

    console.log('2. Fetching model list from GitHub Models API...');
    const models = await runtime.models();
    console.log(`   ✓ Retrieved ${models.length} models`);
    console.log();

    console.log('3. Model List Details:');
    console.log('-'.repeat(50));

    // Group models by capability
    const withFunctionCall = models.filter(m => m.functionCall);
    const withVision = models.filter(m => m.vision);
    const withReasoning = models.filter(m => m.reasoning);
    const enabled = models.filter(m => m.enabled);

    console.log(`\nTotal Models: ${models.length}`);
    console.log(`  - With Function Calling: ${withFunctionCall.length}`);
    console.log(`  - With Vision: ${withVision.length}`);
    console.log(`  - With Reasoning: ${withReasoning.length}`);
    console.log(`  - Enabled by Default: ${enabled.length}`);
    console.log();

    console.log('Sample Models:');
    console.log('-'.repeat(50));
    
    // Display first 5 models as examples
    models.slice(0, 5).forEach((model, index) => {
      console.log(`\n${index + 1}. ${model.displayName} (${model.id})`);
      const desc = model.description || 'No description available';
      console.log(`   Description: ${desc.length > 80 ? desc.substring(0, 80) + '...' : desc}`);
      console.log(`   Capabilities:`);
      console.log(`     - Function Call: ${model.functionCall ? '✓' : '✗'}`);
      console.log(`     - Vision: ${model.vision ? '✓' : '✗'}`);
      console.log(`     - Reasoning: ${model.reasoning ? '✓' : '✗'}`);
      if (model.contextWindowTokens) {
        console.log(`   Context Window: ${model.contextWindowTokens.toLocaleString()} tokens`);
      }
      console.log(`   Enabled: ${model.enabled ? 'Yes' : 'No'}`);
    });

    console.log();
    console.log('='.repeat(50));
    console.log('Demo completed successfully!');
    console.log();
    console.log('Key Points:');
    console.log('  1. Models are fetched from: https://models.inference.ai.azure.com');
    console.log('  2. API response is enhanced with local metadata');
    console.log('  3. Capabilities are detected via keywords and configuration');
    console.log('  4. Each model includes context window, abilities, and enable status');

  } catch (error: any) {
    console.error('\n❌ Error fetching models:');
    console.error(`   ${error.message || error}`);
    
    if (error.errorType) {
      console.error(`   Error Type: ${error.errorType}`);
    }
    
    if (error.status === 401) {
      console.error('\n   This is likely an authentication issue.');
      console.error('   Please verify:');
      console.error('   1. Your GitHub token is valid');
      console.error('   2. You have access to GitHub Models (waitlist approved)');
      console.error('   3. The token has appropriate permissions');
    }
    
    process.exit(1);
  }
}

// Run the demo
demonstrateModelListRetrieval();
