import { Hono } from 'hono'

// ---------- Firebase config ----------
const firebaseConfig = {
  apiKey: "AIzaSyC07Gs8L5vxlUmC561PKbxthewA1mrxYDk",
  authDomain: "zylos-test.firebaseapp.com",
  databaseURL: "https://zylos-test-default-rtdb.firebaseio.com",
  projectId: "zylos-test",
  storageBucket: "zylos-test.firebasestorage.app",
  messagingSenderId: "553027007913",
  appId: "1:553027007913:web:2daa37ddf2b2c7c20b00b8"
}

// Firebase Auth REST endpoints
const signUpUrl   = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`
const signInUrl   = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`

type Credentials = {
  email: string
  password: string
}

// ---------- Hono app ----------
const app = new Hono()

// Serve the React client (client/index.html) من داخل الـ Worker
//   يقوم Wrangler بإدراج الملفات الساكنة داخل bundle تحت import.meta.glob.
//   لكن لأننا لا نستعمل CLI محلياً، أبسط حل هو تضمين الصفحة كسلسلة نصية.
const html = await (async () => {
  // يحاول قراءة الملف لو كان مضمن فى الـ Bundle
  try {
    // @ts-ignore - هذه الخاصية يضيفها esbuild تلقائياً
    return await (await import('../client/index.html?raw')).default as string
  } catch {
    return `
      <!DOCTYPE html><html><body>
      <h2>⚠︎ تعذر العثور على واجهة React</h2>
      </body></html>`
  }
})()

app.get('/', c => c.html(html))

// ---------- API ----------
app.post('/signup', async c => {
  const { email, password } = await c.req.json<Credentials>()
  const res = await fetch(signUpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  })
  const data = await res.json<any>()
  if (!res.ok) return c.json(data, 400)

  // خزّن بيانات المستخدم فى قاعدة Realtime
  await fetch(`${firebaseConfig.databaseURL}/users/${data.localId}.json?auth=${data.idToken}`, {
    method: 'PUT',
    body: JSON.stringify({ email })
  })
  return c.json({ uid: data.localId })
})

app.post('/login', async c => {
  const { email, password } = await c.req.json<Credentials>()
  const res = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  })
  const data = await res.json<any>()
  if (!res.ok) return c.json(data, 400)
  return c.json({ uid: data.localId })
})

export default app