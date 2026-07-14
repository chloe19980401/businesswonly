(() => {
  'use strict';

  const channels = window.__ACQUIRE_DATA__?.channels ?? [];
  const channelMap = Object.fromEntries(channels.map(channel => [channel.id, channel]));
  const countryNames = {
    AE: '阿联酋', SA: '沙特阿拉伯', QA: '卡塔尔', OM: '阿曼', BH: '巴林',
    KZ: '哈萨克斯坦', KG: '吉尔吉斯斯坦', TJ: '塔吉克斯坦', UZ: '乌兹别克斯坦',
    AF: '阿富汗', PK: '巴基斯坦'
  };
  const countryRegions = {
    AE: '中东', SA: '中东', QA: '中东', OM: '中东', BH: '中东',
    KZ: '中亚', KG: '中亚', TJ: '中亚', UZ: '中亚', AF: '中亚', PK: '中亚'
  };
  const typeNames = {
    government_buyer_network: '政府采购网络',
    real_estate_developer: '房地产开发商',
    tourism_real_estate_developer: '文旅地产开发商',
    mega_project_developer: '大型项目开发商',
    government_procurement_portal: '政府采购平台',
    public_works_buyer: '公共工程采购方',
    government_buyer: '政府采购方',
    institutional_buyer: '机构采购方',
    quasi_state_procurement_portal: '国有企业采购平台',
    government_procurement_directory: '政府采购目录'
  };

  const tabs = document.getElementById('channel-tabs');
  const rows = document.getElementById('customer-rows');
  const query = document.getElementById('query');
  const region = document.getElementById('region');
  const grade = document.getElementById('grade');
  const resultCount = document.getElementById('result-count');
  const emptyState = document.getElementById('empty-state');
  const layer = document.getElementById('drawer-layer');
  const drawer = document.getElementById('detail-drawer');
  const clearFilters = document.getElementById('clear-filters');
  const state = { targets: [], activeChannel: 'all', generatedAt: '', lastFocus: null };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const safeUrl = value => {
    try {
      const url = new URL(String(value));
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch {
      return '#';
    }
  };

  const slug = value => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'target';

  const normalizeTarget = (input, index) => {
    const source = Array.isArray(input) ? {
      name: input[0], country: input[1], type: input[2], officialUrl: input[3],
      priority: input[4], crawlMode: input[5],
      status: input[5] === 'manual_only' ? 'official_terms_restrict_automated_collection' : 'official_source_verified'
    } : input;
    const score = source.priority === 'S1' ? 90 : source.priority === 'S2' ? 80 : 70;
    return {
      id: `buyer-${source.country || 'xx'}-${slug(source.name)}-${index}`,
      name: source.name || '未命名采购目标',
      countryCode: source.country || '--',
      country: countryNames[source.country] || source.country || '待核验',
      region: countryRegions[source.country] || '亚太',
      type: typeNames[source.type] || source.type || '采购目标',
      rawType: source.type || 'buyer',
      officialUrl: safeUrl(source.officialUrl),
      priority: source.priority || 'S3',
      crawlMode: source.crawlMode || 'manual_only',
      status: source.status || 'official_source_verified',
      score,
      grade: score >= 85 ? 'A' : score >= 75 ? 'B' : 'C',
      channel: 'projects'
    };
  };

  const statusLabel = target => target.crawlMode === 'public'
    ? '已进入公开自动采集'
    : '网站条款要求人工核验';

  const scoreTone = score => score >= 85 ? 'strong' : score >= 75 ? 'medium' : 'light';

  function filteredTargets() {
    const keyword = query?.value.trim().toLowerCase() || '';
    return state.targets.filter(target => {
      const channelMatch = state.activeChannel === 'all' || target.channel === state.activeChannel;
      const regionMatch = !region || region.value === '全部地区' || target.region === region.value;
      const gradeMatch = !grade || grade.value === '全部等级' || target.grade === grade.value;
      const haystack = [target.name, target.country, target.countryCode, target.type, target.rawType, statusLabel(target)].join(' ').toLowerCase();
      return channelMatch && regionMatch && gradeMatch && (!keyword || haystack.includes(keyword));
    });
  }

  function renderTabs() {
    if (!tabs) return;
    tabs.innerHTML = channels.map(channel => {
      const count = channel.id === 'all'
        ? state.targets.length
        : state.targets.filter(target => target.channel === channel.id).length;
      const selected = state.activeChannel === channel.id;
      return `<button role="tab" aria-selected="${selected}" class="channel-tab ${selected ? 'selected' : ''}" data-channel="${esc(channel.id)}">`
        + `<span class="channel-symbol">${esc(channel.short)}</span><span><strong>${esc(channel.label)}</strong>`
        + `<small>${esc(channel.note)}</small></span><em>${count}</em></button>`;
    }).join('');
  }

  function renderRows() {
    if (!rows) return;
    const targets = filteredTargets();
    rows.innerHTML = targets.map(target => `<tr data-id="${esc(target.id)}" tabindex="0" role="button" aria-label="查看 ${esc(target.name)} 详情">`
      + `<td><div class="account-main"><span class="company-logo">${esc(target.countryCode)}</span><div><strong>${esc(target.name)}</strong>`
      + `<small>已核验官方采购入口</small><div class="tag-line"><span>${esc(target.priority)}</span><span>${esc(target.region)}</span></div></div></div></td>`
      + `<td><strong>${esc(target.type)}</strong><small>${esc(target.country)}</small></td>`
      + `<td><span class="channel-pill">官网 / 采购入口</span><strong class="signal-text">${esc(statusLabel(target))}</strong><small>${esc(target.status)}</small></td>`
      + `<td><strong>待发现公开采购项目</strong><small>持续监测官方公告与供应商页面</small></td>`
      + `<td><strong>待官方来源核验</strong><small>不猜测联系人或邮箱</small></td>`
      + `<td><div class="score score-${scoreTone(target.score)}">${target.score}</div><small>官方来源</small></td>`
      + `<td><span class="grade grade-${target.grade}">${target.grade}</span><strong>目标池</strong><small>${esc(target.crawlMode)}</small></td>`
      + `<td><a class="source-link" data-source-link href="${esc(target.officialUrl)}" target="_blank" rel="noopener noreferrer">查看来源</a><small>${esc(state.generatedAt || '待更新')}</small></td>`
      + '</tr>').join('');
    emptyState?.classList.toggle('static-hidden', targets.length > 0);
    const activeNote = channelMap[state.activeChannel]?.note || '统一账户池';
    if (resultCount) resultCount.innerHTML = `<strong>${targets.length}</strong> 个已核验采购目标 · ${esc(activeNote)}`;
  }

  const info = (label, value) => `<div class="info-item"><span>${esc(label)}</span><strong>${esc(value || '待补充')}</strong></div>`;

  function openDetail(target) {
    if (!target || !drawer || !layer) return;
    state.lastFocus = document.activeElement;
    const sourceLink = target.officialUrl === '#' ? ''
      : `<a class="primary-btn action-link" href="${esc(target.officialUrl)}" target="_blank" rel="noopener noreferrer">查看官方来源</a>`;
    drawer.innerHTML = `<div class="drawer-head"><div class="detail-identity"><span class="detail-logo">${esc(target.countryCode)}</span><div>`
      + `<div class="detail-title-row"><h2>${esc(target.name)}</h2><span class="grade grade-${target.grade}">${target.grade}级目标</span></div>`
      + `<p>已核验官方采购入口</p><div class="detail-meta"><span>${esc(target.country)} · ${esc(target.region)}</span><span>${esc(target.type)}</span><span>${esc(target.priority)}优先级</span></div>`
      + `</div></div><button class="close-btn" id="close-drawer" aria-label="关闭详情">×</button></div>`
      + `<div class="decision-card"><div><span>目标评分</span><strong>${target.score}</strong></div><div class="decision-copy"><span>当前跟进依据</span>`
      + `<strong>${esc(statusLabel(target))}</strong><small>信息级别：官方来源 · 档案状态：待进一步补充</small></div></div>`
      + `<div class="drawer-actions">${sourceLink}<button class="secondary-btn" id="close-drawer-secondary">返回列表</button></div>`
      + `<section class="detail-section"><div class="section-title"><h3>企业与采购画像</h3><span>${esc(target.id)}</span></div><div class="info-grid">`
      + info('目标名称', target.name) + info('国家 / 地区', `${target.country} · ${target.region}`)
      + info('客户类型', target.type) + info('采集模式', target.crawlMode === 'public' ? '公开自动采集' : '人工核验')
      + info('优先级', target.priority) + info('当前阶段', '已进入目标池') + `</div></section>`
      + `<section class="detail-section"><div class="section-title"><h3>采购与项目信号</h3><span>证据可追溯</span></div>`
      + `<div class="evidence-box"><span>当前证据</span><p>${esc(statusLabel(target))}。系统将继续监测该官方入口中的公开采购公告、供应商注册和项目更新。</p></div>`
      + `<div class="info-grid" style="margin-top:10px">${info('公开采购项目', '待采集发现')}${info('机会价值', '待采购证据确认')}${info('最近公告', '待更新')}${info('负责人', '待销售分配')}</div></section>`
      + `<section class="detail-section"><div class="section-title"><h3>关键联系人</h3><span>公开信息核验</span></div>`
      + `<div class="contact-card"><div class="contact-avatar">?</div><div class="contact-copy"><strong>待官方来源核验</strong><span>采购 / 工程 / 供应商管理联系人</span><small>未发现可确认的公开联系人</small></div>`
      + `<div class="contact-detail"><span>邮箱：待补充</span><span>电话：待补充</span><span>只收录公开商业联系方式</span></div></div></section>`
      + `<section class="detail-section last-section"><div class="section-title"><h3>数据来源与合规</h3><span>${esc(state.generatedAt || '待更新')}</span></div>`
      + `<div class="info-grid">${info('来源状态', target.status)}${info('官方地址', target.officialUrl === '#' ? '地址无效' : target.officialUrl)}</div>`
      + `<div class="compliance-note"><strong>合规提示</strong><span>仅使用公开页面，不绕过登录、验证码或访问控制；缺失信息不会推测生成。</span></div></section>`;
    layer.classList.remove('static-hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('close-drawer')?.addEventListener('click', closeDetail);
    document.getElementById('close-drawer-secondary')?.addEventListener('click', closeDetail);
    document.getElementById('close-drawer')?.focus();
  }

  function closeDetail() {
    if (!layer) return;
    layer.classList.add('static-hidden');
    document.body.style.overflow = '';
    if (state.lastFocus instanceof HTMLElement) state.lastFocus.focus();
  }

  function updateMetrics() {
    const values = document.querySelectorAll('.metrics article strong');
    const publicCount = state.targets.filter(target => target.crawlMode === 'public').length;
    const manualCount = state.targets.filter(target => target.crawlMode === 'manual_only').length;
    if (values[0]) values[0].textContent = String(state.targets.length);
    if (values[1]) values[1].textContent = '0';
    if (values[2]) values[2].textContent = String(publicCount);
    if (values[3]) values[3].textContent = String(manualCount);
  }

  function renderTargets(targets, generatedAt = '') {
    const verified = targets.filter(target => {
      const status = Array.isArray(target) ? 'official_source_verified' : target.status;
      return !status || status.startsWith('official_');
    });
    state.targets = verified.map(normalizeTarget);
    state.generatedAt = generatedAt;
    renderTabs();
    renderRows();
    updateMetrics();
    document.querySelectorAll('.demo-badge').forEach(element => { element.textContent = '仅显示已核验数据'; });
  }

  tabs?.addEventListener('click', event => {
    const button = event.target.closest('[data-channel]');
    if (!button) return;
    state.activeChannel = button.dataset.channel;
    renderTabs();
    renderRows();
  });

  rows?.addEventListener('click', event => {
    if (event.target.closest('[data-source-link]')) return;
    const row = event.target.closest('[data-id]');
    if (row) openDetail(state.targets.find(target => target.id === row.dataset.id));
  });

  rows?.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const row = event.target.closest('[data-id]');
    if (!row || event.target.closest('[data-source-link]')) return;
    event.preventDefault();
    openDetail(state.targets.find(target => target.id === row.dataset.id));
  });

  [query, region, grade].forEach(element => element?.addEventListener('input', renderRows));
  clearFilters?.addEventListener('click', () => {
    if (query) query.value = '';
    if (region) region.value = '全部地区';
    if (grade) grade.value = '全部等级';
    renderRows();
  });
  layer?.addEventListener('mousedown', event => { if (event.target === layer) closeDetail(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !layer?.classList.contains('static-hidden')) closeDetail(); });

  window.AcquireUI = { renderTargets };
  fetch('./crawler/phase-1-buyers.json', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('target_pool_unavailable')))
    .then(data => renderTargets(Array.isArray(data.targets) ? data.targets : [], data.generatedAt || ''))
    .catch(() => {});
})();
