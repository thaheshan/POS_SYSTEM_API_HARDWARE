import axios from 'axios';

async function testLogin2() {
  console.log('Testing login API with wrong email...');
  try {
    const res = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email: 'doesnotexist@example.com',
      password: 'Futura@Admin123',
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
      email: 'admin@futurasolutions.com',
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
