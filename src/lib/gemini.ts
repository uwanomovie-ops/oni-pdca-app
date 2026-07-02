const GEMINI_MODEL = 'gemini-2.5-flash'

export interface GeminiCallResult {
  text: string
  finishReason?: string
}

export async function callGemini(
  apiKey: string,
  prompt: string,
  maxOutputTokens = 8192
): Promise<GeminiCallResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens,
          responseMimeType: 'application/json',
          // 2.5 Flash は thinking に出力予算を消費し JSON が途中切れになることがある
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini APIエラー: ${err}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text ?? ''
  const finishReason = candidate?.finishReason as string | undefined

  if (!text.trim()) {
    throw new Error(`Gemini API: 空の応答 (finishReason=${finishReason ?? 'unknown'})`)
  }

  return { text, finishReason }
}
