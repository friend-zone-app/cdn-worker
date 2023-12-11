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

app.post('/upload', async (c) => {
  const data = await c.req.blob()
  const type = data.type

  console.log(data, type)

  if(!data || typeof type != "string") return c.notFound();

  const mimeType = detectType(type);
  if(!mimeType) return c.notFound();

  const payload = c.get('jwtPayload');

  const name = payload.ID + "/" + (await sha256(Date.now())) + '.' + mimeType.suffix

  console.log(name)

  try{
    await c.env.BUCKET.put(name, data, { httpMetadata: c.req.raw.headers }).catch(e => console.log(e))
  
    return c.text(name);
  } catch(e) {
    console.log(e)
    return c.notFound();
  }
  
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