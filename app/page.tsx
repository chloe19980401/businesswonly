"use client";

import { useEffect, useMemo, useState } from "react";
import buyerPool from "../crawler/phase-1-buyers.json";

type ChannelId =
  | "all"
  | "customs"
  | "linkedin"
  | "events"
  | "registry"
  | "search"
  | "projects"
  | "rfq"
  | "referral";

type Customer = {
  id: string;
  channel: Exclude<ChannelId, "all">;
  company: string;
  legalName: string;
  country: string;
  region: string;
  city: string;
  type: string;
  scale: string;
  website: string;
  founded: string;
  revenue: string;
  employees: string;
  products: string[];
  certifications: string[];
  score: number;
  grade: "A" | "B" | "C";
  stage: string;
  owner: string;
  updated: string;
  freshness: string;
  confidence: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  keySignal: string;
  channelEvidence: string;
  buyingEvidence: string;
  currentSuppliers: string[];
  purchaseTrend: string;
  estimatedValue: string;
  lastPurchase: string;
  hsCodes: string[];
  contactName: string;
  contactTitle: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  contactVerified: string;
  language: string;
  nextAction: string;
  nextActionDate: string;
  lastActivity: string;
  tags: string[];
  compliance: string;
  channelFields: Array<[string, string]>;
};

const channels: Array<{ id: ChannelId; label: string; short: string; note: string }> = [
  { id: "all", label: "全部渠道", short: "全", note: "统一账户池" },
  { id: "customs", label: "海关 / 提单", short: "关", note: "采购关系与供应商" },
  { id: "linkedin", label: "LinkedIn", short: "领", note: "决策人与任职信号" },
  { id: "events", label: "展会 / 协会", short: "展", note: "参展与会面机会" },
  { id: "registry", label: "官网 / 工商", short: "企", note: "企业主体与产品" },
  { id: "search", label: "Google / 独立站", short: "搜", note: "主动搜索意图" },
  { id: "projects", label: "工程 / 招投标", short: "项", note: "项目采购窗口" },
  { id: "rfq", label: "B2B平台 / RFQ", short: "询", note: "明确采购需求" },
  { id: "referral", label: "转介绍 / CRM", short: "荐", note: "高信任关系" },
];

