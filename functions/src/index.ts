import { https } from 'firebase-functions/v2'
import { error as logger } from 'firebase-functions/logger'
import { handleOGRequest } from './og'

export const og = https.onRequest(async (request, response) => {
  try {
    // Verificar que el método de la solicitud sea GET
    if (request.method !== 'GET') {
      response.status(405).send(`Método ${request.method} no permitido.`)
      return
    }

    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:5001',
      'http://localhost:4321',
      'https://cards.uxanarangel.com',
      'https://us-central1-ana-cards-og.cloudfunctions.net'
    ]

    // Variable para almacenar el origen de la solicitud
    let origin = ''

    // Obtener el origen desde el encabezado `origin`
    if (request.headers.origin) {
      origin = request.headers.origin as string
    }

    // Si no se encuentra `origin`, intentar obtenerlo desde el encabezado `referer`
    if (origin === '' && request.headers.referer) {
      try {
        const refererUrl = new URL(request.headers.referer as string)
        origin = `${refererUrl.protocol}//${refererUrl.host}`
      } catch (error) {
        console.error('Error obteniendo `referer` de la respuesta:', error)
      }
    }

    // Si aún no se encuentra el origen, derivarlo del encabezado `host`
    if (origin === '' && request.headers.host) {
      // Usar protocolo seguro si está disponible, de lo contrario, usar HTTP
      const protocol = request.headers['x-forwarded-proto'] || 'http'
      origin = `${protocol}://${request.headers.host}`
    }

    // Verificar si el origen es válido
    const isAllowedOrigin =
      allowedOrigins.includes(origin) || /\.ana-cards\.pages\.dev$/.test(origin)

    if (isAllowedOrigin === false) {
      response.status(403).send(`Origen ${origin} no permitido.`)
      return
    }

    // Configurar los encabezados CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }

    // Construir la URL original desde los encabezados de la solicitud
    const originalUrl = request.url.startsWith('http')
      ? request.url // Si ya es una URL completa, usarla directamente
      : `${request.headers['x-forwarded-proto'] || 'https'}://${
          request.headers['host'] || 'localhost'
        }${request.url}` // Si no, construirla manualmente

    // Adaptar la solicitud para usarla con la función `handleOGRequest`
    const adaptedRequest = new Request(originalUrl, {
      method: request.method,
      headers: Object.entries(request.headers).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: Array.isArray(value)
            ? value.join(', ') // Unir valores si son arreglos
            : value?.toString() || '' // Asegurar de que sea un string
        }),
        {}
      )
    })

    // Procesar la solicitud usando `handleOGRequest`
    const res = await handleOGRequest(adaptedRequest)

    // Configurar los encabezados en la respuesta
    res.headers.forEach((value, key) => {
      response.setHeader(key, value)
    })

    // Agregar los encabezados CORS a la respuesta
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.setHeader(key, value)
    })

    // Leer y enviar el cuerpo de la respuesta
    const responseBuffer = await res.arrayBuffer()

    response.status(res.status).send(Buffer.from(responseBuffer))
  } catch (error) {
    // Registrar el error y devolver un mensaje genérico
    logger('Error manejando la solicitud:', error)
    response.status(500).send('Error de servidor.')
  }
})
