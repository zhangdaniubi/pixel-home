const WebSocket = require('ws');
(async () => {
  const pages = await fetch('http://localhost:9222/json').then(r => r.json());
  const p = pages.find(pp => pp.url.includes('pixel'));
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let id = 1;
  function cmd(expr) {
    return new Promise(resolve => {
      ws.send(JSON.stringify({ id: id++, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      const fn = (d) => {
        const rr = JSON.parse(d.toString());
        if (rr.id === id - 1) { ws.off('message', fn); resolve(rr.result?.result?.value ?? rr.result); }
      };
      ws.on('message', fn);
    });
  }
  console.log('checkLogin:', await cmd('typeof checkLogin'));
  console.log('doLogin:', await cmd('typeof doLogin'));
  console.log('switchTheme:', await cmd('typeof switchTheme'));
  console.log('APP:', await cmd('typeof APP'));
  console.log('openDB:', await cmd('typeof openDB'));
  const appJs = await cmd(`
    (function(){
      var s = Array.from(document.scripts).find(function(sc){ return sc.src && sc.src.indexOf("app.js") !== -1 });
      return s ? s.src : "NOT FOUND";
    })()
  `);
  console.log('app.js src:', appJs);
  ws.close();
})();
