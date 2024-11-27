import { createElement, ReactNode } from 'react'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import fetch from 'isomorphic-fetch'
import createMarkup from './markup'
import { VNode } from '../types'

/**
 * Convierte un Virtual Node (VNode) en un React Node
 * @param vnode - El VNode que será convertido
 * @returns Un ReactNode equivalente al VNode proporcionado
 */
function convertVNodeToReactNode(vnode: VNode): ReactNode {
  const { type, props } = vnode
  const { children, ...restProps } = props

  let reactChildren: ReactNode | ReactNode[] | undefined

  if (Array.isArray(children)) {
    // Si los hijos son un arreglo, convertir cada uno de ellos recursivamente
    reactChildren = children.map((child, index) =>
      convertVNodeToReactNode({ ...child, key: child.key || index.toString() })
    )
  } else if (typeof children === 'object') {
    // Si el hijo es un objeto, convertirlo recursivamente
    reactChildren = convertVNodeToReactNode(children as VNode)
  } else {
    // Si los hijos son primitivos o nulos, simplemente asignarlos
    reactChildren = children
  }

  // Crear un elemento React usando el tipo, las propiedades y los hijos convertidos
  return createElement(type, { ...restProps, key: vnode.key }, reactChildren)
}

/**
 * Determina si una URL pertenece a un entorno local
 * @param url - La URL a verificar
 * @returns `true` si la URL pertenece a localhost o 127.0.0.1; de lo contrario, `false`
 */
const isLocal = (url: string) => {
  const hostname = new URL(url).hostname
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/**
 * Resuelve la URL de un recurso basado en el entorno
 * @param isLocal - Indica si se está ejecutando en un entorno local
 * @param requestUrl - La URL de la solicitud
 * @param assetPath - La ruta del recurso
 * @returns La URL completa del recurso
 */
const resolveAssetURL = (
  isLocal: boolean,
  requestUrl: string,
  assetPath: string
): string => {
  if (isLocal) {
    return `http://localhost:4321/${assetPath}`
  }

  const isDevelopment = new URL(requestUrl).hostname.includes(
    'develop.ana-cards.pages.dev'
  )

  if (isDevelopment) {
    return `https://develop.ana-cards.pages.dev/${assetPath}`
  }

  return `https://cards.uxanarangel.com/${assetPath}`
}

/**
 * Realiza una solicitud de red con un tiempo límite
 * @param url - La URL del recurso
 * @param timeout - El tiempo límite en milisegundos (por defecto, 5000ms)
 * @returns Una promesa que resuelve con la respuesta
 * @throws Error si el tiempo límite se excede o si ocurre un problema de red
 */
async function fetchWithTimeout(
  url: string,
  timeout = 5000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Realizar la solicitud con un controlador de tiempo límite
    return await fetch(url, { signal: controller.signal })
  } catch (error) {
    console.error(`Error al descargar ${url}:`, error)
    throw error
  } finally {
    // Limpiar el tiempo límite
    clearTimeout(timeoutId)
  }
}

/**
 * Maneja las solicitudes para generar imágenes OG
 * @param request - La solicitud entrante
 * @returns Una respuesta HTTP con la imagen generada o un error
 */
export async function handleOGRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const isLocalEnv = isLocal(request.url)

    // Extraer parámetros de consulta
    const avatar = url.searchParams.get('avatar') || ''
    const username = url.searchParams.get('user') || 'Usuario'
    const cards = url.searchParams.get('cards') || '0'
    const rank = url.searchParams.get('ranking') || 'Unranked'

    // Descargar fuentes y fondos en paralelo
    const [fontData, backgroundImageData] = await Promise.all([
      // Descargar la fuente Bebas Neue
      fetchWithTimeout(
        resolveAssetURL(
          isLocalEnv,
          request.url,
          'assets/fonts/bebas-neue-latin-400-normal.woff'
        )
      )
        .then((res) => res.arrayBuffer())
        // Si falla, devolver un buffer vacío
        .catch(() => new ArrayBuffer(0)),

      // Descargar la imagen de fondo
      fetchWithTimeout(
        resolveAssetURL(isLocalEnv, request.url, 'og-template.png')
      )
        .then((res) => res.arrayBuffer())
        .then(
          (buffer) =>
            `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
        )
        // Si falla, devolver un string vacío
        .catch(() => '')
    ])

    // Crear el VNode para la plantilla OG
    const markup: VNode = createMarkup({
      avatar,
      username,
      cards,
      rank,
      backgroundImage: backgroundImageData
    })

    // Generar el SVG usando `satori`
    const svg = await satori(convertVNodeToReactNode(markup), {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Bebas Neue',
          data: fontData,
          weight: 500,
          style: 'normal'
        }
      ]
    })

    // Convertir el SVG a PNG utilizando `Resvg`
    const resvg = new Resvg(svg, {
      background: '#fff',
      fitTo: { mode: 'width', value: 1200 }
    })

    // Renderizar la imagen
    const pngData = resvg.render()
    // Convertir a buffer PNG
    const pngBuffer = pngData.asPng()

    // Devolver la respuesta con la imagen
    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  } catch (error) {
    // Manejar errores y devolver una respuesta de error
    console.error('Error procesando la solicitud:', error)

    return new Response('Error procesando la solicitud.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