const illustrativeCustomers: Customer[] = [
  {
    id: "CUS-001",
    channel: "customs",
    company: "NorthStar Hardware",
    legalName: "NorthStar Architectural Hardware Inc.",
    country: "美国",
    region: "北美",
    city: "Dallas, TX",
    type: "门锁品牌商",
    scale: "大型",
    website: "northstarhardware.example",
    founded: "1987",
    revenue: "约 2.8 亿美元",
    employees: "500-1,000",
    products: ["机械锁", "锁体", "门用五金", "智能锁"],
    certifications: ["ANSI/BHMA", "UL Listed"],
    score: 92,
    grade: "A",
    stage: "重点开发",
    owner: "陈睿",
    updated: "12分钟前",
    freshness: "T+3天",
    confidence: "高 · 94%",
    source: "美国海运提单 API",
    sourceId: "BOL-US-260708-1842",
    sourceUrl: "授权数据源 / 可追溯",
    keySignal: "过去90天锁体进口频次增长42%，同时新增一家越南供应商",
    channelEvidence: "近12个月共37票，买方与收货地址稳定，货描连续命中 mortise lock / door hardware",
    buyingEvidence: "2026-07-08 最新到港；近12个月估算采购重量 1,860 吨",
    currentSuppliers: ["Viet Secure Hardware JSC", "East Asia Lock Manufacturing", "关联供应商待核验"],
    purchaseTrend: "+42% / 90天",
    estimatedValue: "1,200万-1,800万美元/年",
    lastPurchase: "2026-07-08",
    hsCodes: ["8301.40", "8302.41"],
    contactName: "Laura Bennett",
    contactTitle: "Director of Strategic Sourcing",
    contactRole: "采购决策者",
    contactEmail: "l.bennett@northstarhardware.example",
    contactPhone: "+1 214 *** 0186",
    contactLinkedIn: "linkedin.com/in/laura-bennett-demo",
    contactVerified: "工作邮箱已验证 · 7天前",
    language: "英语",
    nextAction: "发送多产地备份与ANSI产品线合作方案",
    nextActionDate: "今天 16:00",
    lastActivity: "邮件已打开2次，尚未回复",
    tags: ["供应商切换", "采购增长", "ANSI", "自有品牌"],
    compliance: "企业工作联系方式；未退订；美国B2B规则待模板复核",
    channelFields: [
      ["运输方式", "海运 / 集装箱"],
      ["起运港", "Yantian / Hai Phong"],
      ["目的港", "Long Beach / Houston"],
      ["主要货描", "Mortise locks, door hardware, lock bodies"],
      ["近12月票数", "37"],
      ["供应商集中度", "Top 1 占比 46%"],
    ],
  },
  {
    id: "CUS-002",
    channel: "customs",
    company: "WestBridge Imports",
    legalName: "WestBridge Building Products Ltd.",
    country: "加拿大",
    region: "北美",
    city: "Vancouver, BC",
    type: "进口商 / 批发商",
    scale: "中型",
    website: "westbridgeimports.example",
    founded: "2004",
    revenue: "约 6,500 万加元",
    employees: "100-250",
    products: ["门锁", "合页", "闭门器"],
    certifications: ["CSA渠道要求"],
    score: 78,
    grade: "B",
    stage: "待补联系人",
    owner: "陈睿",
    updated: "38分钟前",
    freshness: "T+6天",
    confidence: "高 · 88%",
    source: "北美提单合作源",
    sourceId: "BOL-CA-260705-673",
    sourceUrl: "授权数据源 / 可追溯",
    keySignal: "连续3个月从单一供应商采购，补货周期约35天",
    channelEvidence: "买方主体、通知方和官网地址一致；非货代",
    buyingEvidence: "2026-07-05 最新出运；近12个月18票",
    currentSuppliers: ["Guangdong Premium Hardware Co."],
    purchaseTrend: "+9% / 90天",
    estimatedValue: "350万-520万美元/年",
    lastPurchase: "2026-07-05",
    hsCodes: ["8301.40", "8302.60"],
    contactName: "待补全",
    contactTitle: "采购负责人",
    contactRole: "关键缺口",
    contactEmail: "purchasing@westbridgeimports.example",
    contactPhone: "企业总机已核验",
    contactLinkedIn: "企业主页已确认",
    contactVerified: "通用邮箱可用",
    language: "英语",
    nextAction: "补全采购经理并验证现供应商痛点",
    nextActionDate: "明天",
    lastActivity: "尚未触达",
    tags: ["单一供应商", "补货稳定", "加拿大"],
    compliance: "仅企业通用邮箱；允许低频B2B联系",
    channelFields: [["近12月票数", "18"], ["主要港口", "Vancouver"], ["补货周期", "约35天"], ["货代误判", "已排除"]],
  },
  {
    id: "CUS-003",
    channel: "linkedin",
    company: "HomeBuild Retail Group",
    legalName: "HomeBuild Retail Group Corporation",
    country: "美国",
    region: "北美",
    city: "Atlanta, GA",
    type: "连锁建材渠道",
    scale: "超大型",
    website: "homebuildretail.example",
    founded: "1979",
    revenue: "约 86 亿美元",
    employees: "10,000+",
    products: ["门锁", "门窗", "工具", "建材"],
    certifications: ["供应商社会责任", "零售包装合规"],
    score: 89,
    grade: "A",
    stage: "已建立联系",
    owner: "周林",
    updated: "1小时前",
    freshness: "任职更新 2天",
    confidence: "高 · 91%",
    source: "LinkedIn Sales Navigator",
    sourceId: "LI-ACC-907341",
    sourceUrl: "企业与联系人公开职业信息",
    keySignal: "新任Private Label品类经理上任37天，团队正在扩招供应链质量岗位",
    channelEvidence: "采购、品类、质量与自有品牌团队共识别13名相关人员",
    buyingEvidence: "已有同集团历史询价；公开商品页显示自有品牌锁具扩充",
    currentSuppliers: ["现有供应商未完全识别", "集团供应商名单待核验"],
    purchaseTrend: "品类扩张信号",
    estimatedValue: "战略账户 · 待资格确认",
    lastPurchase: "非海关来源",
    hsCodes: ["待匹配"],
    contactName: "Emily Carter",
    contactTitle: "Senior Category Manager, Private Label Hardware",
    contactRole: "品类决策者",
    contactEmail: "e.carter@homebuildretail.example",
    contactPhone: "未获取",
    contactLinkedIn: "linkedin.com/in/emily-carter-demo",
    contactVerified: "职位已确认 · 邮箱规则验证",
    language: "英语",
    nextAction: "以Private Label全案和全国交付能力发起连接",
    nextActionDate: "今天",
    lastActivity: "已查看我方主页，尚未连接",
    tags: ["新任决策人", "Private Label", "连锁渠道"],
    compliance: "公开工作资料；首次联系需说明身份并提供退出方式",
    channelFields: [["职位变动", "37天前上任"], ["团队规模", "采购与品类团队约42人"], ["共同联系", "2人"], ["买方意向", "中等"], ["招聘信号", "Supplier Quality Engineer × 3"]],
  },
  {
    id: "CUS-004",
    channel: "linkedin",
    company: "Rhein Türtechnik",
    legalName: "Rhein Türtechnik GmbH",
    country: "德国",
    region: "欧洲",
    city: "Cologne",
    type: "门厂 / 系统公司",
    scale: "大型",
    website: "rhein-tuertechnik.example",
    founded: "1968",
    revenue: "约 3.1 亿欧元",
    employees: "1,000-2,500",
    products: ["工程门", "防火门", "门用五金"],
    certifications: ["EN标准", "ISO 9001"],
    score: 73,
    grade: "B",
    stage: "培育中",
    owner: "李芸",
    updated: "2小时前",
    freshness: "职位更新 11天",
    confidence: "中高 · 83%",
    source: "LinkedIn + 企业官网",
    sourceId: "LI-ACC-118229",
    sourceUrl: "公开职业与企业信息",
    keySignal: "全球采购团队新增亚洲供应商开发岗位",
    channelEvidence: "供应链负责人、研发经理与产品经理已形成初步决策链",
    buyingEvidence: "官网新增高耐久工程锁配套说明",
    currentSuppliers: ["欧洲本地供应体系", "亚洲供应商待识别"],
    purchaseTrend: "亚洲供应链探索",
    estimatedValue: "待确认",
    lastPurchase: "非海关来源",
    hsCodes: ["8301.40"],
    contactName: "Jonas Weber",
    contactTitle: "Global Sourcing Manager",
    contactRole: "采购影响者",
    contactEmail: "j.weber@rhein-tuertechnik.example",
    contactPhone: "+49 *** 2741",
    contactLinkedIn: "linkedin.com/in/jonas-weber-demo",
    contactVerified: "职位已确认 · 邮箱未二次验证",
    language: "德语 / 英语",
    nextAction: "发送EN工程门五金能力和欧洲项目案例",
    nextActionDate: "本周五",
    lastActivity: "已连接，未发正式介绍",
    tags: ["门厂", "防火门", "欧洲", "新岗位"],
    compliance: "基于职位相关的低频商务沟通；需记录反对",
    channelFields: [["任职年限", "2年4个月"], ["共同联系", "1人"], ["最近动态", "关注亚洲供应链"], ["团队扩招", "Asia Supplier Development"]],
  },
  {
    id: "CUS-005",
    channel: "events",
    company: "Al Noor Door Systems",
    legalName: "Al Noor Door Systems LLC",
    country: "阿联酋",
    region: "中东",
    city: "Dubai",
    type: "门系统制造商",
    scale: "中大型",
    website: "alnoordoors.example",
    founded: "1998",
    revenue: "约 9,000 万美元",
    employees: "250-500",
    products: ["工程门", "酒店门", "锁具配套"],
    certifications: ["ISO 9001", "Civil Defence项目要求"],
    score: 86,
    grade: "A",
    stage: "待预约",
    owner: "王宁",
    updated: "3小时前",
    freshness: "展商名录本周更新",
    confidence: "高 · 90%",
    source: "Big 5 Global展商名录",
    sourceId: "BIG5-2026-H3-B142",
    sourceUrl: "官方展商名单 + 官网核验",
    keySignal: "确认参加Big 5 Global，展品聚焦酒店与公寓门系统",
    channelEvidence: "展位H3-B142；采购总监与技术负责人均预计参会",
    buyingEvidence: "历史CRM记录显示2024年索取过酒店锁样品",
    currentSuppliers: ["欧洲项目供应商", "中国供应商待识别"],
    purchaseTrend: "工程项目扩张",
    estimatedValue: "单项目 80万-250万美元",
    lastPurchase: "CRM记录 2024-11",
    hsCodes: ["8301.40", "8302.41"],
    contactName: "Omar Al Mansoori",
    contactTitle: "Procurement Director",
    contactRole: "采购决策者",
    contactEmail: "omar.m@alnoordoors.example",
    contactPhone: "+971 *** 9210",
    contactLinkedIn: "企业公开职业主页",
    contactVerified: "展会联系人与官网交叉验证",
    language: "英语 / 阿拉伯语",
    nextAction: "预约展会30分钟闭门洽谈并准备工程配套样板",
    nextActionDate: "预约截止前4天",
    lastActivity: "2024年有样品记录",
    tags: ["Big 5", "酒店锁", "工程项目", "历史线索"],
    compliance: "展会商务联系；会后触达须保留来源",
    channelFields: [["展会", "Big 5 Global 2026"], ["展位", "H3-B142"], ["展期", "2026-11-23 至 11-26"], ["预约状态", "待发送邀请"], ["参会角色", "采购总监 / 技术负责人"]],
  },
  {
    id: "CUS-006",
    channel: "events",
    company: "ProFrame Door Manufacturing",
    legalName: "ProFrame Door Manufacturing Corp.",
    country: "美国",
    region: "北美",
    city: "Phoenix, AZ",
    type: "门厂",
    scale: "大型",
    website: "proframedoor.example",
    founded: "1992",
    revenue: "约 4.6 亿美元",
    employees: "1,000-2,500",
    products: ["住宅门", "工程门", "预装门"],
    certifications: ["NAHB会员", "FSC项目"],
    score: 81,
    grade: "A",
    stage: "会前培育",
    owner: "周林",
    updated: "今天 08:20",
    freshness: "协会名录 5天",
    confidence: "高 · 87%",
    source: "IBS展商 + NAHB会员",
    sourceId: "IBS-2027-C2134",
    sourceUrl: "官方展商与协会名录",
    keySignal: "首次以预装智能门方案参展，可能需要整套锁具配套",
    channelEvidence: "展商分类命中Doors / Hardware / Smart Home",
    buyingEvidence: "官网发布新预装门系列；现有锁具品牌有限",
    currentSuppliers: ["品牌配套关系待核验"],
    purchaseTrend: "新产品线",
    estimatedValue: "战略账户",
    lastPurchase: "非海关来源",
    hsCodes: ["待匹配"],
    contactName: "Natalie Brooks",
    contactTitle: "VP Product Development",
    contactRole: "技术与产品决策者",
    contactEmail: "n.brooks@proframedoor.example",
    contactPhone: "未获取",
    contactLinkedIn: "职位已确认",
    contactVerified: "官网新闻与职业信息一致",
    language: "英语",
    nextAction: "会前发送预装门锁模块联合开发提案",
    nextActionDate: "两周内",
    lastActivity: "已进入展会目标名单",
    tags: ["IBS", "门厂", "智能门", "联合开发"],
    compliance: "公开B2B联系信息",
    channelFields: [["展会", "NAHB IBS 2027"], ["展位", "C2134"], ["参展主题", "Pre-hung Smart Door"], ["协会身份", "NAHB Member"], ["会前优先级", "S"]],
  },
  {
    id: "CUS-007",
    channel: "registry",
    company: "SecureCasa México",
    legalName: "SecureCasa Herrajes S.A. de C.V.",
    country: "墨西哥",
    region: "拉美",
    city: "Monterrey",
    type: "品牌商 / 经销商",
    scale: "中型",
    website: "securecasa.example",
    founded: "2011",
    revenue: "约 2,800 万美元",
    employees: "50-100",
    products: ["智能锁", "机械锁", "门控五金"],
    certifications: ["本地工商有效", "商标已注册"],
    score: 72,
    grade: "B",
    stage: "待资格确认",
    owner: "孙倩",
    updated: "今天 07:50",
    freshness: "工商 14天 / 官网 1天",
    confidence: "中高 · 84%",
    source: "官网 + 墨西哥工商公开信息",
    sourceId: "REG-MX-SCH-2011",
    sourceUrl: "公开企业主体信息",
    keySignal: "官网新增智能锁经销商招募页面并扩展至墨西哥中部",
    channelEvidence: "企业主体有效、域名邮箱一致、地址与公开门店一致",
    buyingEvidence: "产品页出现OEM型号特征，需要进一步确认进口关系",
    currentSuppliers: ["OEM来源待识别"],
    purchaseTrend: "渠道扩张",
    estimatedValue: "120万-260万美元/年",
    lastPurchase: "待接入拉美贸易数据",
    hsCodes: ["8301.40"],
    contactName: "Mariana Torres",
    contactTitle: "Directora Comercial",
    contactRole: "商业决策者",
    contactEmail: "mariana.t@securecasa.example",
    contactPhone: "+52 *** 8821",
    contactLinkedIn: "企业主页关联",
    contactVerified: "域名与企业主体一致",
    language: "西班牙语 / 英语",
    nextAction: "西语联系并验证自有品牌与区域代理计划",
    nextActionDate: "3个工作日内",
    lastActivity: "未触达",
    tags: ["拉美", "渠道扩张", "智能锁", "西语"],
    compliance: "企业工作信息；首次联系需提供退出方式",
    channelFields: [["注册状态", "有效"], ["企业类型", "S.A. de C.V."], ["域名年龄", "11年"], ["门店/经销点", "公开26个"], ["网站更新", "1天前"], ["品牌商标", "已核验"]],
  },
  {
    id: "CUS-008",
    channel: "registry",
    company: "Nordic Access Solutions",
    legalName: "Nordic Access Solutions AB",
    country: "瑞典",
    region: "欧洲",
    city: "Gothenburg",
    type: "智能门控品牌",
    scale: "中型",
    website: "nordicaccess.example",
    founded: "2016",
    revenue: "约 4,200 万欧元",
    employees: "100-250",
    products: ["智能锁", "门禁", "公寓系统"],
    certifications: ["CE", "ISO 27001声明待核验"],
    score: 68,
    grade: "B",
    stage: "观察",
    owner: "李芸",
    updated: "昨天",
    freshness: "官网 2天",
    confidence: "中 · 78%",
    source: "官网 / 企业注册 / 产品文档",
    sourceId: "REG-SE-NAS-771",
    sourceUrl: "公开企业与产品信息",
    keySignal: "新发布Matter兼容公寓智能锁，但硬件制造信息不透明",
    channelEvidence: "企业、团队、产品和认证声明可核验；制造主体缺失",
    buyingEvidence: "新品发布说明显示需要亚洲硬件制造伙伴",
    currentSuppliers: ["制造商未知"],
    purchaseTrend: "新品开发",
    estimatedValue: "待确认",
    lastPurchase: "无公开贸易证据",
    hsCodes: ["8301.40"],
    contactName: "Erik Lund",
    contactTitle: "Head of Hardware",
    contactRole: "技术决策者",
    contactEmail: "erik.l@nordicaccess.example",
    contactPhone: "未获取",
    contactLinkedIn: "职位已核验",
    contactVerified: "邮箱规则推测 · 未验证",
    language: "英语 / 瑞典语",
    nextAction: "先补采购角色，再以联合开发和量产能力切入",
    nextActionDate: "下周",
    lastActivity: "加入观察名单",
    tags: ["智能锁", "Matter", "联合开发", "制造商未知"],
    compliance: "欧盟个人数据；联系前完成合法利益评估",
    channelFields: [["注册状态", "有效"], ["产品更新", "Matter系列 · 2天前"], ["技术栈", "BLE / Matter / Cloud"], ["制造信息", "未披露"], ["认证", "CE已见 / ISO待验证"]],
  },
  {
    id: "CUS-009",
    channel: "search",
    company: "UrbanKey Living",
    legalName: "UrbanKey Living Pty Ltd",
    country: "澳大利亚",
    region: "亚太",
    city: "Melbourne",
    type: "公寓智能锁运营商",
    scale: "中型",
    website: "urbankeyliving.example",
    founded: "2018",
    revenue: "约 1,900 万澳元",
    employees: "50-100",
    products: ["公寓智能锁", "物业SaaS", "门禁"],
    certifications: ["RCM要求"],
    score: 83,
    grade: "A",
    stage: "营销合格线索",
    owner: "王宁",
    updated: "8分钟前",
    freshness: "实时网站信号",
    confidence: "高 · 89%",
    source: "Google Ads + 独立站行为",
    sourceId: "WEB-SESSION-771829",
    sourceUrl: "第一方访问与表单数据",
    keySignal: "连续3次搜索 apartment smart lock OEM，并下载ODM能力手册",
    channelEvidence: "公司级访问识别、UTM与表单企业邮箱一致",
    buyingEvidence: "表单填写预计首批2,000套，要求SDK和白标App",
    currentSuppliers: ["未披露"],
    purchaseTrend: "明确项目需求",
    estimatedValue: "首批 28万-46万美元",
    lastPurchase: "新项目",
    hsCodes: ["8301.40"],
    contactName: "Sophie Grant",
    contactTitle: "Product Operations Lead",
    contactRole: "项目发起人",
    contactEmail: "sophie@urbankeyliving.example",
    contactPhone: "+61 *** 4408",
    contactLinkedIn: "待补充",
    contactVerified: "企业表单双重确认",
    language: "英语",
    nextAction: "2小时内由技术销售联系并确认SDK与认证",
    nextActionDate: "今天 14:30",
    lastActivity: "下载ODM手册并提交项目表单",
    tags: ["高意向", "ODM", "白标App", "2,000套"],
    compliance: "主动提交企业表单；同意接收项目回复",
    channelFields: [["搜索词", "apartment smart lock OEM"], ["落地页", "/solutions/smart-lock-odm"], ["访问次数", "3次 / 7天"], ["高意图页面", "SDK、认证、ODM"], ["表单状态", "已提交"], ["UTM", "google / cpc / au-oem"]],
  },
  {
    id: "CUS-010",
    channel: "search",
    company: "PrimeLatch Distribution",
    legalName: "PrimeLatch Distribution LLC",
    country: "美国",
    region: "北美",
    city: "Miami, FL",
    type: "批发商",
    scale: "小中型",
    website: "primelatch.example",
    founded: "2020",
    revenue: "约 1,200 万美元",
    employees: "25-50",
    products: ["锁具", "门把手", "五金套装"],
    certifications: ["待核验"],
    score: 61,
    grade: "C",
    stage: "网站访客",
    owner: "未分配",
    updated: "26分钟前",
    freshness: "实时网站信号",
    confidence: "中 · 72%",
    source: "自然搜索 + 独立站识别",
    sourceId: "WEB-ORG-32980",
    sourceUrl: "第一方访问数据",
    keySignal: "搜索 private label door lock manufacturer，浏览MOQ和包装页面",
    channelEvidence: "公司IP识别为中等置信度，尚未提交表单",
    buyingEvidence: "无明确数量；连续访问产品和MOQ页面",
    currentSuppliers: ["未知"],
    purchaseTrend: "早期研究",
    estimatedValue: "待确认",
    lastPurchase: "无",
    hsCodes: ["待匹配"],
    contactName: "待补全",
    contactTitle: "采购 / 创始人",
    contactRole: "未知",
    contactEmail: "info@primelatch.example",
    contactPhone: "官网总机",
    contactLinkedIn: "企业主页待核验",
    contactVerified: "通用邮箱",
    language: "英语 / 西班牙语",
    nextAction: "继续培育，出现表单或第4次访问后分配",
    nextActionDate: "自动观察",
    lastActivity: "浏览包装定制页面",
    tags: ["Private Label", "早期意向", "批发商"],
    compliance: "未提交表单；暂不主动使用个人信息",
    channelFields: [["搜索词", "private label door lock manufacturer"], ["来源", "Google Organic"], ["访问", "2次 / 3天"], ["页面", "MOQ / Packaging / Locksets"], ["表单", "未提交"]],
  },
  {
    id: "CUS-011",
    channel: "projects",
    company: "Gulf Horizon Developments",
    legalName: "Gulf Horizon Developments PJSC",
    country: "沙特阿拉伯",
    region: "中东",
    city: "Riyadh",
    type: "地产开发商",
    scale: "超大型",
    website: "gulfhorizon.example",
    founded: "2002",
    revenue: "约 24 亿美元",
    employees: "5,000+",
    products: ["地产开发", "酒店", "公寓"],
    certifications: ["供应商预审要求"],
    score: 90,
    grade: "A",
    stage: "项目资格预审",
    owner: "王宁",
    updated: "今天 09:10",
    freshness: "招标更新 1天",
    confidence: "高 · 93%",
    source: "工程项目与招标数据库",
    sourceId: "PRJ-KSA-RYD-2026-188",
    sourceUrl: "项目公告 + 顾问文件",
    keySignal: "Riyadh Gate公寓项目进入门用五金资格预审，预计18,400套门",
    channelEvidence: "开发商、顾问、总包和门包单位已识别；锁具规格尚可影响",
    buyingEvidence: "资格预审文件要求酒店/公寓电子锁及ANSI机械锁方案",
    currentSuppliers: ["指定品牌未锁定", "顾问推荐名单待获取"],
    purchaseTrend: "项目采购窗口",
    estimatedValue: "680万-1,050万美元",
    lastPurchase: "投标截止 2026-08-18",
    hsCodes: ["项目制"],
    contactName: "Fahad Al Rashid",
    contactTitle: "Head of Procurement, Residential Projects",
    contactRole: "项目采购决策者",
    contactEmail: "f.alrashid@gulfhorizon.example",
    contactPhone: "+966 *** 3102",
    contactLinkedIn: "职位已核验",
    contactVerified: "项目文件与官网一致",
    language: "英语 / 阿拉伯语",
    nextAction: "联合当地门包商提交预审材料和参考项目",
    nextActionDate: "7月15日前",
    lastActivity: "已建立项目作战群",
    tags: ["18,400套门", "资格预审", "沙特", "项目型"],
    compliance: "项目商务联系；需完成制裁与合作伙伴筛查",
    channelFields: [["项目", "Riyadh Gate Residences"], ["阶段", "门用五金资格预审"], ["开发商", "Gulf Horizon"], ["顾问", "Axis Design Consultants"], ["总包", "待最终确定"], ["门数量", "约18,400套"], ["截止日期", "2026-08-18"], ["规格状态", "可影响"]],
  },
  {
    id: "CUS-012",
    channel: "projects",
    company: "Baltic Hospitality Partners",
    legalName: "Baltic Hospitality Partners Sp. z o.o.",
    country: "波兰",
    region: "欧洲",
    city: "Warsaw",
    type: "酒店投资与运营",
    scale: "中大型",
    website: "baltichospitality.example",
    founded: "2009",
    revenue: "约 1.7 亿欧元",
    employees: "500-1,000",
    products: ["酒店", "服务式公寓"],
    certifications: ["欧盟项目要求"],
    score: 75,
    grade: "B",
    stage: "项目观察",
    owner: "李芸",
    updated: "昨天 18:40",
    freshness: "项目更新 4天",
    confidence: "中高 · 82%",
    source: "欧洲工程项目数据库",
    sourceId: "PRJ-PL-WAW-7712",
    sourceUrl: "规划与项目公告",
    keySignal: "三家酒店翻新项目预计Q4启动客房门锁采购",
    channelEvidence: "投资方和室内设计顾问已确认，总包尚未公布",
    buyingEvidence: "共约780间客房，需兼容PMS的酒店锁",
    currentSuppliers: ["历史酒店品牌待核验"],
    purchaseTrend: "Q4采购窗口",
    estimatedValue: "48万-86万欧元",
    lastPurchase: "预计2026 Q4",
    hsCodes: ["项目制"],
    contactName: "Anna Kowalska",
    contactTitle: "Development Procurement Manager",
    contactRole: "采购影响者",
    contactEmail: "anna.k@baltichospitality.example",
    contactPhone: "+48 *** 2090",
    contactLinkedIn: "职位已确认",
    contactVerified: "邮箱未二次验证",
    language: "英语 / 波兰语",
    nextAction: "获取PMS品牌和设计顾问规格偏好",
    nextActionDate: "两周内",
    lastActivity: "已建立观察任务",
    tags: ["酒店锁", "翻新", "PMS", "欧洲"],
    compliance: "欧盟B2B；联系前完成合法利益记录",
    channelFields: [["项目", "Warsaw Hotel Renewal Portfolio"], ["阶段", "设计深化"], ["客房", "约780间"], ["采购窗口", "2026 Q4"], ["PMS", "待确认"], ["顾问", "Studio North Europe"]],
  },
  {
    id: "CUS-013",
    channel: "rfq",
    company: "Atlas Home Supplies",
    legalName: "Atlas Home Supplies Trading Co.",
    country: "摩洛哥",
    region: "非洲",
    city: "Casablanca",
    type: "进口商 / 分销商",
    scale: "中型",
    website: "atlashomesupplies.example",
    founded: "2007",
    revenue: "约 3,300 万美元",
    employees: "100-250",
    products: ["门锁", "卫浴", "建材"],
    certifications: ["进口商主体已核验"],
    score: 80,
    grade: "A",
    stage: "待报价",
    owner: "孙倩",
    updated: "5分钟前",
    freshness: "实时RFQ",
    confidence: "高 · 88%",
    source: "B2B平台 RFQ",
    sourceId: "RFQ-MA-260711-881",
    sourceUrl: "买家主动发布需求",
    keySignal: "采购30,000套黄铜锁芯与配套执手，要求法语包装",
    channelEvidence: "买家账号4年、历史完成订单12次、企业域名已验证",
    buyingEvidence: "明确数量、目标交期、包装和样品要求",
    currentSuppliers: ["正在比价，原供应商未知"],
    purchaseTrend: "明确RFQ",
    estimatedValue: "62万-88万美元",
    lastPurchase: "报价截止 72小时",
    hsCodes: ["8301.60", "8302.41"],
    contactName: "Youssef Benali",
    contactTitle: "Purchasing Manager",
    contactRole: "采购决策者",
    contactEmail: "y.benali@atlashomesupplies.example",
    contactPhone: "+212 *** 6170",
    contactLinkedIn: "待补充",
    contactVerified: "平台 + 企业邮箱已验证",
    language: "法语 / 英语 / 阿拉伯语",
    nextAction: "4小时内提交分层报价并申请视频验厂会议",
    nextActionDate: "今天 15:00",
    lastActivity: "RFQ已进入销售池",
    tags: ["30,000套", "法语包装", "72小时", "高意向"],
    compliance: "买家主动询价，可围绕本次需求联系",
    channelFields: [["RFQ编号", "RFQ-MA-260711-881"], ["产品", "Brass cylinders + lever handles"], ["数量", "30,000套"], ["交期", "60天"], ["报价截止", "72小时"], ["买家等级", "Verified / 12 completed orders"], ["竞争报价", "已有8家响应"]],
  },
  {
    id: "CUS-014",
    channel: "rfq",
    company: "Pacific BuildMart",
    legalName: "Pacific BuildMart Pte. Ltd.",
    country: "新加坡",
    region: "亚太",
    city: "Singapore",
    type: "建材渠道",
    scale: "中大型",
    website: "pacificbuildmart.example",
    founded: "1999",
    revenue: "约 1.4 亿美元",
    employees: "250-500",
    products: ["建材", "锁具", "门窗五金"],
    certifications: ["企业已验证"],
    score: 69,
    grade: "B",
    stage: "资格确认",
    owner: "王宁",
    updated: "42分钟前",
    freshness: "RFQ 1小时",
    confidence: "中高 · 81%",
    source: "Global Sources询价",
    sourceId: "GS-RFQ-SG-7720",
    sourceUrl: "平台买家需求",
    keySignal: "寻找智能锁ODM供应商，但首批数量与认证范围未明确",
    channelEvidence: "企业主体真实，采购联系人职位待验证",
    buyingEvidence: "需求包含Tuya/自有App两种方案，预计东南亚渠道销售",
    currentSuppliers: ["未知"],
    purchaseTrend: "早期询价",
    estimatedValue: "待资格确认",
    lastPurchase: "报价截止 7天",
    hsCodes: ["8301.40"],
    contactName: "Daniel Lim",
    contactTitle: "Buyer",
    contactRole: "采购执行者",
    contactEmail: "daniel.l@pacificbuildmart.example",
    contactPhone: "+65 *** 1028",
    contactLinkedIn: "职位待验证",
    contactVerified: "平台验证",
    language: "英语 / 中文",
    nextAction: "先确认年采购量、渠道和认证，再决定是否报价",
    nextActionDate: "明天",
    lastActivity: "已发送资格问题",
    tags: ["智能锁", "ODM", "东南亚", "资格待确认"],
    compliance: "围绕主动询价联系",
    channelFields: [["需求", "Smart lock ODM"], ["数量", "未明确"], ["技术", "Tuya / Private App"], ["市场", "Singapore / Malaysia"], ["报价截止", "7天"], ["买家状态", "Verified"]],
  },
  {
    id: "CUS-015",
    channel: "referral",
    company: "EverDoor International",
    legalName: "EverDoor International Holdings Ltd.",
    country: "英国",
    region: "欧洲",
    city: "Manchester",
    type: "门业集团",
    scale: "大型",
    website: "everdoor.example",
    founded: "1974",
    revenue: "约 5.2 亿英镑",
    employees: "2,500-5,000",
    products: ["住宅门", "防火门", "门用五金"],
    certifications: ["UKCA", "FSC", "ISO 9001"],
    score: 94,
    grade: "A",
    stage: "高层引荐",
    owner: "海外销售总监",
    updated: "今天 10:05",
    freshness: "实时CRM",
    confidence: "极高 · 97%",
    source: "现有客户集团转介绍",
    sourceId: "REF-CRM-2026-0711-02",
    sourceUrl: "内部CRM + 引荐记录",
    keySignal: "现有客户CEO引荐集团采购副总裁，集团正在进行供应商整合",
    channelEvidence: "引荐关系、会议意愿和业务背景均由现有客户确认",
    buyingEvidence: "集团年采购门用五金规模明确，计划新增亚洲战略供应商",
    currentSuppliers: ["欧洲供应商A", "土耳其供应商B", "中国供应商待进入"],
    purchaseTrend: "供应商整合窗口",
    estimatedValue: "2,000万-3,500万美元/年",
    lastPurchase: "持续采购",
    hsCodes: ["8301.40", "8302.41", "8302.60"],
    contactName: "Richard Hall",
    contactTitle: "Group VP Procurement",
    contactRole: "经济与采购决策者",
    contactEmail: "richard.hall@everdoor.example",
    contactPhone: "+44 *** 6628",
    contactLinkedIn: "已确认",
    contactVerified: "引荐人确认",
    language: "英语",
    nextAction: "由管理层参与首次会议，准备集团供应商整合提案",
    nextActionDate: "7月14日 17:00",
    lastActivity: "会议邀请已接受",
    tags: ["高层引荐", "集团采购", "供应商整合", "战略账户"],
    compliance: "基于明确商务引荐；CRM已记录",
    channelFields: [["引荐人", "现有客户CEO"], ["关系强度", "强"], ["集团公司", "7家"], ["历史关系", "现有客户合作6年"], ["会议", "2026-07-14已确认"], ["机会类型", "集团框架供应商"]],
  },
  {
    id: "CUS-016",
    channel: "referral",
    company: "MiraCasa Distribution",
    legalName: "MiraCasa Distribution S.L.",
    country: "西班牙",
    region: "欧洲",
    city: "Valencia",
    type: "区域经销商",
    scale: "中型",
    website: "miracasa.example",
    founded: "2005",
    revenue: "约 4,800 万欧元",
    employees: "100-250",
    products: ["门锁", "家居五金", "智能家居"],
    certifications: ["欧盟主体有效"],
    score: 82,
    grade: "A",
    stage: "复苏线索",
    owner: "李芸",
    updated: "今天 09:45",
    freshness: "CRM事件 20分钟",
    confidence: "高 · 92%",
    source: "历史CRM + 前员工转介绍",
    sourceId: "CRM-OPP-2023-188-REV",
    sourceUrl: "内部历史商机与引荐",
    keySignal: "2023年因认证周期丢单，现由前联系人介绍新采购负责人",
    channelEvidence: "历史样品、报价、丢单原因和新引荐均完整",
    buyingEvidence: "计划更新智能锁产品线，预计首年8,000套",
    currentSuppliers: ["现供应商交期不稳定"],
    purchaseTrend: "重新选型",
    estimatedValue: "110万-180万欧元/年",
    lastPurchase: "预计2026 Q3选型",
    hsCodes: ["8301.40"],
    contactName: "Lucía Navarro",
    contactTitle: "Purchasing Director",
    contactRole: "采购决策者",
    contactEmail: "lucia.n@miracasa.example",
    contactPhone: "+34 *** 1180",
    contactLinkedIn: "已确认",
    contactVerified: "引荐 + 企业邮箱",
    language: "西班牙语 / 英语",
    nextAction: "引用历史项目并说明认证周期已缩短，安排新品评审",
    nextActionDate: "本周四",
    lastActivity: "新联系人已回复愿意了解",
    tags: ["丢单复苏", "交期痛点", "8,000套", "西班牙"],
    compliance: "现有商务关系与明确引荐；提供退出方式",
    channelFields: [["原商机", "CRM-2023-188"], ["原丢单原因", "认证周期"], ["引荐人", "前采购经理"], ["新需求", "智能锁 8,000套/年"], ["回复状态", "已回复"], ["关系温度", "热"]],
  },
];

