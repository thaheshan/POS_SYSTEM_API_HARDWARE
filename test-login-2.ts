import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function testLogin2() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@futurasolutions.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Futura@Admin123';

  console.log('Testing login API with wrong email...');
  try {
    const res = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email: 'doesnotexist@example.com',
      password,
    });
    console.log('✅ Login successful!');
  } catch (err: any) {
    if (err.response) {
      console.log('Data for wrong user:', JSON.stringify(err.response.data, null, 2));
    }
  }

  console.log('Testing login API with wrong password...');
  try {
    const res = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email,
      password: 'WrongPassword123!',
    });
    console.log('✅ Login successful!');
  } catch (err: any) {
    if (err.response) {
      console.log('Data for wrong pass:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testLogin2();
