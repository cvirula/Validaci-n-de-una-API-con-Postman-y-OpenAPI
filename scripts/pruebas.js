const fs = require('node:fs');
const path = require('node:path');
const newman = require('newman');
const server = require('../src/server');
const root = path.resolve(__dirname, '..');
const defecto = process.argv.includes('--defecto');
const modo = defecto ? 'fallo-controlado' : 'corregido';
const collection = JSON.parse(fs.readFileSync(path.join(root, 'postman/pedidos.postman_collection.json')));
const environment = JSON.parse(fs.readFileSync(path.join(root, 'postman/local.postman_environment.json')));
const port = Number(process.env.PORT || 3000);
environment.values.find(v => v.key === 'baseUrl').value = `http://127.0.0.1:${port}`;
server.on('error', err => { console.error(err.message + '. Cierra la API anterior o cambia PORT.'); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  newman.run({ collection, environment, iterationCount: 1, reporters: ['cli'], color: 'off' }, (err, summary) => {
    server.close();
    if (err) { console.error(err); process.exitCode = 1; return; }
    const cases = new Map();
    for (const execution of summary.run.executions) {
      const id = execution.item.name.match(/^TC\d{2}/)?.[0];
      if (!id) continue;
      const bad = Boolean(execution.requestError) || (execution.assertions || []).some(a => a.error);
      cases.set(id, (cases.get(id) || false) || bad);
    }
    const failed = [...cases].filter(([,bad]) => bad).length;
    const failures = summary.run.failures.map(f => ({ prueba: f.error.test || f.error.name,
      solicitud: f.source?.name || '', mensaje: f.error.message }));
    const report = { fechaUTC: new Date().toISOString(), modo, versiones: { node: process.version,
      newman: require('newman/package.json').version, coleccion: '2.1.0', openapi: '3.1.0' },
      solicitudes: summary.run.stats.requests.total, casos: cases.size, casosCorrectos: cases.size-failed,
      casosFallidos: failed, aserciones: summary.run.stats.assertions.total,
      asercionesFallidas: summary.run.stats.assertions.failed,
      detalleCasos: Object.fromEntries([...cases].map(([id,bad]) => [id,bad ? 'FALLO' : 'OK'])), fallos: failures };
    fs.mkdirSync(path.join(root, 'evidencia'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evidencia', modo+'.json'), JSON.stringify(report, null, 2)+'\n');
    const lines = [`Ejecución: ${modo}`, `Fecha UTC: ${report.fechaUTC}`, `Node: ${report.versiones.node}; Newman: ${report.versiones.newman}`,
      `Casos: ${report.casos}; correctos: ${report.casosCorrectos}; fallidos: ${report.casosFallidos}`,
      `Solicitudes: ${report.solicitudes}; aserciones: ${report.aserciones}; aserciones fallidas: ${report.asercionesFallidas}`,
      ...Object.entries(report.detalleCasos).map(([id,status]) => `${id}: ${status}`),
      ...failures.map(f => `${f.solicitud} | ${f.prueba} | ${f.mensaje}`)];
    fs.writeFileSync(path.join(root, 'evidencia', modo+'.txt'), lines.join('\n')+'\n');
    console.log(lines.join('\n'));
    process.exitCode = failures.length || cases.size !== 12 ? 1 : 0;
  });
});
