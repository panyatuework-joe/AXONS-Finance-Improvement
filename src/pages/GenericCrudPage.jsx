import { useMemo, useState } from 'react';
import Select from '../components/Select';
import Pagination from '../components/Pagination';
import Dialog from '../components/Dialog';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { PlusIcon, SearchIcon, EditIcon, DeleteIcon, CloseIcon } from '../icons';

const PAGE_SIZE = 10;

export default function GenericCrudPage({ config, data, onChange }) {
  const { t, tv } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);

  const keyField = config.fields[0];

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      config.fields.some((f) => {
        const raw = row[f.key] ?? '';
        return raw.toLowerCase().includes(q) || t(raw).toLowerCase().includes(q);
      }),
    );
  }, [data, search, config.fields, t]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function openAdd() {
    const initial = {};
    config.fields.forEach((f) => {
      initial[f.key] = '';
    });
    setFormValues(initial);
    setErrors({});
    setEditingRow(null);
    setModalMode('add');
  }

  function openEdit(row) {
    setFormValues({ ...row });
    setErrors({});
    setEditingRow(row);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
  }

  function clearFieldError(key) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const e = {};
    config.fields.forEach((f) => {
      if (f.required !== false && !formValues[f.key]?.trim()) e[f.key] = t('กรุณากรอกข้อมูล');
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function isDuplicate() {
    const newVal = formValues[keyField.key]?.trim().toLowerCase();
    return data.some((r) => r.id !== editingRow?.id && (r[keyField.key] ?? '').trim().toLowerCase() === newVal);
  }

  function handleSubmit() {
    if (!validate()) return;
    if (isDuplicate()) {
      setDuplicateOpen(true);
      return;
    }
    if (modalMode === 'add') {
      const newRow = { id: `${config.key}-${Date.now()}`, ...formValues };
      onChange([newRow, ...data]);
      setSuccessText(tv('เพิ่ม{title}สำเร็จ!', { title: t(config.title) }));
    } else if (modalMode === 'edit' && editingRow) {
      onChange(data.map((r) => (r.id === editingRow.id ? { ...editingRow, ...formValues } : r)));
      setSuccessText(tv('แก้ไข{title}สำเร็จ!', { title: t(config.title) }));
    }
    closeModal();
    setSuccessOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    onChange(data.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteSuccessOpen(true);
  }

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t(config.title)}</h1>
        <div className="ft-header-buttons">
          <button className="ft-btn-primary" onClick={openAdd}>
            <PlusIcon />
            {t(config.addLabel)}
          </button>
        </div>
      </div>

      <div className="ft-content-card">
        <div className="ft-search-filter">
          <div className="ft-search-input">
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t(config.searchPlaceholder)}
            />
          </div>
        </div>

        <div className="ft-table-wrapper">
          <table className="ft-table">
            <thead>
              <tr>
                {config.fields.map((f) => (
                  <th key={f.key}>{t(f.label)}</th>
                ))}
                <th className="ft-table-action-col"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr className="ft-empty-row">
                  <td colSpan={config.fields.length + 1}>{t('ไม่พบข้อมูล')}</td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr key={row.id}>
                  {config.fields.map((f) => (
                    <td key={f.key}>{f.key === 'status' ? <StatusBadge value={row[f.key]} /> : t(row[f.key])}</td>
                  ))}
                  <td className="ft-table-action-col">
                    <div className="ft-table-actions">
                      <button className="ft-action-btn" title={t('แก้ไข')} onClick={() => openEdit(row)}>
                        <EditIcon />
                      </button>
                      <button className="ft-action-btn" title={t('ลบ')} onClick={() => setDeleteTarget(row)}>
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pageClamped}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {modalMode && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? t(config.addLabel) : tv('แก้ไข{title}', { title: t(config.title) })}</h3>
              <button className="modal-close" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              {config.fields.map((f) => (
                <div className="modal-field" key={f.key}>
                  <label className="aft-form-label">
                    {t(f.label)} {f.required !== false && <span className="aft-required">*</span>}
                  </label>
                  {f.type === 'select' ? (
                    <Select
                      value={formValues[f.key] ?? ''}
                      onChange={(v) => {
                        setFormValues((p) => ({ ...p, [f.key]: v }));
                        clearFieldError(f.key);
                      }}
                      options={(f.options ?? []).map((o) => ({ value: o, label: t(o) }))}
                      placeholder={t('กรุณาเลือก')}
                      error={!!errors[f.key]}
                      className="aft-select"
                    />
                  ) : (
                    <input
                      className={`modal-input${errors[f.key] ? ' modal-input--error' : ''}`}
                      value={formValues[f.key] ?? ''}
                      onChange={(e) => {
                        setFormValues((p) => ({ ...p, [f.key]: e.target.value }));
                        clearFieldError(f.key);
                      }}
                    />
                  )}
                  {errors[f.key] && <span className="field-error">{errors[f.key]}</span>}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="ft-btn-outline" onClick={closeModal}>
                {t('ยกเลิก')}
              </button>
              <button className="ft-btn-primary" onClick={handleSubmit}>
                {modalMode === 'add' ? t('เพิ่ม') : t('บันทึก')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        variant="delete"
        title={t('คุณต้องการลบรายการนี้ใช่ไหม?')}
        message={t('หากลบแล้ว จะไม่สามารถเรียกคืนได้อีก')}
        onClose={() => setDeleteTarget(null)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setDeleteTarget(null) },
          { label: t('ลบ'), variant: 'danger', onClick: handleDelete },
        ]}
      />

      <Dialog
        open={deleteSuccessOpen}
        variant="success"
        title={tv('ลบ{title}สำเร็จ!', { title: t(config.title) })}
        autoCloseMs={3000}
        onClose={() => setDeleteSuccessOpen(false)}
      />

      <Dialog
        open={duplicateOpen}
        variant="error"
        title={t('ไม่สามารถบันทึกข้อมูลได้')}
        message={tv('{label}นี้มีอยู่ในระบบแล้ว กรุณาใช้ค่าอื่น', { label: t(keyField.label) })}
        onClose={() => setDuplicateOpen(false)}
        actions={[{ label: t('ยอมรับ'), variant: 'primary', onClick: () => setDuplicateOpen(false) }]}
      />

      <Dialog
        open={successOpen}
        variant="success"
        title={successText}
        autoCloseMs={3000}
        onClose={() => setSuccessOpen(false)}
      />
    </>
  );
}
