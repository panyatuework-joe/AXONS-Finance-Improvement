import { glWriteoffPerPeriodAmount, buildPeriodCode, calcTaxAmount } from './utils';

export const YEAR_OPTIONS = ['2024', '2025', '2026', '2027'];

export const THAI_MONTH_OPTIONS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const BUDDHIST_YEAR_OPTIONS = ['2567', '2568', '2569', '2570'];

export const COMPANY_OPTIONS = [
  'บริษัท เจริญโภคภัณฑ์โปรดิ๊วส จำกัด',
  'บริษัท เจริญโภคภัณฑ์อาหาร จำกัด (มหาชน)',
  'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
  'บริษัท ทรู คอร์ปอเรชั่น จำกัด (มหาชน)',
];

export const DEPT_OPTIONS = [
  '00 - สำนักงานใหญ่',
  '01 - Corn Seed R&D Business',
  '02 - Corn Seed Business',
  '03 - Corn Seed Extension Business',
  '04 - Corn Seed Business',
  '05 - Fertiliser Business',
  '06 - HarvestBoost Solutions',
  '07 - EcoBloom Nutrients',
  '08 - GreenGrow Fertilizers',
  '09 - AgriMax Fertilizers',
];

export const ACCOUNT_OPTIONS = [
  'B02 - เงินสดและรายการเทียบเท่าเงินสด',
  'B03 - เงินลงทุนชั่วคราว-สุทธิ',
  'B04 - ลูกหนี้และตั๋วเงินรับการค้าบริษัทที่เกี่ยวข้อง',
  'B05 - หัก ค่าเผื่อหนี้สงสัยจะสูญลูกหนี้ และตั๋วเงินรับ',
  'B06 - เงินให้กู้ยืมระยะสั้น-บริษัทที่เกี่ยวข้องกัน',
  'B07 - เงินให้กู้ยืมระยะสั้น-บริษัทอื่น',
  'B08 - หัก ค่าเผื่อหนี้สงสัยจะสูญเงินให้กู้ยืมระยะสั้น',
  'B09 - สินค้าคงเหลือ',
  'B10 - ลูกหนี้ระหว่างกัน',
  'B11 - ลูกหนี้และตั๋วเงินรับการค้าบริษัทอื่น',
];

function seedMonthlyAmounts(seedIndex) {
  return Array.from({ length: 12 }, (_, m) => (seedIndex + 1) * 10000 + m * 1500);
}

export function seedFinancialTargets() {
  return DEPT_OPTIONS.map((dept, i) => ({
    id: `ft-${i + 1}`,
    year: '2026',
    dept,
    subDept: '00 - สำนักงาน',
    accountCode: ACCOUNT_OPTIONS[i],
    monthlyAmounts: seedMonthlyAmounts(i),
  }));
}

