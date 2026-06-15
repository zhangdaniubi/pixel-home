const WebSocket = require('ws');

async function main() {
  try {
    const pages = await fetch('http://localhost:9222/json').then(r => r.json());
    const page = pages.find(p => p.url.includes('zhanglin'));
    if (!page) { console.log('未找到页面'); return; }
    console.log('页面:', page.title);

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
    let id = 1;

    function cmd(expr) {
      return new Promise(resolve => {
        const msg = JSON.stringify({ id: id++, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } });
        ws.send(msg);
        const handler = d => {
          const r = JSON.parse(d.toString());
          if (r.id === id - 1) { ws.off('message', handler); resolve(r.result?.result?.value ?? r.result); }
        };
        ws.on('message', handler);
      });
    }

    const btn = await cmd(`(function(){
      const b = document.querySelector('[onclick*=\"downloadPreviewPhoto\"]');
      return b ? b.textContent.trim() : 'NOT FOUND';
    })()`);
    console.log('按钮:', btn);

    const fn = await cmd('typeof window.downloadPreviewPhoto');
    console.log('函数:', fn);

    const cnt = await cmd(`(function(){
      const m = JSON.parse(localStorage.getItem('pixel_album_meta')||'[]');
      return m.length + ' 张照片';
    })()`);
    console.log('照片:', cnt);

    // 直接调用
    await cmd(`
      window.APP = window.APP || {};
      window.APP.currentPreviewPhotoId = 'test1';
      var img = document.getElementById('albumPreviewImg');
      if(!img.src || img.src === location.href){
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      }
    `);

    const result = await cmd(`(function(){
      try {
        window.downloadPreviewPhoto();
        return 'OK - 函数已执行,检查是否弹出了新窗口';
      } catch(e) { return 'ERROR: ' + e.message; }
    })()`);
    console.log('执行结果:', result);

    ws.close();
    console.log('测试完毕！');
  } catch(e) {
    console.error('失败:', e.message);
  }
}
main();
