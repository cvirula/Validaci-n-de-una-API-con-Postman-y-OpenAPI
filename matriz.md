# Matriz de pruebas

Ejecutar en orden desde PREP. TC09 y TC12 tienen varios pasos pero cada uno representa una sola situación. PREP y LIMPIEZA no se cuentan como casos. Todos los datos son ficticios.

| ID | Operación | Riesgo | Precondiciones | Datos | Resultado esperado | Aserciones | Limpieza |
|---|---|---|---|---|---|---|---|
| TC01 | POST /pedidos | Crear con total incorrecto | PREP: usuario A | cuaderno, cantidad=2 | 201; total=50, pendiente, cancelaciones=0 | Estado, esquema Pedido, propietario, cantidad, total; guardar ID | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC02 | GET /pedidos/{id} | Creación no persistida / tipo incompatible | TC01; token A e ID generado | ID de TC01 | 200; mismo ID, cantidad=2, total numérico=50 | Estado, esquema Pedido, ID, cantidad y estado | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC03 | POST /pedidos | Cantidad fuera de rango | PREP; token A | cuaderno, cantidad=0 | 400 INVALID_BODY; no crear | Estado, esquema Error, código; total=4 en TC09/TC12 | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC04 | POST /pedidos | Omitir campo obligatorio | PREP; token A | productoId=cuaderno; sin cantidad | 400 INVALID_BODY; no crear | Estado, esquema Error, código; total=4 en TC09/TC12 | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC05 | GET /pedidos/{id} | Exposición sin autenticación | TC01; ID válido | Sin Authorization | 401 UNAUTHORIZED | Estado, esquema Error, código; no datos de pedido | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC06 | GET /pedidos/{id} | Aceptar credencial inválida | TC01; ID válido | Bearer inválido de prueba | 401 UNAUTHORIZED | Estado, esquema Error, código | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC07 | GET /pedidos/{id} | Consultar pedido ajeno | TC01 creado por A; sesión B | ID de A y token B | 403 FORBIDDEN | Estado, esquema Error, código; no datos de pedido | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC08 | GET /pedidos/inexistente | Recurso ausente tratado como éxito | PREP; token A | ID inexistente | 404 NOT_FOUND | Estado, esquema Error, código | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC09 | GET /pedidos (dos páginas) | Duplicados, omisiones o pedidos de B | PREP + TC01; A tiene 4 pedidos | page=1 y 2; limit=2 | 200; dos por página; total=4; IDs distintos | Estado, esquema PaginaPedidos, metadatos, propietario, unión=4, incluye TC01 | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC10 | GET /pedidos | Aceptar página inválida | PREP; token A | page=0, limit=2 | 400 INVALID_PAGINATION | Estado, esquema Error, código | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC11 | PUT /pedidos/{id}/cancelacion | Cambio no aplicado | TC01 pendiente; token A | estado=cancelado | 200; cancelado, cancelaciones=1 | Estado, esquema Pedido, ID, estado, contador | LIMPIEZA: POST /test/reset y borrar variables temporales |
| TC12 | PUT cancelacion + GET pedido + GET lista | Efecto repetido / pedidos adicionales | TC11 cancelado; token A | Repetir estado=cancelado | 200; persiste cancelado y contador=1; total=4 | Esquemas, estado final consultado, contador=1, total sin cambio; otros pedidos pendientes | LIMPIEZA: POST /test/reset y borrar variables temporales |

Los rechazos TC03 y TC04 se verifican también mediante el total posterior. La paginación y TC12 comprueban que no se crearon pedidos adicionales. Los esquemas incluyen campos obligatorios, tipos, límites y rechazo de campos extra.
