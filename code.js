const res = await fetch("https://api-translate-livid.vercel.app/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer TU_API_KEY"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 100
    })
  });
  