const countryNames: Record<string, string> = {
  AE: "阿联酋",
  SA: "沙特阿拉伯",
  QA: "卡塔尔",
  OM: "阿曼",
  BH: "巴林",
  KZ: "哈萨克斯坦",
  KG: "吉尔吉斯斯坦",
  TJ: "塔吉克斯坦",
  UZ: "乌兹别克斯坦",
  AF: "阿富汗",
  PK: "巴基斯坦",
};

const countryRegions: Record<string, string> = {
  AE: "中东",
  SA: "中东",
  QA: "中东",
  OM: "中东",
  BH: "中东",
  KZ: "中亚",
  KG: "中亚",
  TJ: "中亚",
  UZ: "中亚",
  AF: "中亚",
  PK: "中亚",
};

const customerTypeNames: Record<string, string> = {
  government_buyer_network: "政府采购网络",
  real_estate_developer: "房地产开发商",
  tourism_real_estate_developer: "文旅地产开发商",
  mega_project_developer: "大型项目开发商",
  government_procurement_portal: "政府采购平台",
  public_works_buyer: "公共工程采购方",
  government_buyer: "政府采购方",
  institutional_buyer: "机构采购方",
  quasi_state_procurement_portal: "国有企业采购平台",
  government_procurement_directory: "政府采购目录",
};

