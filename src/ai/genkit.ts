
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {togetherAI} from '@genkit-ai/togetherai'; // Import the Together AI plugin
import { config } from 'dotenv';

config(); // Load environment variables from .env file

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GOOGLE_API_KEY}),
    // togetherAI({apiKey: process.env.TOGETHER_API_KEY}) // Add Together AI plugin
  ],
  // Note: Removed the global 'model: googleai/gemini-2.0-flash' setting.
  // When using multiple model providers (Google AI, Together AI),
  // it's best to specify the model directly in your ai.generate() calls
  // or within specific flow/prompt definitions to ensure clarity and avoid conflicts.
  // For example: await ai.generate({ model: 'googleai/gemini-2.0-flash', ... })
  // or await ai.generate({ model: 'togetherai/together-ai-model-name', ... })
});

