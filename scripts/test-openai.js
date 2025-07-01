// Simple script to test OpenAI API key
// Run with: node scripts/test-openai.js <your-api-key>

const apiKey = process.argv[2] || process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Please provide an API key as an argument or set OPENAI_API_KEY environment variable');
  process.exit(1);
}

console.log(`Testing API key: ${apiKey.substring(0, 7)}...`);

async function testApiKey() {
  try {
    // Test the models endpoint (lightweight call)
    console.log('Testing models endpoint...');
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!modelsResponse.ok) {
      const errorText = await modelsResponse.text();
      console.error(`❌ API request failed: ${modelsResponse.status}`);
      console.error(errorText);
      return false;
    }

    const models = await modelsResponse.json();
    console.log(`✅ Successfully retrieved ${models.data.length} models`);
    
    // Now test a simple chat completion
    console.log('\nTesting chat completion endpoint...');
    const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10
      })
    });

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      console.error(`❌ Chat completion failed: ${completionResponse.status}`);
      console.error(errorText);
      return false;
    }

    const completion = await completionResponse.json();
    console.log('✅ Chat completion successful');
    console.log(`Response: "${completion.choices[0].message.content}"`);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

testApiKey().then(success => {
  if (success) {
    console.log('\n✅ API key is working correctly');
  } else {
    console.error('\n❌ API key validation failed');
  }
}); 