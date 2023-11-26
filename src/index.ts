import { Hono } from 'hono/quick'
import { cache } from 'hono/cache'
import { sha256 } from 'hono/utils/crypto'
import { jwt } from 'hono/jwt'
import { detectType } from './utils'

type Bindings = {
  BUCKET: R2Bucket
  JWT_SECRET: string
  IDENTIFY_KEY: string
}

type Data = {
  body: string
  width?: string
  height?: string
}

const maxAge = 60 * 60 * 24 * 30

const app = new Hono<{ Bindings: Bindings }>()

app.use(
	"*",
	jwt({
		secret: "Rubw4ZVY3G%7",
		alg: "HS256"
	})
)

app.put('/upload', async (c) => {
  const data = await c.req.json<Data>()
  const base64 = data.body
  if (base64.length < 10) return c.notFound()

  const type = detectType(base64)
  if (!type) return c.notFound()

  const payload = c.get('jwtPayload')

  const body = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

  let key

  if (data.width && data.height) {
    key = payload.ID + "/" + (await sha256(body)) + `_${data.width}x${data.height}` + '.' + type?.suffix
  } else {
    key = payload.ID + "/" + (await sha256(body)) + '.' + type?.suffix
  }

  await c.env.BUCKET.put(key, body, { httpMetadata: { contentType: type.mimeType } })

  return c.text(key)
})

app.get(
  '*',
  cache({
    cacheName: 'r2-image-worker'
  })
)

app.get('/:id/:key', async (c) => {
  const key = c.req.param('key');
  const id = c.req.param('id');

  const object = await c.env.BUCKET.get(id + "/" + key)
  if (!object) return c.notFound()
  const data = await object.arrayBuffer()
  const contentType = object.httpMetadata?.contentType ?? ''

  return c.body(data, 200, {
    'Cache-Control': `public, max-age=${maxAge}`,
    'Content-Type': contentType
  })
})

export default app