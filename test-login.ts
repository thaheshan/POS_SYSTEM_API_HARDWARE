import axios from 'axios';

async function testLogin() {
  console.log('Testing login API directly...');
  try {
    const res = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email: 'admin@futurasolutions.com',
      password: 'Futura@Admin123',
    });
    console.log('✅ Login successful!');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log('❌ Login failed!');
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.log('Error:', err.message);
    }
  }
}

testLogin();
