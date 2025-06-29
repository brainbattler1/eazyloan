// Test the Personal Access Token with Supabase Management API
const pat = 'sbp_d76ca85e95ec2124df7f12c63581e8dda544bef8';

async function testPAT() {
  console.log('Testing Personal Access Token with Supabase Management API...');
  
  try {
    // Test listing projects using the Management API
    const response = await fetch('https://api.supabase.com/v1/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ PAT is working! Found projects:', data.length || 0);
      if (data.length > 0) {
        console.log('First project:', data[0]);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ PAT failed. Error response:', errorText);
    }
  } catch (error) {
    console.log('❌ Exception occurred:', error.message);
  }
}

testPAT().catch(console.error);