const countryLanguages: Record<string, string> = {
  AE: "阿拉伯语 / 英语",
  SA: "阿拉伯语 / 英语",
  QA: "阿拉伯语 / 英语",
  OM: "阿拉伯语 / 英语",
  BH: "阿拉伯语 / 英语",
  KZ: "哈萨克语 / 俄语 / 英语",
  KG: "吉尔吉斯语 / 俄语",
  TJ: "塔吉克语 / 俄语",
  UZ: "乌兹别克语 / 俄语 / 英语",
  AF: "达里语 / 普什图语",
  PK: "乌尔都语 / 英语",
};

function targetId(country: string, name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52);
  return `BUY-${country}-${slug || "target"}`;
}

// Only official, user-configured targets are converted into product records.
const customers: Customer[] = buyerPool.targets
  .filter((target) => target.status.startsWith("official_"))
  .map((target) => {
    const score = target.priority === "S1" ? 90 : target.priority === "S2" ? 80 : 70;
    const automatic = target.crawlMode === "public";
    const signal = automatic ? "已进入公开自动采集" : "网站条款要求人工核验";
    return {
      id: targetId(target.country, target.name),
      channel: "projects",
      company: target.name,
      legalName: `${target.name} · 已核验官方采购入口`,
      country: countryNames[target.country] ?? target.country,
      region: countryRegions[target.country] ?? "亚太",
      city: "全国",
      type: customerTypeNames[target.type] ?? target.type,
      scale: "机构采购目标",
      website: target.officialUrl,
      founded: "待公开来源补充",
      revenue: "待公开来源补充",
      employees: "待公开来源补充",
      products: ["门锁及建筑五金（待采购证据确认）"],
      certifications: ["待具体项目公告确认"],
      score,
      grade: score >= 85 ? "A" : score >= 75 ? "B" : "C",
      stage: automatic ? "公开监测" : "人工核验",
      owner: "待销售分配",
      updated: buyerPool.generatedAt,
      freshness: "按采集计划更新",
      confidence: "官方来源 · 待采购证据",
      source: "官方采购 / 供应商入口",
      sourceId: targetId(target.country, target.name),
      sourceUrl: target.officialUrl,
      keySignal: signal,
      channelEvidence: `已确认 ${target.name} 的官方采购或供应商入口，当前采集模式为 ${automatic ? "公开自动采集" : "人工核验"}。`,
      buyingEvidence: "已核验官方采购入口；具体采购公告和产品需求待持续采集。",
      currentSuppliers: ["待公开来源补充"],
      purchaseTrend: "待采购公告确认",
      estimatedValue: "待采购证据确认",
      lastPurchase: "待采购公告确认",
      hsCodes: ["待公告确认"],
      contactName: "待补全",
      contactTitle: "采购 / 工程 / 供应商管理联系人",
      contactRole: "待官方来源核验",
      contactEmail: "邮箱：待补充",
      contactPhone: "电话：待补充",
      contactLinkedIn: "职业主页：待补充",
      contactVerified: "未发现可确认的公开联系人",
      language: countryLanguages[target.country] ?? "待核验",
      nextAction: automatic ? "持续监测官方采购公告与供应商页面" : "按网站条款进行人工核验",
      nextActionDate: "本周",
      lastActivity: `官方入口状态：${target.status}`,
      tags: [target.priority, countryRegions[target.country] ?? "目标市场", "官方来源"],
      compliance: "仅使用公开页面，不绕过登录、验证码或访问控制；缺失信息不会推测生成。",
      channelFields: [
        ["优先级", target.priority],
        ["采集模式", automatic ? "公开自动采集" : "人工核验"],
        ["来源状态", target.status],
        ["国家代码", target.country],
        ["采购入口", target.officialUrl],
        ["档案状态", "待采购证据与联系人补充"],
      ],
    } satisfies Customer;
  });

