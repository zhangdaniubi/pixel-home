// CDP 浏览器操控脚本 - 测试下载功能
const WebSocket = require('ws');
const http = require('http');

const CDP_PORT = 9222;
const TARGET_URL = 'https://zhanglin.dpdns.org';

async function getDebugUrl() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const pages = JSON.parse(data);
        const page = pages.find(p => p.type === 'page' && p.url !== 'about:blank');
        resolve(page ? page.webSocketDebuggerUrl : pages[0].webSocketDebuggerUrl);
      });
    }).on('error', reject);
  });
}

function sendCommand(ws, id, method, params = {}) {
  return new Promise((resolve) => {
    const msg = JSON.stringify({ id, method, params });
    ws.send(msg);
    ws.once('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.id === id) resolve(response.result);
    });
  });
}

async function run() {
  console.log('=== CDP 浏览器测试开始 ===\n');

  // 1. 获取调试URL
  const wsUrl = await getDebugUrl();
  console.log('连接调试端口...');

  // 2. 连接 WebSocket
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  let msgId = 1;

  // 3. 导航到目标页面
  await sendCommand(ws, msgId++, 'Page.enable');
  console.log('正在打开: ' + TARGET_URL);
  await sendCommand(ws, msgId++, 'Page.navigate', { url: TARGET_URL });
  await new Promise(r => setTimeout(r, 4000));

  // 4. 检查页面是否加载
  const { result: titleResult } = await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: 'document.title'
  });
  console.log('页面标题:', JSON.parse(titleResult.value));

  // 5. 尝试登录
  console.log('\n登录中...');
  await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: `
      (function(){
        document.getElementById('loginUsername').value = 'admin';
        document.getElementById('loginPassword').value = 'zhangdaniubi';
        document.getElementById('loginSubmitBtn').click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 3000));

  // 6. 检查是否登录成功
  const { result: loginCheck } = await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: 'document.getElementById("loginOverlay").classList.contains("hidden") ? "已登录" : "未登录"'
  });
  console.log('登录状态:', JSON.parse(loginCheck.value));

  // 7. 检查相册模块
  console.log('\n切换到相册...');
  await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: 'document.querySelector(\'.nav-btn[data-tab="album"]\').click()'
  });
  await new Promise(r => setTimeout(r, 2000));

  // 8. 检查是否有照片
  const { result: photoCheck } = await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: `
      (function(){
        var meta = JSON.parse(localStorage.getItem('pixel_album_meta') || '[]');
        return meta.length + ' 张照片';
      })()
    `
  });
  console.log('照片数量:', JSON.parse(photoCheck.value));

  // 9. 测试下载函数是否存在
  console.log('\n检查下载函数...');
  const { result: fnCheck } = await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: 'typeof window.downloadPreviewPhoto'
  });
  console.log('downloadPreviewPhoto 类型:', JSON.parse(fnCheck.value));

  // 10. 检查按钮
  const { result: btnCheck } = await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: `
      (function(){
        var btn = document.querySelector('[onclick*="downloadPreviewPhoto"]');
        return btn ? ('按钮存在: ' + btn.textContent.trim()) : '按钮不存在';
      })()
    `
  });
  console.log('下载按钮:', JSON.parse(btnCheck.value));

  // 11. 如果有照片,模拟点击下载
  const { result: previewTest } = await sendCommand(ws, msgId++, 'Runtime.evaluate', {
    expression: `
      (function(){
        var meta = JSON.parse(localStorage.getItem('pixel_album_meta') || '[]');
        if (meta.length === 0) return '没有照片可测试';
        // 模拟预览
        window.APP.currentPreviewPhotoId = meta[0].id;
        // 设置一个模拟的 dataURL
        document.getElementById('albumPreviewImg').src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        return '已设置预览图片,ID:' + meta[0].id;
      })()
    `
  });
  console.log('预览设置:', JSON.parse(previewTest.value));

  console.log('\n=== 测试完成 ===');
  ws.close();
}

run().catch(e => {
  console.error('错误:', e.message);
  process.exit(1);
});
