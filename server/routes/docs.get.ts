const swaggerUi = `
<div id="swagger-ui"></div>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
<script>window.onload = () => { window.ui = SwaggerUIBundle({ dom_id: '#swagger-ui', url: '/schema' }) }</script>
`

export default defineEventHandler((event) => {
	setHeader(event, "content-type", "text/html; charset=utf-8")
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MusicBackend API</title></head><body>${swaggerUi}</body></html>`
})
