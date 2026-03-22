exports.handler = async function(event, context) {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if(!GEMINI_API_KEY){
    return { statusCode: 500, body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const messages = body.messages || [];
    const userMsg = messages.find(m => m.role === 'user');
    
    let parts = [];
    if(Array.isArray(userMsg?.content)){
      userMsg.content.forEach(c => {
        if(c.type === 'text'){
          parts.push({ text: c.text });
        } else if(c.type === 'image'){
          parts.push({
            inline_data: {
              mime_type: c.source.media_type,
              data: c.source.data
            }
          });
        }
      });
    } else if(typeof userMsg?.content === 'string'){
      parts.push({ text: userMsg.content });
    }

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0.0,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data));
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Extracted text:', text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text }] })
    };

  } catch(e) {
    console.log('Error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
