import axios from 'axios';

async function checkServer() {
  console.log('Checking what is running on port 8000...');
  try {
    const res = await axios.get('http://localhost:8000/api/v1/system/health');
    console.log('Health check passed. NestJS is running!');
    console.log(res.data);
  } catch (err: any) {
    console.log('Health check failed! Response:');
    if (err.response) {
      console.log(err.response.status, err.response.data);
    } else {
      console.log(err.message);
    }
  }
}

checkServer();
