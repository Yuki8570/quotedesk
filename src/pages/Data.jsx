import { useState } from 'react';
import { LuDownload, LuUpload, LuRefreshCw, LuDatabase } from 'react-icons/lu';
import { useStore } from '../store.jsx';
import { Confirm } from '../ui.jsx';
import { download, pickFile, fmtDate } from '../util.js';

export default function Data() {
  const { data, replaceAll, resetDemo, toast } = useStore();
  const [confirm, setConfirm] = useState(null);
  const size = new Blob([JSON.stringify(data)]).size;

  const exportAll = (keys, name) => {
    const payload = { app: 'quote-studio', version: 1, exportedAt: new Date().toISOString() };
    keys.forEach((k) => { payload[k] = data[k]; });
    download(new Blob([JSON.stringify(payload)], { type: 'application/json' }), `${name}_${fmtDate(Date.now())}.json`);
  };
  const importFile = async (mode) => {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const payload = JSON.parse(await f.text());
      if (payload.app !== 'quote-studio') throw new Error('不是本系统导出的备份文件');
      await replaceAll(payload, mode);
      toast(mode === 'replace' ? '已恢复备份' : '已合并导入');
    } catch (e) { toast('导入失败：' + e.message, 'err'); }
  };

  const stats = [['报价单', data.quotes.length], ['产品', data.products.length], ['抬头', data.brands.length], ['模板', data.templates.length]];
  return (
    <div className="page">
      <div className="kpi-card">
        <div className="kpi"><div className="kpi-icon"><LuDatabase /></div><div><div className="kpi-label">本地数据量</div><div className="kpi-value sm">{(size / 1024 / 1024).toFixed(2)} MB</div></div></div>
        {stats.map(([l, v]) => <div key={l} className="kpi plain"><div><div className="kpi-label">{l}</div><div className="kpi-value sm">{v}</div></div></div>)}
      </div>

      <div className="data-grid">
        <div className="card">
          <div className="card-title">备份与恢复</div>
          <p className="muted">当前为纯前端演示版，数据保存在<b>本机浏览器</b>中。换电脑、换浏览器或清理浏览器数据前，请先导出备份。</p>
          <div className="btn-col">
            <button className="btn primary" onClick={() => exportAll(['products', 'brands', 'quotes', 'templates'], '报价系统完整备份')}><LuDownload /> 导出完整备份</button>
            <button className="btn" onClick={() => setConfirm({ title: '恢复备份', text: '将用备份文件替换当前所有数据，确定继续？', danger: true, okText: '选择文件并恢复', onOk: () => importFile('replace') })}><LuUpload /> 从备份恢复（覆盖）</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">同事间共享基础数据</div>
          <p className="muted">把产品库、抬头和模板导出发给同事，对方选择「合并导入」即可使用，不会覆盖对方的报价单。</p>
          <div className="btn-col">
            <button className="btn" onClick={() => exportAll(['products', 'brands', 'templates'], '产品库与抬头模板')}><LuDownload /> 导出产品库 / 抬头 / 模板</button>
            <button className="btn" onClick={() => importFile('merge')}><LuUpload /> 合并导入</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">演示数据</div>
          <p className="muted">恢复为初始示例数据（基于你提供的 Excel 模板）。会清空当前所有数据。</p>
          <div className="btn-col">
            <button className="btn danger-ghost" onClick={() => setConfirm({ title: '重置演示数据', text: '将清空所有报价单、产品、抬头和模板，并恢复示例数据。', danger: true, okText: '重置', onOk: async () => { await resetDemo(); toast('已重置为演示数据'); } })}><LuRefreshCw /> 重置演示数据</button>
          </div>
        </div>
      </div>
      {confirm && <Confirm {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
