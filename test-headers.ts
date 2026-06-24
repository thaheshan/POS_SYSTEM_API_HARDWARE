import axios from 'axios';

async function testHeaders() {
  console.log('Sending request to port 8000 to see who answers...');
  try {
    const res = await axios.get('http://localhost:8000/');
    console.log('Status:', res.status);
    console.log('Headers:', res.headers);
    console.log('Data:', res.data);
  } catch (err: any) {
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Headers:', err.response.headers);
      console.log('Data:', err.response.data);
    } else {
      console.log('Error:', err.message);
    }
  }
}

testHeaders();
