// MutationObserver - 监听 IP 视图切换，进入时加载
const ipObserver = new MutationObserver(() => {
  if (document.getElementById('tool-ip').classList.contains('active')) {
    fetchIpInfo();
    fetchLocalIp();
  }
});
ipObserver.observe(document.getElementById('tool-ip'), { attributes: true, attributeFilter: ['class'] });

// fetchIpInfo - 通过 api.ip.sb 获取公网 IP 及地理位置信息
function fetchIpInfo() {
  document.getElementById('ipUpdateTime').textContent = '查询中...';
  fetch('https://api.ip.sb/geoip')
    .then(r => r.json())
    .then(d => {
      document.getElementById('ipAddress').textContent = d.ip;
      document.getElementById('ipCountry').textContent = d.country || '--';
      document.getElementById('ipRegion').textContent = d.region || '--';
      document.getElementById('ipCity').textContent = d.city || '--';
      document.getElementById('ipIsp').textContent = d.isp || d.organization || '--';
      document.getElementById('ipLoc').textContent = (d.latitude && d.longitude) ? d.latitude + ', ' + d.longitude : '--';
      document.getElementById('ipUpdateTime').textContent = new Date().toLocaleString('zh-CN');
    })
    .catch(() => {
      document.getElementById('ipUpdateTime').textContent = '查询失败，请重试';
    });
}

// fetchLocalIp - 通过 WebRTC ICE 候选者检测内网 IP 地址
function fetchLocalIp() {
  const el = document.getElementById('ipLocal');
  if (!el) return;
  el.textContent = '检测中...';
  el.title = '双击手动编辑';
  const ips = new Set();
  let pc = null;
  try {
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const dc = pc.createDataChannel('');
    pc.onicecandidate = e => {
      if (e.candidate) {
        const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (m) ips.add(m[1]);
      }
      if (!e.candidate) {
        const pubIp = document.getElementById('ipAddress').textContent;
        const local = [...ips].filter(ip => {
          if (ip === pubIp && pubIp !== '--') return false;
          const p = ip.split('.').map(Number);
          if (p[0] === 10) return true;
          if (p[0] === 192 && p[1] === 168) return true;
          if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
          if (p[0] === 127) return true;
          return false;
        });
        el.textContent = local.length ? local.join(', ') : '浏览器限制，无法自动获取';
        try { pc.close(); } catch(_) {}
      }
    };
    pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
    setTimeout(() => {
      if (el.textContent && el.textContent.startsWith('检测中')) {
        el.textContent = '浏览器限制，无法自动获取';
      }
      try { pc.close(); } catch(_) {}
    }, 5000);
  } catch (e) {
    el.textContent = '浏览器不支持';
  }
  if (!el._manualSetup) {
    el._manualSetup = true;
    el.addEventListener('dblclick', () => {
      const val = prompt('请输入内网 IP 地址：', el.textContent === '浏览器限制，无法自动获取' ? '' : el.textContent);
      if (val) el.textContent = val;
    });
  }
}

// 刷新按钮 - 重新查询公网 IP
document.getElementById('ipRefreshBtn').addEventListener('click', fetchIpInfo);

// 复制按钮 - 将公网 IP 复制到剪贴板
document.getElementById('ipCopyBtn').addEventListener('click', () => {
  const ip = document.getElementById('ipAddress').textContent;
  if (ip && ip !== '--') {
    navigator.clipboard.writeText(ip).then(() => {
      const tip = document.getElementById('ipCopyTip');
      tip.textContent = '已复制';
      setTimeout(() => { tip.textContent = ''; }, 2000);
    });
  }
});
