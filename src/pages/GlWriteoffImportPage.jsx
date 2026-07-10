import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Dialog from '../components/Dialog';
import Pagination from '../components/Pagination';
import {
  ChevronBreadcrumbIcon,
  CloseIcon,
  CopyDuplicateIcon,
  DeleteIcon,
  FileDocIcon,
  HistoryOutlineIcon,
  SpinnerIcon,
  UploadCloudIcon,
} from '../icons';
import { UL_DEPT_OPTIONS, GL_ACCOUNT_CODE_OPTIONS, CV_OPTIONS } from '../data';
import { parseCsv, nextGlWriteoffCode, glWriteoffPerPeriodAmount } from '../utils';

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_UPLOAD_EXTENSIONS = ['csv'];
const PROCESSING_DELAY_MS = 1000;
const DEFAULT_SUB_DEPT = '00 - สำนักงานใหญ่';

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

let uploadIdCounter = 0;
function nextUploadId() {
  uploadIdCounter += 1;
  return `glw-import-upload-${Date.now()}-${uploadIdCounter}`;
}

export default function GlWriteoffImportPage({ existing, onCancel, onImport }) {
  const { pushToast, t, tv } = useApp();
  const fileInputRef = useRef(null);
  const uploadTimersRef = useRef({});

  const [files, setFiles] = useState([]);
  const [stage, setStage] = useState('idle'); // idle | uploading | processing | ready
  const [previewRows, setPreviewRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dragOver, setDragOver] = useState(false);

  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importSuccessOpen, setImportSuccessOpen] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const validRows = previewRows.filter((r) => r.ready);

  function clearUploadTimers(id) {
    const timers = uploadTimersRef.current[id];
    if (!timers) return;
    clearInterval(timers.interval);
    delete uploadTimersRef.current[id];
  }

  function runUpload(id) {
    const durationMs = 1000 + Math.random() * 600;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
      const secondsLeft = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress, secondsLeft } : f)));
      if (progress >= 100) {
        clearInterval(interval);
        delete uploadTimersRef.current[id];
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'done' } : f)));
      }
    }, 100);
    uploadTimersRef.current[id] = { interval };
  }

  function beginProcessing(currentFiles) {
    setStage('processing');
    setTimeout(async () => {
      const rows = [];
      let idx = 0;
      for (const f of currentFiles) {
        idx++;
        const text = await f.raw.text();
        const csvRows = parseCsv(text).slice(1);
        for (const cols of csvRows) {
          const [company, dept, docType, docNo, category, description, totalAmountRaw, installmentsRaw, startPeriod] = cols.map((c) =>
            (c ?? '').trim(),
          );
          const reason = validateRow(cols);
          rows.push({
            id: `${f.id}-row-${idx}-${rows.length}`,
            fileName: f.name,
            company,
            dept,
            subDept: DEFAULT_SUB_DEPT,
            docType,
            docNo,
            category,
            description,
            totalAmountRaw,
            installmentsRaw,
            startPeriod,
            debitUl: UL_DEPT_OPTIONS[0],
            debitAccountCode: GL_ACCOUNT_CODE_OPTIONS[0],
            debitCvCode: CV_OPTIONS[0],
            creditUl: UL_DEPT_OPTIONS[3],
            creditAccountCode: GL_ACCOUNT_CODE_OPTIONS[1],
            creditCvCode: CV_OPTIONS[1],
            remark: '-',
            ready: !reason,
            reason,
          });
        }
      }
      setPreviewRows(rows);
      setPage(1);
      setStage('ready');
    }, PROCESSING_DELAY_MS);
  }

  function validateRow(cols) {
    const [company, dept, docType, docNo, category, description, totalAmountRaw, installmentsRaw, startPeriod] = cols.map((c) =>
      (c ?? '').trim(),
    );
    if (!company) return t('ไม่พบชื่อบริษัท');
    if (!dept) return t('ไม่พบหน่วยงานหลัก');
    if (!docType) return t('ไม่พบประเภทเอกสารอ้างอิง');
    if (!docNo) return t('ไม่พบเลขที่เอกสารอ้างอิง');
    if (!category) return t('ไม่พบประเภท');
    if (!description) return t('ไม่พบรายละเอียด');
    if (!(parseFloat((totalAmountRaw ?? '').replace(/,/g, '')) > 0)) return t('ยอดเงินรวมทั้งสัญญาไม่ถูกต้อง');
    if (!(parseInt(installmentsRaw ?? '', 10) > 0)) return t('จำนวนงวดไม่ถูกต้อง');
    if (!/^\d{2}\/\d{4}$/.test(startPeriod ?? '')) return t('รูปแบบงวดเริ่มต้นไม่ถูกต้อง (MM/YYYY)');
    return null;
  }

  function handleFilesSelected(fileList) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList).map((file) => {
      const id = nextUploadId();
      const sizeLabel = formatFileSize(file.size);
      const ext = fileExtension(file.name);
      if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(ext)) {
        return { id, name: file.name, sizeLabel, status: 'error-format', progress: 100, raw: file };
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return { id, name: file.name, sizeLabel, status: 'error-size', progress: 100, raw: file };
      }
      return { id, name: file.name, sizeLabel, status: 'uploading', progress: 0, secondsLeft: 2, raw: file };
    });
    const next = [...files, ...incoming];
    setFiles(next);
    setStage('uploading');
    incoming.forEach((f) => {
      if (f.status === 'uploading') runUpload(f.id);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(id) {
    clearUploadTimers(id);
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    if (next.length === 0) {
      setStage('idle');
      setPreviewRows([]);
    }
  }

  function handleUploadZoneDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  }

  // Kick off processing once every selected file has finished uploading.
  const usableFiles = files.filter((f) => f.status === 'done');
  const stillUploading = files.some((f) => f.status === 'uploading');
  if (stage === 'uploading' && !stillUploading && usableFiles.length > 0 && usableFiles.length !== previewRows.length) {
    beginProcessing(usableFiles);
  }

  function handleImportClick() {
    if (validRows.length === 0) return;
    setImportConfirmOpen(true);
  }

  function handleConfirmImport() {
    setImportConfirmOpen(false);
    let runningEntries = [...existing];
    const newEntries = [];
    let counter = 0;
    for (const row of validRows) {
      const totalAmount = parseFloat(row.totalAmountRaw.replace(/,/g, ''));
      const installments = parseInt(row.installmentsRaw, 10);
      const code = nextGlWriteoffCode(runningEntries);
      const perAmount = glWriteoffPerPeriodAmount(totalAmount, installments);
      counter++;
      const entry = {
        id: `glw-${Date.now()}-${counter}`,
        code,
        company: row.company,
        dept: row.dept,
        subDept: row.subDept,
        docType: row.docType,
        docNo: row.docNo,
        category: row.category,
        description: row.description,
        totalAmount,
        installments,
        installmentsPaid: 0,
        startPeriod: row.startPeriod,
        startDate: `25/${row.startPeriod}`,
        createdBy: 'สิริศักดิ์ หงษ์พัตรา',
        createdAt: new Date().toLocaleDateString('en-GB'),
        status: 'ระหว่างดำเนินการ',
        debitLines: [
          { id: `${code}-d1`, dept: row.debitUl, accountCode: row.debitAccountCode, cvCode: row.debitCvCode, amount: perAmount },
        ],
        creditLines: [
          { id: `${code}-c1`, dept: row.creditUl, accountCode: row.creditAccountCode, cvCode: row.creditCvCode, amount: perAmount },
        ],
        files: [],
      };
      newEntries.push(entry);
      runningEntries = [entry, ...runningEntries];
    }
    onImport(newEntries);
    setImportedCount(newEntries.length);
    setImportSuccessOpen(true);
  }

  function handleImportSuccessClose() {
    setImportSuccessOpen(false);
    onCancel();
  }

  const totalPages = Math.max(1, Math.ceil(previewRows.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = previewRows.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  return (
    <>
      <div className="aft-page-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={onCancel}>
            {t('จัดการรายการตัดบัญชี')}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">{t('นำเข้าไฟล์รายการตัดบัญชี')}</span>
        </div>
        <div className="view-title-row">
          <h1 className="aft-page-title">{t('นำเข้าไฟล์รายการตัดบัญชี')}</h1>
          <div className="view-header-actions">
            <button
              className="ft-btn-outline"
              onClick={() => pushToast(t('ฟีเจอร์นี้จะพร้อมใช้งานเร็ว ๆ นี้'), 'info')}
            >
              <HistoryOutlineIcon color="#074E9F" />
              {t('ประวัติการนำเข้าไฟล์')}
            </button>
          </div>
        </div>
      </div>

      <div className="aft-card">
        {stage === 'idle' && (
          <div
            className={`glw-import-dropzone${dragOver ? ' glw-import-dropzone--drag' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleUploadZoneDrop}
          >
            <UploadCloudIcon />
            <p className="glw-import-dropzone-text">
              <span className="glw-import-dropzone-link">{t('คลิกเพื่ออัปโหลด')}</span> {t('หรือลากไฟล์วางที่นี่')}
            </p>
            <p className="glw-import-dropzone-hint">{t('CSV (MAX. 25MB ต่อไฟล์)')}</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {files.length > 0 && (
          <>
            <div className="glwd-file-header">
              <span className="glwd-file-header-text">
                {t('ไฟล์รายการตัดบัญชี')} <span className="glwd-file-count">{files.length}</span> {t('รายการ')}
              </span>
              <span className="glwd-file-header-divider" />
            </div>
            <div className="glwd-file-list" style={{ marginBottom: 24 }}>
              {files.map((f) => renderFileCard(f))}
            </div>
          </>
        )}

        {stage === 'processing' && (
          <div className="glw-import-processing">
            <div className="glw-import-processing-label">
              {t('ข้อมูลสำหรับนำเข้ารายการตัดบัญชี')}
              <div className="glw-section-subtitle">
                {t('รายการตัดบัญชี')}: -
              </div>
            </div>
            <div className="glw-import-spinner">
              <SpinnerIcon size={48} color="#074e9f" />
              <span>{t('กำลังประมวลผลข้อมูล')}</span>
            </div>
          </div>
        )}

        {stage === 'ready' && (
          <>
            <div className="glw-import-processing-label">
              {t('ข้อมูลสำหรับนำเข้ารายการตัดบัญชี')}
              <div className="glw-section-subtitle">
                {t('รายการตัดบัญชี')}: {previewRows.length}
              </div>
            </div>
            <div className="ft-table-wrapper">
              <table className="ft-table">
                <colgroup>
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '160px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t('ชื่อไฟล์')}</th>
                    <th>{t('รหัสรายการ')}</th>
                    <th>{t('รายละเอียด')}</th>
                    <th>{t('ประเภท')}</th>
                    <th>{t('บริษัท')}</th>
                    <th>{t('หน่วยงานหลัก')}</th>
                    <th>{t('หน่วยงานย่อย')}</th>
                    <th>{t('ยอดเงินรวมทั้งสัญญา')}</th>
                    <th>{t('จำนวนงวด')}</th>
                    <th>{t('เริ่มตัดบัญชีงวดแรก')}</th>
                    <th>{t('ฝ่าย (UL) (เดบิต)')}</th>
                    <th>{t('รหัสบัญชี (เดบิต)')}</th>
                    <th>{t('รหัส CV (เดบิต)')}</th>
                    <th>{t('ฝ่าย (UL) (เครดิต)')}</th>
                    <th>{t('รหัสบัญชี (เครดิต)')}</th>
                    <th>{t('รหัส CV (เครดิต)')}</th>
                    <th>{t('หมายเหตุ')}</th>
                    <th>{t('สถานะ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const totalAmount = parseFloat((row.totalAmountRaw ?? '').replace(/,/g, ''));
                    return (
                      <tr key={row.id}>
                        <td>{row.fileName}</td>
                        <td>-</td>
                        <td>{row.description || '-'}</td>
                        <td>{t(row.category) || '-'}</td>
                        <td>{t(row.company) || '-'}</td>
                        <td>{t(row.dept) || '-'}</td>
                        <td>{t(row.subDept)}</td>
                        <td>{Number.isFinite(totalAmount) ? formatMoney(totalAmount) : '-'}</td>
                        <td>{row.installmentsRaw || '-'}</td>
                        <td>{row.startPeriod || '-'}</td>
                        <td>{t(row.debitUl)}</td>
                        <td>{t(row.debitAccountCode)}</td>
                        <td>{t(row.debitCvCode)}</td>
                        <td>{t(row.creditUl)}</td>
                        <td>{t(row.creditAccountCode)}</td>
                        <td>{t(row.creditCvCode)}</td>
                        <td>{row.remark}</td>
                        <td>
                          {row.ready ? (
                            <span className="glw-import-status-ok">{t('พร้อมนำเข้า')}</span>
                          ) : (
                            <div className="glw-import-status-cell">
                              <span className="glw-import-status-bad">{t('ข้อมูลไม่ถูกต้อง')}</span>
                              <button
                                type="button"
                                className="glw-import-status-more"
                                onClick={() => pushToast(row.reason, 'error')}
                              >
                                {t('ดูเพิ่มเติม')}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pageClamped}
              totalPages={totalPages}
              totalItems={previewRows.length}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={[10, 25, 50]}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}

        <div className="aft-actions">
          <button className="ft-btn-outline" onClick={onCancel}>
            {t('ยกเลิก')}
          </button>
          <button className="aft-btn-add" onClick={handleImportClick} disabled={stage !== 'ready' || validRows.length === 0}>
            {t('นำเข้าไฟล์')}
          </button>
        </div>
      </div>

      <Dialog
        open={importConfirmOpen}
        variant="import"
        title={
          <>
            {t('คุณต้องการนำเข้ารายการตัดบัญชี')} {validRows.length} {t('รายการใช่ไหม?')}
          </>
        }
        message={t('กรุณาตรวจสอบข้อมูลในไฟล์รายการตัดบัญชีก่อนนำเข้า')}
        onClose={() => setImportConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setImportConfirmOpen(false) },
          { label: t('นำเข้าไฟล์'), variant: 'primary', onClick: handleConfirmImport },
        ]}
      />

      <Dialog
        open={importSuccessOpen}
        variant="success"
        title={t('นำเข้ารายการตัดบัญชีสำเร็จ!')}
        message={tv('นำเข้ารายการตัดบัญชี {count} รายการเรียบร้อยแล้ว', { count: importedCount })}
        onClose={handleImportSuccessClose}
        actions={[{ label: t('กลับสู่หน้าหลัก'), variant: 'primary', onClick: handleImportSuccessClose }]}
      />
    </>
  );

  function renderFileCard(file) {
    const isUploading = file.status === 'uploading';
    const isDone = file.status === 'done';
    const isFormatError = file.status === 'error-format';
    const isSizeError = file.status === 'error-size';
    const isError = isFormatError || isSizeError;

    if (isDone) {
      return (
        <div className="glwd-file-card" key={file.id}>
          <FileDocIcon />
          <div className="glwd-file-info">
            <span className="glwd-file-name">{file.name}</span>
            <span className="glwd-file-size">{file.sizeLabel}</span>
          </div>
          <div className="glwd-file-actions">
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--danger"
              title={t('ลบ')}
              onClick={() => removeFile(file.id)}
            >
              <DeleteIcon color="#D92D20" size={16} />
            </button>
            <button type="button" className="glwd-file-action-btn glwd-file-action-btn--outline" title={t('คัดลอก')}>
              <CopyDuplicateIcon />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="glw-upload-card" key={file.id}>
        <FileDocIcon color={isError ? '#BDDBFC' : '#BDDBFC'} />
        <div className="glw-upload-info">
          <div className="glw-upload-name-row">
            <span className="glw-upload-name">{file.name}</span>
          </div>
          <div className={`glw-upload-track${isError ? ' glw-upload-track--error' : ''}`}>
            <div
              className={`glw-upload-fill${isError ? ' glw-upload-fill--error' : ''}`}
              style={{ width: `${file.progress}%` }}
            />
          </div>
          <div className="glw-upload-status-row">
            <span className="glw-upload-status-time">
              {isUploading && tv('{n} วินาที', { n: file.secondsLeft })}
              {isSizeError && file.sizeLabel}
            </span>
            <span
              className={`glw-upload-status-text glw-upload-status-text--${isUploading ? 'uploading' : 'error'}`}
            >
              {isUploading && t('กำลังอัปโหลด…')}
              {isSizeError && t('ขนาดไฟล์เกินกำหนด')}
              {isFormatError && t('รูปแบบไฟล์ไม่ถูกต้อง')}
            </span>
          </div>
        </div>
        <div className="glwd-file-actions">
          {isUploading && (
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--danger"
              title={t('ยกเลิก')}
              onClick={() => removeFile(file.id)}
            >
              <CloseIcon size={16} color="#D92D20" />
            </button>
          )}
          {isError && (
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--danger"
              title={t('ลบ')}
              onClick={() => removeFile(file.id)}
            >
              <DeleteIcon color="#D92D20" size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }
}
