import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function testLogin() {
  console.log('Testing login API directly...');
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@futurasolutions.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Futura@Admin123';
  try {
    const res = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email,
      password,
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
