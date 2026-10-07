# API de pedidos

API local de pedidos para comprobar reglas funcionales y contrato con Postman. Permite crear, consultar, listar con paginación y cancelar pedidos. Cada cuaderno cuesta Q25 y se permiten cantidades enteras de 1 a 10. Cada usuario solo puede acceder a sus pedidos.

## Requisitos y versiones

- Node.js 22 o superior; código preparado con Node.js 24.16.0 y npm 11.13.0.
- Postman con Collection Runner y soporte para colección 2.1.0.
- Para terminal: Newman 6.2.1, fijado en package.json.
- OpenAPI 3.1.0 en formato JSON.

No se necesita base de datos, interfaz gráfica ni despliegue. La información se guarda en memoria. La versión exacta de Postman debe anotarse junto con la evidencia obtenida en el Runner. Newman todavía no pudo ejecutarse en el entorno de preparación: su descarga fue bloqueada.

## Instalar y usar

Abre la carpeta del proyecto en VS Code y una terminal dentro de ella:

```sh
npm install
npm start
```

La API inicia en http://127.0.0.1:3000. El catálogo se consulta en http://127.0.0.1:3000/productos?page=1&limit=2. Para iniciar únicamente la API sin instalar Newman, también puedes usar `node src/server.js`.

## Datos controlados y ambiente

Importa en Postman los dos archivos de `postman/` y selecciona **Pedidos local**. El ambiente no incluye contraseñas ni sesiones válidas.

PREP ejecuta POST /test/reset: borra los pedidos anteriores, crea tres pedidos del usuario A y uno del usuario B y genera sesiones temporales aleatorias. El script guarda los tokens en tokenA y tokenB. TC01 obtiene el ID del pedido de la respuesta de creación y lo guarda en pedidoId. Ninguna prueba depende de IDs de otra ejecución.

El precio fijo y los datos iniciales hacen reproducibles los resultados. LIMPIEZA vuelve a reiniciar la API, invalida las sesiones anteriores y borra las variables temporales. No exportes el ambiente durante una ejecución: utiliza el archivo de ejemplo sin sesiones.

El endpoint /test/reset es exclusivo del ejercicio. El servidor escucha solo en 127.0.0.1 y no debe desplegarse públicamente. Al reiniciar también se pierden los datos.

## Collection Runner

1. Inicia la API con npm start.
2. En Postman, importa pedidos.postman_collection.json y local.postman_environment.json desde postman/.
3. Selecciona el ambiente Pedidos local.
4. Abre la colección Pedidos - 12 casos y selecciona Run.
5. Incluye todas las solicitudes y ejecuta una iteración en el orden original, sin archivos de datos. Incluye PREP y LIMPIEZA; no detengas el recorrido ante el primer fallo.
6. Comprueba las pruebas y guarda capturas legibles del resultado.

La colección contiene **12 casos distintos, 17 solicitudes y 66 aserciones**. PREP y LIMPIEZA no cuentan como casos. TC09 tiene dos pasos; TC12 tiene tres. Varias aserciones de una situación no se cuentan como casos adicionales. La relación entre casos y solicitudes está en matriz.md.

Las respuestas negativas 400, 401, 403 y 404 son resultados esperados: sus pruebas deben pasar cuando el rechazo y el cuerpo corresponden al contrato.

## Ejecución por terminal

Cierra la API iniciada manualmente con Ctrl+C. Después:

```sh
npm test
```

Este comando inicia una API temporal, ejecuta la colección real con Newman, guarda evidencia/corregido.json y evidencia/corregido.txt y cierra la API. El resumen identifica los doce casos. Devuelve código 1 si falla una aserción o faltan casos.

Si prefieres mantener la API iniciada manualmente:

```sh
npx newman run postman/pedidos.postman_collection.json -e postman/local.postman_environment.json --iteration-count 1
```

No ejecutes npm test mientras npm start esté usando el mismo puerto.

## Fallo controlado y corrección

OpenAPI exige que total sea number. El modo --defecto modifica GET /pedidos/{id} para devolver el número como string, por ejemplo "50". El contrato y la colección permanecen iguales.

Con la API anterior cerrada:

```sh
npm run test:defecto
```

El resultado esperado es código 1: TC02 y TC12 deben fallar en la prueba de esquema Pedido, con diez casos correctos y dos fallidos. Se generan evidencia/fallo-controlado.json y evidencia/fallo-controlado.txt. No se detiene la colección al primer fallo.

Luego:

```sh
npm test
npm test
```

El modo normal devuelve total como número. Los doce casos deben pasar; la segunda ejecución comprueba la preparación desde un estado limpio. Los resultados reales deben confirmarse antes de entregar.

Para demostrarlo con Runner, inicia npm run start:defecto, ejecuta la colección y captura el detalle del fallo. Detén con Ctrl+C, inicia npm start y repite la colección. No amplíes el esquema para permitir string.

## Idempotencia y alcance

PUT /pedidos/{id}/cancelacion establece estado=cancelado. Solo la primera transición incrementa cancelaciones. TC12 repite PUT, consulta el estado persistido con GET y comprueba que cancelaciones siga en 1 y que no haya pedidos nuevos. POST /pedidos no se considera idempotente.

Las pruebas jsonSchema verifican cuerpos mediante esquemas tomados de openapi.json. Usan tipos, campos obligatorios, límites, patrones y rechazo de propiedades adicionales compatibles con Postman. Las otras aserciones verifican estados HTTP, Content-Type y reglas de negocio. Esto no es una validación completa de OpenAPI 3.1. Tampoco se prueban concurrencia, rendimiento ni persistencia en base de datos.

## Evidencia y entrega

Los resultados de Postman/Newman deben obtenerse mediante los comandos anteriores. No se incluyen resultados simulados de Postman. Las capturas de verificación directa por HTTP, si se adjuntan aparte, son comprobaciones preliminares y no sustituyen la ejecución de la colección.

Repositorio: https://github.com/cvirula/Validaci-n-de-una-API-con-Postman-y-OpenAPI

El repositorio contiene la aplicación, especificación, matriz, colección, ambiente, README y evidencia técnica cuando se genere. El PDF de Canvas y el video van fuera del repositorio. No subir node_modules, ambientes con tokens ni datos personales reales. El PDF debe incluir identificación, enlaces accesibles y evidencia real del fallo y la corrección.