const ACCOUNT_GROUP_SEED = [
  { code: 'B01', nameTH: 'เงินสดและรายการเทียบเท่าเงินสด', nameEN: 'Cash and cash equivalents', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
  { code: 'B02', nameTH: 'เงินลงทุนชั่วคราว-สุทธิ', nameEN: 'Short-term investments, net', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
  { code: 'B03', nameTH: 'ลูกหนี้และตั๋วเงินรับการค้าบริษัทที่เกี่ยวข้อง', nameEN: 'Trade accounts and notes receivable - related companies', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '24/12/2025 13:00' },
  { code: 'B04', nameTH: 'ลูกหนี้และตั๋วเงินรับการค้าบริษัทอื่น', nameEN: 'Trade accounts and notes receivable - other companies', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
  { code: 'B05', nameTH: 'หัก ค่าเผื่อหนี้สงสัยจะสูญลูกหนี้ และตั๋วเงินรับ', nameEN: 'Less: allowance for doubtful accounts and notes receivable', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '26/12/2025 13:00' },
  { code: 'B06', nameTH: 'เงินให้กู้ยืมระยะสั้น-บริษัทที่เกี่ยวข้องกัน', nameEN: 'Short-term loans - related companies', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
  { code: 'B07', nameTH: 'เงินให้กู้ยืมระยะสั้น-บริษัทอื่น', nameEN: 'Short-term loans - other companies', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
  { code: 'B08', nameTH: 'หัก ค่าเผื่อหนี้สงสัยจะสูญเงินให้กู้ยืมระยะสั้น', nameEN: 'Less: allowance for doubtful short-term loans', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
  { code: 'B15', nameTH: 'สินค้าคงเหลือ', nameEN: 'Inventories', allowEdit: false, carryForward: false, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
  { code: 'B1501', nameTH: 'สินค้าคงเหลือ', nameEN: 'Inventories', allowEdit: true, carryForward: true, createdAt: '03/11/2025 13:00', updatedAt: '03/11/2025 13:00' },
];

const ACCOUNT_GROUP_CREATORS = ['Nattapong Chaiyaporn', 'Kritsada Poonwong', 'Sakchai Thongthong', 'Piyawat Srisai'];

export function seedAccountGroups() {
  return ACCOUNT_GROUP_SEED.map((item, i) => ({
    id: `ag-${i + 1}`,
    ...item,
    createdBy: ACCOUNT_GROUP_CREATORS[i % ACCOUNT_GROUP_CREATORS.length],
  }));
}

export const MODULE_CONFIGS = {
  reports: {
    key: 'reports',
    title: 'รายงาน',
    addLabel: 'เพิ่มรายงาน',
    searchPlaceholder: 'ค้นหาด้วย ชื่อรายงาน',
    fields: [
      { key: 'name', label: 'ชื่อรายงาน', type: 'text' },
      { key: 'type', label: 'ประเภทรายงาน', type: 'select', options: ['งบกำไรขาดทุน', 'งบแสดงฐานะการเงิน', 'งบกระแสเงินสด'] },
      { key: 'period', label: 'รอบบัญชี', type: 'text' },
      { key: 'status', label: 'สถานะ', type: 'select', options: ['ฉบับร่าง', 'เผยแพร่แล้ว'] },
    ],
  },
  'report-lines': {
    key: 'report-lines',
    title: 'บรรทัดรายงาน',
    addLabel: 'เพิ่มบรรทัดรายงาน',
    searchPlaceholder: 'ค้นหาด้วย รหัสบรรทัด หรือ ชื่อบรรทัดรายงาน',
    fields: [
      { key: 'code', label: 'รหัสบรรทัด', type: 'text' },
      { key: 'name', label: 'ชื่อบรรทัดรายงาน', type: 'text' },
      { key: 'order', label: 'ลำดับ', type: 'text' },
      { key: 'status', label: 'สถานะ', type: 'select', options: ['ใช้งาน', 'ไม่ใช้งาน'] },
    ],
  },
  'link-account-groups': {
    key: 'link-account-groups',
    title: 'ผูกกลุ่มบัญชี',
    addLabel: 'เพิ่มการผูกกลุ่มบัญชี',
    searchPlaceholder: 'ค้นหาด้วย รหัสบัญชี หรือ กลุ่มบัญชี',
    fields: [
      { key: 'accountCode', label: 'รหัสบัญชี', type: 'text' },
      { key: 'accountGroup', label: 'กลุ่มบัญชี', type: 'text' },
      { key: 'dept', label: 'หน่วยงาน', type: 'select', options: DEPT_OPTIONS },
      { key: 'status', label: 'สถานะ', type: 'select', options: ['ใช้งาน', 'ไม่ใช้งาน'] },
    ],
  },
  'link-report-lines': {
    key: 'link-report-lines',
    title: 'ผูกบรรทัดรายงาน',
    addLabel: 'เพิ่มการผูกบรรทัดรายงาน',
    searchPlaceholder: 'ค้นหาด้วย กลุ่มบัญชี หรือ บรรทัดรายงาน',
    fields: [
      { key: 'accountGroup', label: 'กลุ่มบัญชี', type: 'text' },
      { key: 'reportLine', label: 'บรรทัดรายงาน', type: 'text' },
      { key: 'order', label: 'ลำดับ', type: 'text' },
      { key: 'status', label: 'สถานะ', type: 'select', options: ['ใช้งาน', 'ไม่ใช้งาน'] },
    ],
  },
};

function row(id, fields) {
  return { id, ...fields };
}

export function seedModuleData() {
  return {
    reports: [
      row('rp-1', { name: 'งบกำไรขาดทุนประจำเดือน ม.ค. 2026', type: 'งบกำไรขาดทุน', period: '01/2026', status: 'เผยแพร่แล้ว' }),
      row('rp-2', { name: 'งบแสดงฐานะการเงิน Q1 2026', type: 'งบแสดงฐานะการเงิน', period: 'Q1/2026', status: 'ฉบับร่าง' }),
      row('rp-3', { name: 'งบกระแสเงินสดประจำปี 2025', type: 'งบกระแสเงินสด', period: '2025', status: 'เผยแพร่แล้ว' }),
    ],
    'report-lines': [
      row('rl-1', { code: 'RL01', name: 'รายได้จากการขาย', order: '1', status: 'ใช้งาน' }),
      row('rl-2', { code: 'RL02', name: 'ต้นทุนขาย', order: '2', status: 'ใช้งาน' }),
      row('rl-3', { code: 'RL03', name: 'ค่าใช้จ่ายในการบริหาร', order: '3', status: 'ไม่ใช้งาน' }),
    ],
    'link-account-groups': [
      row('lag-1', { accountCode: 'B02', accountGroup: 'AG01 - สินทรัพย์หมุนเวียน', dept: DEPT_OPTIONS[0], status: 'ใช้งาน' }),
      row('lag-2', { accountCode: 'B06', accountGroup: 'AG02 - หนี้สินหมุนเวียน', dept: DEPT_OPTIONS[1], status: 'ใช้งาน' }),
    ],
    'link-report-lines': [
      row('lrl-1', { accountGroup: 'AG01 - สินทรัพย์หมุนเวียน', reportLine: 'RL01 - รายได้จากการขาย', order: '1', status: 'ใช้งาน' }),
      row('lrl-2', { accountGroup: 'AG02 - หนี้สินหมุนเวียน', reportLine: 'RL02 - ต้นทุนขาย', order: '2', status: 'ไม่ใช้งาน' }),
    ],
  };
}

// ===== GL Write-off (ตัดบัญชี GL) =====

export const GL_WRITEOFF_COMPANY = '6613 - บมจ.กรุงเทพโปรดิ๊วส';

export const DOC_TYPE_OPTIONS = ['01 - ใบแจ้งหนี้', '02 - ใบกำกับภาษี', '03 - ใบเสร็จรับเงิน'];

export const DOC_NO_OPTIONS = [
  'A21-1096-SN24-0002',
  'A21-1096-SN24-0003',
  'A21-1096-SN24-0004',
  'A21-1096-SN24-0005',
  'A21-1096-SN24-0006',
];

export const WRITEOFF_CATEGORY_OPTIONS = ['จ่ายล่วงหน้า', 'รับล่วงหน้า', 'ค่าใช้จ่ายค้างจ่าย', 'รายได้ค้างรับ'];

export const UL_DEPT_OPTIONS = [
  '101 - บริหารโรงงาน',
  '102 - การจัดการโลจิสติกส์',
  '103 - การบริหารจัดการ',
  '190 - สำนักงานเอกสาร',
];

export const GL_ACCOUNT_CODE_OPTIONS = ['01 - เดบิต', '02 - เครดิต'];

export const CV_OPTIONS = [
  '100010000 - บริษัท เจริญโภคภัณฑ์โปรดิ๊วส จำกัด',
  '100010089 - บริษัท เจริญโภคภัณฑ์อาหาร จำกัด (มหาชน)',
];

export const START_PERIOD_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const month = ((5 + i) % 12) + 1;
  const year = 2569 + Math.floor((5 + i) / 12);
  return `${String(month).padStart(2, '0')}/${year}`;
});

const GL_WRITEOFF_SEED = [
  { description: 'ค่าเช่าสำนักงานสาขาสุขุมวิท จ่ายล่วงหน้า 12 เดือน', dept: '00 - สำนักงานใหญ่', category: 'จ่ายล่วงหน้า', totalAmount: 200000, installments: 6, installmentsPaid: 3, status: 'ระหว่างดำเนินการ' },
  { description: 'ค่าประกันภัยทรัพย์สินจ่ายล่วงหน้า 1 ปี', dept: '01 - Corn Seed R&D Business', category: 'จ่ายล่วงหน้า', totalAmount: 150500, installments: 3, installmentsPaid: 2, status: 'แบบร่าง' },
  { description: 'รายได้ค่าบริการดูแลและระบบรับล่วงหน้า (ลูกค้า ABC)', dept: '02 - Corn Seed Business', category: 'จ่ายล่วงหน้า', totalAmount: 320100, installments: 6, installmentsPaid: 1, status: 'หยุดชั่วคราว' },
  { description: 'ค่าสมาชิกซอฟต์แวร์รับล่วงหน้า (License 1 ปี)', dept: '03 - Corn Seed Extension Business', category: 'รับล่วงหน้า', totalAmount: 75250, installments: 12, installmentsPaid: 9, status: 'ระหว่างดำเนินการ' },
  { description: 'ค่าบริการสนับสนุนทางเทคนิครายปี', dept: '04 - Corn Seed Business', category: 'จ่ายล่วงหน้า', totalAmount: 980000, installments: 6, installmentsPaid: 3, status: 'ระหว่างดำเนินการ' },
  { description: 'ค่าบริการอัปเกรดซอฟต์แวร์เซิร์ฟเวอร์ชันใหม่', dept: '05 - Fertiliser Business', category: 'รับล่วงหน้า', totalAmount: 430125, installments: 6, installmentsPaid: 4, status: 'ยกเลิก' },
  { description: 'ค่าธรรมเนียมการติดตั้งระบบครั้งแรก', dept: '06 - HarvestBoost Solutions', category: 'จ่ายล่วงหน้า', totalAmount: 560300, installments: 3, installmentsPaid: 1, status: 'ระหว่างดำเนินการ' },
  { description: 'ค่าบริการฝึกอบรมผู้ใช้งาน', dept: '07 - EcoBloom Nutrients', category: 'จ่ายล่วงหน้า', totalAmount: 1200000, installments: 12, installmentsPaid: 9, status: 'ระหว่างดำเนินการ' },
  { description: 'ค่าบริการสำรองข้อมูลและกู้คืนระบบ', dept: '08 - GreenGrow Fertilizers', category: 'รับล่วงหน้า', totalAmount: 870450, installments: 12, installmentsPaid: 6, status: 'หยุดชั่วคราว' },
  { description: 'ค่าโฆษณาออนไลน์จ่ายล่วงหน้า ไตรมาส 3/2569', dept: '09 - AgriMax Fertilizers', category: 'จ่ายล่วงหน้า', totalAmount: 615000, installments: 12, installmentsPaid: 12, status: 'จ่ายครบแล้ว' },
  { description: 'ค่าเบี้ยประกันรถยนต์บริษัทจ่ายล่วงหน้า 1 ปี', dept: '00 - สำนักงานใหญ่', category: 'จ่ายล่วงหน้า', totalAmount: 96000, installments: 12, installmentsPaid: 12, status: 'จ่ายครบแล้ว' },
  { description: 'ค่าสมาชิกฐานข้อมูลวิจัยตลาดรับล่วงหน้า (License 1 ปี)', dept: '01 - Corn Seed R&D Business', category: 'รับล่วงหน้า', totalAmount: 264000, installments: 6, installmentsPaid: 6, status: 'จ่ายครบแล้ว' },
  { description: 'ค่าเช่าคลังสินค้าสาขาระยอง จ่ายล่วงหน้า 6 เดือน', dept: '04 - Corn Seed Business', category: 'จ่ายล่วงหน้า', totalAmount: 342000, installments: 6, installmentsPaid: 6, status: 'จ่ายครบแล้ว' },
];

export function seedGlWriteoffEntries() {
  return GL_WRITEOFF_SEED.map((item, i) => {
    const monthly = glWriteoffPerPeriodAmount(item.totalAmount, item.installments);
    return {
      id: `glw-${i + 1}`,
      code: `RCE-26062526-${String(i + 1).padStart(4, '0')}`,
      company: GL_WRITEOFF_COMPANY,
      dept: item.dept,
      subDept: '00 - สำนักงานใหญ่',
      docType: DOC_TYPE_OPTIONS[0],
      docNo: DOC_NO_OPTIONS[i % DOC_NO_OPTIONS.length],
      category: item.category,
      description: item.description,
      totalAmount: item.totalAmount,
      installments: item.installments,
      installmentsPaid: item.installmentsPaid,
      startPeriod: '06/2569',
      startDate: '25/06/2569',
      createdBy: 'Nattapong Chaiyaporn',
      createdAt: '25/06/2026',
      status: item.status,
      debitLines: [
        { id: `glw-${i + 1}-d1`, dept: UL_DEPT_OPTIONS[0], accountCode: GL_ACCOUNT_CODE_OPTIONS[0], cvCode: CV_OPTIONS[0], amount: monthly },
      ],
      creditLines: [
        { id: `glw-${i + 1}-c1`, dept: UL_DEPT_OPTIONS[3], accountCode: GL_ACCOUNT_CODE_OPTIONS[1], cvCode: CV_OPTIONS[1], amount: monthly },
      ],
      files: i === 0 ? ['CPALL130921.pdf', 'CPALL130921.pdf', 'CPALL130921.pdf'] : [],
    };
  });
}

const RECONCILIATION_SEED = [
  { id: 'rc-1', name: 'ทะเบียนทรัพย์สิน เท่ากับGL ข้อมูลในเดือน', category: 'AA', matchedReport: 'FXR18000 vs 1771–1780' },
  { id: 'rc-2', name: 'ทะเบียนทรัพย์สิน เท่ากับ GL สะสม', category: 'AA', matchedReport: 'FXR07000 vs ACR14000' },
  { id: 'rc-3', name: 'ใบสำคัญค้างจ่าย เท่ากับ GL', category: 'AP', matchedReport: 'SSCPVR0300 vs 2122' },
  { id: 'rc-4', name: 'งบทดลองกับ GR คงค้าง', category: 'AP', matchedReport: 'SSCPVI1200 vs 2123' },
  { id: 'rc-5', name: 'รายงานภาษีหัก ณ ที่จ่าย เท่ากับ GL', category: 'AP', matchedReport: 'SSCACR0200 vs 2211' },
  { id: 'rc-6', name: 'รายงานภาษีซื้อ เท่ากับ GL', category: 'AP', matchedReport: 'SSCACR0300 vs 2212100' },
  { id: 'rc-7', name: 'ทะเบียนเช็ค', category: 'RP', matchedReport: 'RCR16000 vs 1117,1210,1260' },
  { id: 'rc-8', name: 'รายงานภาษีขาย เท่ากับ GL', category: 'AR', matchedReport: 'ACR04010 vs 2212200' },
  { id: 'rc-9', name: 'ลูกหนี้รายตัว เท่ากับ GL', category: 'CR BP', matchedReport: 'RCR17000 vs 1230' },
  { id: 'rc-10', name: 'รายงานเกษตรกรรายตัว เท่ากับ GL', category: 'CR BP', matchedReport: 'RCR17010 vs 1250' },
  { id: 'rc-11', name: 'รายงานค่าใช้จ่ายตามฝ่าย (ขาย-บริหาร)', category: 'BP', matchedReport: 'ACR10000 vs งบกำไรขาดทุน 21,22' },
  { id: 'rc-12', name: 'งบฐานะการเงิน ลูกหนี้ระหว่างกัน', category: 'GL', matchedReport: '1302,1304 vs 1301,1303' },
];

export function seedReconciliationItems() {
  return RECONCILIATION_SEED.map((item) => ({
    ...item,
    status: 'pass',
    lastChecked: '15/05/2569 09:00',
  }));
}

// ===== Purchase Tax Invoice (บันทึกภาษีซื้อ) — ref. legacy ACM04000 =====

export const PT_DOC_TYPE_OPTIONS = ['ใบกำกับภาษีเต็มรูป', 'ใบกำกับภาษีอย่างย่อ', 'ใบลดหนี้', 'ใบเพิ่มหนี้'];

export const PT_STATUS_OPTIONS = ['รอบันทึก', 'ยืนยันแล้ว', 'ยกเลิก'];

// อ้างถึง: ประเภทเอกสารต้นทางที่มาจาก GL/AP — ต้องยืนยันรายการที่แท้จริงกับ BA (ดู Open Questions)
export const PT_REF_DOC_TYPE_OPTIONS = [
  '21 - ใบสำคัญจ่าย (AP Invoice)',
  '22 - รายการบันทึกบัญชี (GL Posting)',
  '23 - รายการตัดบัญชีอัตโนมัติ (Recurring GL)',
];

export const PT_VENDOR_OPTIONS = [
  'บริษัท ไทยยูเนี่ยน ฟีดมิลล์ จำกัด (มหาชน)',
  'บริษัท บางกอกแร้นช์ จำกัด (มหาชน)',
  'บริษัท เบทาโกร จำกัด (มหาชน)',
  'บริษัท อายิโนะโมะโต๊ะ (ประเทศไทย) จำกัด',
  'บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)',
];

// เอกสารอ้างอิงจาก GL/AP ที่ Post แล้ว — เฉพาะรายการที่ยังไม่ถูกบันทึกภาษีซื้อจะถูกใช้เป็นตัวเลือกในหน้าจอ "เลือก"
const PT_REF_DOC_SEED = [
  { docNo: '21066012606008', refDocType: PT_REF_DOC_TYPE_OPTIONS[0], vendorName: PT_VENDOR_OPTIONS[0], description: 'ซื้อวัตถุดิบอาหารสัตว์ประจำเดือนมิถุนายน', dept: DEPT_OPTIONS[0], subDept: '00 - สำนักงานใหญ่', amount: 27559254.37 },
  { docNo: '21066012606009', refDocType: PT_REF_DOC_TYPE_OPTIONS[0], vendorName: PT_VENDOR_OPTIONS[1], description: 'ซื้อไก่มีชีวิตจากฟาร์มเครือข่าย', dept: DEPT_OPTIONS[1], subDept: '00 - สำนักงานใหญ่', amount: 4520100 },
  { docNo: '22066012606010', refDocType: PT_REF_DOC_TYPE_OPTIONS[1], vendorName: PT_VENDOR_OPTIONS[2], description: 'ค่าบริการขนส่งสินค้าระหว่างคลัง', dept: DEPT_OPTIONS[2], subDept: '00 - สำนักงานใหญ่', amount: 890000 },
  { docNo: '21066012606011', refDocType: PT_REF_DOC_TYPE_OPTIONS[0], vendorName: PT_VENDOR_OPTIONS[3], description: 'ซื้อวัตถุเจือปนอาหารสำหรับสายการผลิต', dept: DEPT_OPTIONS[3], subDept: '00 - สำนักงานใหญ่', amount: 1250750.5 },
  { docNo: '23066012606012', refDocType: PT_REF_DOC_TYPE_OPTIONS[2], vendorName: PT_VENDOR_OPTIONS[4], description: 'ค่าเช่าเครื่องจักรบรรจุภัณฑ์รายเดือน', dept: DEPT_OPTIONS[4], subDept: '00 - สำนักงานใหญ่', amount: 356800 },
  { docNo: '21066012606013', refDocType: PT_REF_DOC_TYPE_OPTIONS[0], vendorName: PT_VENDOR_OPTIONS[0], description: 'ซื้อวัตถุดิบอาหารสัตว์เพิ่มเติม', dept: DEPT_OPTIONS[0], subDept: '00 - สำนักงานใหญ่', amount: 3120450 },
];

export function seedPurchaseTaxRefDocs() {
  return PT_REF_DOC_SEED.map((item, i) => ({ id: `ptref-${i + 1}`, ...item }));
}

const PT_PERIOD_JUNE_2569 = buildPeriodCode('มิถุนายน', '2569', THAI_MONTH_OPTIONS);

const PT_INVOICE_SEED = [
  { refIndex: 0, vendorInvoiceNo: 'INV-6906-000123', invoiceDate: '2026-06-05', taxRate: 7, status: 'ยืนยันแล้ว' },
  { refIndex: 1, vendorInvoiceNo: 'INV-6906-000456', invoiceDate: '2026-06-08', taxRate: 7, status: 'รอบันทึก' },
  { refIndex: 2, vendorInvoiceNo: 'TX-2026-000789', invoiceDate: '2026-06-10', taxRate: 7, status: 'รอบันทึก' },
];

export function seedPurchaseTaxInvoices() {
  const refDocs = seedPurchaseTaxRefDocs();
  return PT_INVOICE_SEED.map((item, i) => {
    const ref = refDocs[item.refIndex];
    return {
      id: `pti-${i + 1}`,
      code: `VT${PT_PERIOD_JUNE_2569}-${String(i + 1).padStart(4, '0')}`,
      period: PT_PERIOD_JUNE_2569,
      month: 'มิถุนายน',
      year: '2569',
      dept: ref.dept,
      subDept: ref.subDept,
      docType: PT_DOC_TYPE_OPTIONS[0],
      invoiceDate: item.invoiceDate,
      vendorInvoiceNo: item.vendorInvoiceNo,
      vendorName: ref.vendorName,
      description: ref.description,
      refDocType: ref.refDocType,
      refDocNo: ref.docNo,
      taxRate: item.taxRate,
      baseAmount: ref.amount,
      taxAmount: calcTaxAmount(ref.amount, item.taxRate),
      status: item.status,
      cancelReason: '',
      createdBy: 'Nattapong Chaiyaporn',
      createdAt: '01/06/2026',
    };
  });
}
