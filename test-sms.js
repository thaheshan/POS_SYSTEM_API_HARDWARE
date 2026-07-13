const axios = require('axios');

async function testSMS() {
  const API_URL = 'https://app.text.lk/api/v3/sms/send';
  const API_TOKEN = '5712|3BWcH4C9bFA69kplnjXmXlauJmxG1HIsPuXef5RF1eafd116';
  const SENDER_ID = 'TextLKDemo';

  try {
    const response = await axios.post(
      API_URL,
      {
        recipient: '94756645486',
        sender_id: SENDER_ID,
        type: 'plain',
        message: 'This is a test message from Node API script',
      },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    console.log('SUCCESS:', response.status, response.data);
  } catch (error) {
    console.error('ERROR:', error.response ? error.response.data : error.message);
  }
}

testSMS();
