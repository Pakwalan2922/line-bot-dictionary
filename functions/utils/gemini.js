const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const axios = require("axios");

const multimodal = async (imageBinary) => {
  // For text-and-image input (multimodal), use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  const prompt = "ช่วยบรรยายภาพนี้ให้หน่อย";
  const mimeType = "image/png";

  // Convert image binary to a GoogleGenerativeAI.Part object.
  const imageParts = [
    {
      inlineData: {
        data: Buffer.from(imageBinary, "binary").toString("base64"),
        mimeType
      }
    }
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  const text = result.response.text();
  return text;
};

const chat = async (prompt) => {
  try {
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${prompt}`);
    //let information = await response.data;
    //information = JSON.stringify(information);
    
    let meaningsByPartOfSpeech = { noun: [], verb: [] };

    response.data.forEach(entry => {
      entry.meanings.forEach(meaning => {
        const partOfSpeech = meaning.partOfSpeech;
        if ((partOfSpeech === 'noun' || partOfSpeech === 'verb') && meaning.definitions.length > 0) {
          meaningsByPartOfSpeech[partOfSpeech].push(meaning.definitions[0].definition);
        }
      });
    });

    let formatMeanings = '';
    for (const [partOfSpeech, definitions] of Object.entries(meaningsByPartOfSpeech)) {
      if (definitions.length > 0) {
        formatMeanings += `${partOfSpeech}: ${definitions.join('; ')}\n`;
      }
    }

    console.log('Formatted Meanings:\n', formatMeanings);

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
        {
          role: "model",
          parts: [{ 
            text: `Answer the question using the text below. Respond with only the text provided.\nQuestion: ${prompt}\nText: ${formatMeanings}` 
          }],
        },
      ]
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error:', error);
    throw new Error('There was an error processing.');
  }
};

module.exports = { multimodal, chat };