function parseErrorMessage(text: string): string {
  try {
    const json = JSON.parse(text) as { error?: string }
    if (json.error) return json.error
  } catch {
    // not JSON
  }
  return text
}

export const api = {
  async post(path: string, body: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(parseErrorMessage(await res.text()))
    return res.json()
  },
  async patch(path: string, body: unknown) {
    const res = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(parseErrorMessage(await res.text()))
    return res.json()
  },
  async delete(path: string) {
    const res = await fetch(path, { method: 'DELETE' })
    if (!res.ok) throw new Error(parseErrorMessage(await res.text()))
    return res.json()
  },
  async get(path: string) {
    const res = await fetch(path)
    if (!res.ok) throw new Error(parseErrorMessage(await res.text()))
    return res.json()
  },
}
