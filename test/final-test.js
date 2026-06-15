const WebSocket = require('ws');
(async () => {
  const pages = await fetch('http://localhost:9222/json').then(r => r.json());
  const page = pages.find(p => true); // any page
  const ws = new WebSocket(page.webSocketDebuggerUrl);
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

  // 导航到最新部署直连
  console.log('导航到最新部署...');
  await cmd('location.href = "https://2cc4cf7f.pixel-home-8yq.pages.dev"');
  await new Promise(r => setTimeout(r, 5000));

  // 登录
  const needLogin = await cmd('document.getElementById("loginOverlay") && !document.getElementById("loginOverlay").classList.contains("hidden")');
  if (needLogin) {
    console.log('登录中...');
    await cmd(`
      document.getElementById('loginUsername').value = 'admin';
      document.getElementById('loginPassword').value = 'zhangdaniubi';
      document.getElementById('loginSubmitBtn').click();
    `);
    await new Promise(r => setTimeout(r, 5000));
  }

  // 新函数
  const fnSrc = await cmd('window.downloadPreviewPhoto.toString().substring(0, 350)');
  console.log('函数:\n', fnSrc);

  // 测试
  await cmd(`
    window.APP = window.APP || {};
    window.APP.currentPreviewPhotoId = 'dl_test';
    document.getElementById('albumPreviewImg').src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  `);

  const r = await cmd(`(function(){try{window.downloadPreviewPhoto();return'OK';}catch(e){return e.message}})()`);
  console.log('执行:', r);

  await new Promise(rs => setTimeout(rs, 2000));
  const a = await cmd(`(function(){var a=document.querySelector('a[download]');return a?'有A标签 href:'+(a.href?'YES':'NO')+' name:'+a.download:'无A标签'})()`);
  console.log('A标签:', a);
  const t = await cmd('document.getElementById("pixelToast").textContent');
  console.log('Toast:', t);

  ws.close();
  console.log('完成');
})();
