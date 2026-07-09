# AXONS Finance — GL

A React + Vite implementation of the `AXONS FINANCE [GL]` Figma design — an enterprise back-office
finance / general ledger application.

## What this includes

- App shell: top nav bar, collapsible sidebar navigation, footer — matching the Figma design system.
- หน้าแรก (Home dashboard) with module summary cards.
- บัญชีแยกประเภท (General Ledger):
  - ตรวจสอบบัญชีกระทบยอด (Reconciliation) list + detail views.
  - ตัดบัญชี GL (GL write-off): list, create, and edit form.
  - รายงาน (Reports) and จัดการข้อมูล (Data management, e.g. account groups, financial targets).
- การตั้งค่า (Settings) and logged-out screen.
- Shared design system (design tokens, typography, buttons, badges, tables, pagination, dialogs,
  combobox/select, date range picker) driven by Figma variables.
- Thai/English i18n and local mock data for all modules.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

```bash
npm run build    # type-check + production build
npm run preview  # preview the production build
```