const verifiedContactCount = customers.filter((customer) => customer.contactName !== "待补全").length;
const automaticTargetCount = buyerPool.targets.filter((target) => target.status.startsWith("official_") && target.crawlMode === "public").length;
const manualTargetCount = buyerPool.targets.filter((target) => target.status.startsWith("official_") && target.crawlMode === "manual_only").length;

const channelMap = Object.fromEntries(channels.map((channel) => [channel.id, channel]));

function scoreTone(score: number) {
  if (score >= 80) return "strong";
  if (score >= 65) return "medium";
  return "light";
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("acquire");
  const [activeChannel, setActiveChannel] = useState<ChannelId>("all");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("全部地区");
  const [grade, setGrade] = useState("全部等级");
  const [selected, setSelected] = useState<Customer | null>(customers[0]);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const inChannel = activeChannel === "all" || customer.channel === activeChannel;
      const inRegion = region === "全部地区" || customer.region === region;
      const inGrade = grade === "全部等级" || customer.grade === grade;
      const haystack = [
        customer.company,
        customer.legalName,
        customer.country,
        customer.type,
        customer.contactName,
        customer.keySignal,
        customer.tags.join(" "),
      ].join(" ").toLowerCase();
      return inChannel && inRegion && inGrade && (!normalized || haystack.includes(normalized));
    });
  }, [activeChannel, grade, query, region]);

  const channelCount = (channel: ChannelId) =>
    channel === "all" ? customers.length : customers.filter((item) => item.channel === channel).length;

  const openCustomer = (customer: Customer) => {
    setSelected(customer);
    setDetailOpen(true);
  };

  const activeLabel = channelMap[activeChannel];

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLButtonElement>(".primary-nav .nav-item"));
    const workspace = document.querySelector<HTMLElement>(".workspace");
    const ids = ["acquire", "accounts", "contacts", "tasks", "sources", "analytics"];
    items.forEach((item, index) => item.classList.toggle("active", ids[index] === activeNav));
    workspace?.querySelectorAll<HTMLElement>(":scope > :not(.module-panel)").forEach((node) => {
      node.style.display = activeNav === "acquire" ? "" : "none";
    });
    items.forEach((item, index) => {
      item.onclick = () => {
        setActiveNav(ids[index] ?? "acquire");
      };
    });
    return () => items.forEach((item) => { item.onclick = null; });
  }, [activeNav]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">A</div>
          <div>
            <strong>Acquire OS</strong>
            <span>全球客户情报系统</span>
          </div>
        </div>

        <nav className="primary-nav" aria-label="主导航">
          <button className="nav-item active"><span>⌂</span>获客中心</button>
          <button className="nav-item"><span>◎</span>账户雷达</button>
          <button className="nav-item"><span>◇</span>联系人</button>
          <button className="nav-item"><span>✓</span>任务与商机</button>
          <button className="nav-item"><span>▦</span>数据源中心</button>
          <button className="nav-item"><span>◫</span>分析中心</button>
        </nav>

        <div className="sidebar-foot">
          <div className="sync-status"><span className="status-dot" />8个渠道正常同步</div>
          <div className="user-row"><span className="avatar">陈</span><div><strong>陈睿</strong><small>北美品牌客户组</small></div></div>
        </div>
      </aside>

      <section className="workspace" data-active-nav={activeNav}>
        {activeNav !== "acquire" && <div className="module-panel"><div className="eyebrow">Acquire OS / 模块</div><h1>{activeNav === "accounts" ? "账户雷达" : activeNav === "contacts" ? "联系人" : activeNav === "tasks" ? "任务与商机" : activeNav === "sources" ? "数据源中心" : "分析中心"}</h1><p>该模块只展示带来源 URL、抓取时间和证据片段的已验证公开数据。</p><div className="module-empty"><strong>等待真实数据</strong><span>当前没有可展示的已核验记录，不生成虚拟信息。</span></div><button className="primary-btn" onClick={() => setActiveNav("acquire")}>返回获客中心</button></div>}
        <header className="topbar">
          <div>
            <div className="eyebrow">获客中心 / 全渠道客户池</div>
            <h1>全球目标客户</h1>
            <p>从采购证据、决策人、项目与主动意向中识别最值得跟进的账户。</p>
          </div>
          <div className="top-actions">
            <span className="demo-badge">仅显示已核验数据</span>
            <button className="secondary-btn">导入数据</button>
            <button className="primary-btn">＋ 新建名单</button>
          </div>
        </header>

        <section className="metrics" aria-label="客户池概览">
          <article><span>已核验账户</span><strong>{customers.length}</strong><small>均保留官方来源</small></article>
          <article><span>已核验联系人</span><strong>{verifiedContactCount}</strong><small>不展示虚拟联系人</small></article>
          <article><span>自动采集目标</span><strong>{automaticTargetCount}</strong><small>持续监测公开页面</small></article>
          <article><span>人工核验目标</span><strong>{manualTargetCount}</strong><small>遵守网站访问条款</small></article>
        </section>

        <section className="channel-panel">
          <div className="channel-tabs" role="tablist" aria-label="获客渠道">
            {channels.map((channel) => (
              <button
                key={channel.id}
                role="tab"
                aria-selected={activeChannel === channel.id}
                className={activeChannel === channel.id ? "channel-tab selected" : "channel-tab"}
                onClick={() => setActiveChannel(channel.id)}
              >
                <span className="channel-symbol">{channel.short}</span>
                <span><strong>{channel.label}</strong><small>{channel.note}</small></span>
                <em>{channelCount(channel.id)}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="content-panel">
          <div className="filterbar">
            <label className="search-box">
              <span>⌕</span>
              <input
                aria-label="搜索客户"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索公司、联系人、产品或信号"
              />
            </label>
            <select aria-label="地区" value={region} onChange={(event) => setRegion(event.target.value)}>
              <option>全部地区</option><option>北美</option><option>欧洲</option><option>中东</option><option>中亚</option><option>拉美</option><option>亚太</option><option>非洲</option>
            </select>
            <select aria-label="账户等级" value={grade} onChange={(event) => setGrade(event.target.value)}>
              <option>全部等级</option><option>A</option><option>B</option><option>C</option>
            </select>
            <button className="filter-btn">更多筛选</button>
            <div className="result-count"><strong>{filtered.length}</strong> 条客户 · {activeLabel.note}</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>账户</th>
                  <th>客户类型 / 地区</th>
                  <th>渠道与关键信号</th>
                  <th>采购 / 项目价值</th>
                  <th>关键联系人</th>
                  <th>评分</th>
                  <th>阶段 / 负责人</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`查看 ${customer.company} 详情`}
                    onClick={() => openCustomer(customer)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openCustomer(customer);
                      }
                    }}
                  >
                    <td>
                      <div className="account-main"><span className="company-logo">{customer.company.slice(0, 2).toUpperCase()}</span><div><strong>{customer.company}</strong><small>{customer.legalName}</small><div className="tag-line">{customer.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div></div></div>
                    </td>
                    <td><strong>{customer.type}</strong><small>{customer.country} · {customer.city}</small><small>{customer.employees}人</small></td>
                    <td><span className="channel-pill">{channelMap[customer.channel].label}</span><strong className="signal-text">{customer.keySignal}</strong><small>{customer.source}</small></td>
                    <td><strong>{customer.estimatedValue}</strong><small>{customer.buyingEvidence}</small><small>趋势：{customer.purchaseTrend}</small></td>
                    <td><strong>{customer.contactName}</strong><small>{customer.contactTitle}</small><small>{customer.contactVerified}</small></td>
                    <td><div className={`score score-${scoreTone(customer.score)}`}>{customer.score}</div><small>{customer.confidence}</small></td>
                    <td><span className={`grade grade-${customer.grade}`}>{customer.grade}级</span><strong>{customer.stage}</strong><small>{customer.owner}</small></td>
                    <td><a className="source-link" href={customer.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>查看来源</a><small>{customer.updated}</small><small>{customer.sourceId}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state"><strong>没有符合条件的客户</strong><span>尝试清除关键词或调整地区、等级筛选。</span></div>}
          </div>
        </section>
      </section>

      {detailOpen && selected && (
        <div className="drawer-layer" role="presentation" onMouseDown={() => setDetailOpen(false)}>
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={`${selected.company}客户详情`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div className="detail-identity"><span className="detail-logo">{selected.company.slice(0, 2).toUpperCase()}</span><div><div className="detail-title-row"><h2>{selected.company}</h2><span className={`grade grade-${selected.grade}`}>{selected.grade}级账户</span></div><p>{selected.legalName}</p><div className="detail-meta"><span>{selected.country} · {selected.city}</span><span>{selected.type}</span><span>{selected.employees}人</span></div></div></div>
              <button className="close-btn" aria-label="关闭详情" onClick={() => setDetailOpen(false)}>×</button>
            </div>

            <div className="decision-card">
              <div><span>账户评分</span><strong>{selected.score}</strong></div>
              <div className="decision-copy"><span>为什么现在值得跟进</span><strong>{selected.keySignal}</strong><small>置信度 {selected.confidence} · 数据新鲜度 {selected.freshness}</small></div>
            </div>

            <div className="drawer-actions"><a className="primary-btn action-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">查看官方来源</a><button className="secondary-btn" onClick={() => setDetailOpen(false)}>返回列表</button></div>

            <section className="detail-section">
              <div className="section-title"><h3>企业画像</h3><span>标准账户 · {selected.id}</span></div>
              <div className="info-grid">
                <Info label="官方网站" value={selected.website} />
                <Info label="成立年份" value={selected.founded} />
                <Info label="估算营收" value={selected.revenue} />
                <Info label="企业规模" value={`${selected.scale} · ${selected.employees}人`} />
                <Info label="主要产品" value={selected.products.join("、")} />
                <Info label="认证 / 要求" value={selected.certifications.join("、")} />
              </div>
            </section>

            <section className="detail-section">
              <div className="section-title"><h3>{channelMap[selected.channel].label}专属信息</h3><span>{selected.source}</span></div>
              <div className="info-grid channel-info">
                {selected.channelFields.map(([label, value]) => <Info key={label} label={label} value={value} />)}
              </div>
              <div className="evidence-box"><span>渠道证据</span><p>{selected.channelEvidence}</p></div>
            </section>

            <section className="detail-section">
              <div className="section-title"><h3>采购与供应商情报</h3><span>证据可追溯</span></div>
              <div className="info-grid">
                <Info label="购买证据" value={selected.buyingEvidence} />
                <Info label="最近采购 / 节点" value={selected.lastPurchase} />
                <Info label="采购趋势" value={selected.purchaseTrend} />
                <Info label="预估机会价值" value={selected.estimatedValue} />
                <Info label="HS / 产品编码" value={selected.hsCodes.join("、")} />
                <Info label="当前供应商" value={selected.currentSuppliers.join("；")} />
              </div>
            </section>

            <section className="detail-section">
              <div className="section-title"><h3>关键联系人</h3><span>{selected.contactRole}</span></div>
              <div className="contact-card">
                <div className="contact-avatar">{selected.contactName === "待补全" ? "?" : selected.contactName.slice(0, 1)}</div>
                <div className="contact-copy"><strong>{selected.contactName}</strong><span>{selected.contactTitle}</span><small>{selected.contactVerified}</small></div>
                <div className="contact-detail"><span>{selected.contactEmail}</span><span>{selected.contactPhone}</span><span>{selected.contactLinkedIn}</span><span>语言：{selected.language}</span></div>
              </div>
            </section>

            <section className="detail-section">
              <div className="section-title"><h3>销售行动</h3><span>{selected.stage}</span></div>
              <div className="next-action"><span>建议下一步</span><strong>{selected.nextAction}</strong><small>计划时间：{selected.nextActionDate} · 负责人：{selected.owner}</small></div>
              <div className="activity-row"><span>最近活动</span><strong>{selected.lastActivity}</strong></div>
            </section>

            <section className="detail-section last-section">
              <div className="section-title"><h3>数据来源与合规</h3><span>{selected.sourceId}</span></div>
              <div className="info-grid">
                <Info label="数据来源" value={selected.source} />
                <Info label="来源说明" value={selected.sourceUrl} />
                <Info label="最近更新" value={`${selected.updated} · ${selected.freshness}`} />
                <Info label="可信度" value={selected.confidence} />
              </div>
              <div className="compliance-note"><strong>合规提示</strong><span>{selected.compliance}</span></div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-item"><span>{label}</span><strong>{value}</strong></div>;
}
