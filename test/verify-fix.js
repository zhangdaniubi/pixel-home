const WebSocket = require('ws');
(async () => {
  const pages = await fetch('http://localhost:9222/json').then(r => r.json());
  let p = pages.find(pp => pp.url.includes('6f6429bd') || pp.url.includes('zhanglin'));
  if (!p) p = pages[0];
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
  await cmd('location.href = "https://6f6429bd.pixel-home-8yq.pages.dev"');
  await new Promise(r => setTimeout(r, 6000));
  console.log('APP:', await cmd('typeof APP'));
  console.log('checkLogin:', await cmd('typeof checkLogin'));
  console.log('switchTheme:', await cmd('typeof switchTheme'));
  await cmd('document.getElementById("loginUsername").value = "admin"; document.getElementById("loginPassword").value = "zhangdaniubi"; document.getElementById("loginSubmitBtn").click();');
  await new Promise(r => setTimeout(r, 4000));
  console.log('登录成功:', await cmd('document.getElementById("loginOverlay").classList.contains("hidden")'));
  ws.close();
})();
