const http = require('node:http');
const { randomUUID, randomBytes } = require('node:crypto');

const defecto = process.argv.includes('--defecto');
const port = Number(process.env.PORT || 3000);
const productos = [{ id: 'cuaderno', nombre: 'Cuaderno', precio: 25 }];
let pedidos = [];
let sesiones = new Map();

function preparar() {
  sesiones = new Map();
  const tokenA = randomBytes(24).toString('hex');
  const tokenB = randomBytes(24).toString('hex');
  sesiones.set(tokenA, 'usuario-a');
  sesiones.set(tokenB, 'usuario-b');
  pedidos = [];
  for (const usuario of ['usuario-a', 'usuario-a', 'usuario-a', 'usuario-b']) {
    pedidos.push({ id: randomUUID(), usuarioId: usuario, productoId: 'cuaderno',
      cantidad: 1, total: 25, estado: 'pendiente', cancelaciones: 0 });
  }
  return { tokenA, tokenB, pedidosInicialesA: 3 };
}
preparar();

function responder(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function error(res, status, code, message) {
  responder(res, status, { error: { code, message } });
}
async function leer(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10000) throw new Error('Cuerpo demasiado grande');
  }
  return JSON.parse(raw);
}
function campos(body, keys) {
  return body && typeof body === 'object' && !Array.isArray(body)
    && Object.keys(body).every(k => keys.includes(k))
    && keys.every(k => Object.hasOwn(body, k));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const path = url.pathname;
  // Solo para preparar y limpiar este ejercicio local, nunca para producción.
  if (path === '/test/reset' && req.method === 'POST') {
    return responder(res, 200, preparar());
  }
  if (path === '/productos' && req.method === 'GET') {
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '2';
    if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit) || Number(limit) > 10) {
      return error(res, 400, 'INVALID_PAGINATION', 'page debe ser positivo y limit debe estar entre 1 y 10');
    }
    return responder(res, 200, { items: productos.slice((Number(page)-1)*Number(limit), Number(page)*Number(limit)),
      page: Number(page), limit: Number(limit), total: productos.length });
  }
  if (!path.startsWith('/pedidos')) return error(res, 404, 'NOT_FOUND', 'Ruta inexistente');
  const auth = req.headers.authorization;
  if (!auth) return error(res, 401, 'UNAUTHORIZED', 'Se requiere Bearer token');
  const usuario = sesiones.get(auth.startsWith('Bearer ') ? auth.slice(7) : '');
  if (!usuario) return error(res, 401, 'UNAUTHORIZED', 'Credencial inválida');

  if (path === '/pedidos' && req.method === 'GET') {
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '2';
    if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit) || Number(limit) > 10) {
      return error(res, 400, 'INVALID_PAGINATION', 'page debe ser positivo y limit debe estar entre 1 y 10');
    }
    const propios = pedidos.filter(p => p.usuarioId === usuario);
    return responder(res, 200, { items: propios.slice((Number(page)-1)*Number(limit), Number(page)*Number(limit)),
      page: Number(page), limit: Number(limit), total: propios.length });
  }
  if (path === '/pedidos' && req.method === 'POST') {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) {
      return error(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Se requiere application/json');
    }
    let body;
    try { body = await leer(req); } catch { return error(res, 400, 'INVALID_BODY', 'JSON inválido'); }
    if (!campos(body, ['productoId', 'cantidad']) || typeof body.productoId !== 'string'
      || !Number.isInteger(body.cantidad) || body.cantidad < 1 || body.cantidad > 10) {
      return error(res, 400, 'INVALID_BODY', 'productoId y cantidad (entero de 1 a 10) son obligatorios');
    }
    const producto = productos.find(p => p.id === body.productoId);
    if (!producto) return error(res, 400, 'INVALID_PRODUCT', 'Producto inexistente');
    const pedido = { id: randomUUID(), usuarioId: usuario, productoId: producto.id,
      cantidad: body.cantidad, total: producto.precio * body.cantidad, estado: 'pendiente', cancelaciones: 0 };
    pedidos.push(pedido);
    return responder(res, 201, pedido);
  }
  const match = path.match(/^\/pedidos\/([^/]+)(\/cancelacion)?$/);
  if (!match) return error(res, 404, 'NOT_FOUND', 'Ruta inexistente');
  const pedido = pedidos.find(p => p.id === match[1]);
  if (!pedido) return error(res, 404, 'NOT_FOUND', 'Pedido inexistente');
  if (pedido.usuarioId !== usuario) return error(res, 403, 'FORBIDDEN', 'El pedido pertenece a otro usuario');
  if (!match[2] && req.method === 'GET') {
    // Incompatibilidad controlada: el contrato exige que total sea number.
    return responder(res, 200, defecto ? { ...pedido, total: String(pedido.total) } : pedido);
  }
  if (match[2] && req.method === 'PUT') {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) {
      return error(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Se requiere application/json');
    }
    let body;
    try { body = await leer(req); } catch { return error(res, 400, 'INVALID_BODY', 'JSON inválido'); }
    if (!campos(body, ['estado']) || body.estado !== 'cancelado') {
      return error(res, 400, 'INVALID_BODY', 'estado debe ser cancelado');
    }
    if (pedido.estado !== 'cancelado') {
      pedido.estado = 'cancelado';
      pedido.cancelaciones += 1;
    }
    return responder(res, 200, pedido);
  }
  return error(res, 404, 'NOT_FOUND', 'Ruta inexistente');
});
if (require.main === module) {
  server.listen(port, '127.0.0.1', () => console.log(`API en http://127.0.0.1:${port}${defecto ? ' (defecto activo)' : ''}`));
}
module.exports = server;
