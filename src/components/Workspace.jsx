'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JalaliDateField from '@/components/JalaliDateField';
import { toMinor } from '@/lib/money';
import {
  Activity, Banknote, Bell, BookOpenCheck, BriefcaseBusiness, ChartNoAxesCombined,
  ChevronLeft, CirclePlus, Download, FileText, Folder, LayoutDashboard, LogOut, Menu,
  Moon, Printer, Search, Settings, Sun, Trash2, Users, X,
} from 'lucide-react';

const navigation = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { key: 'bills', label: 'بل‌ها', icon: FileText },
  { key: 'customers', label: 'مشتریان', icon: Users },
  { key: 'dues', label: 'باقی‌دارها', icon: Banknote },
  { key: 'expenses', label: 'مصارف', icon: BriefcaseBusiness },
  { key: 'reports', label: 'گزارش هفتگی', icon: ChartNoAxesCombined },
  { key: 'notifications', label: 'اعلان‌ها', icon: Bell },
  { key: 'settings', label: 'تنظیمات', icon: Settings },
];

const english = {
  'داشبورد': 'Dashboard', 'بل‌ها': 'Bills', 'مشتریان': 'Customers', 'باقی‌دارها': 'Outstanding',
  'مصارف': 'Expenses', 'گزارش هفتگی': 'Weekly reports', 'اعلان‌ها': 'Notifications',
  'تنظیمات': 'Settings', 'مدیریت شرکت': 'Company management', 'سامانه مالی': 'Finance workspace',
  'جست‌وجو در این بخش': 'Search all sections', 'هنوز موردی ثبت نشده': 'Nothing here yet',
  'اطلاعات': 'records', 'بل': 'bill', 'خدمت': 'service', 'مصرف': 'expense',
  'مشتری': 'customer', 'باقی‌دار': 'outstanding customer', 'پرداخت': 'payment', 'گزارش': 'report',
  'نام مشتری': 'Customer name', 'تلفن': 'Phone', 'آدرس': 'Address', 'یادداشت': 'Note',
  'نام مشتری جدید': 'New customer name', 'تلفن مشتری': 'Customer phone', 'تاریخ': 'Date',
  'پرداخت اولیه': 'Initial payment', 'شناسه بل (اختیاری)': 'Bill ID (optional)',
  'مبلغ': 'Amount', 'نام خدمت': 'Service name', 'قیمت پیش‌فرض': 'Default price',
  'واحد': 'Unit', 'نوع مصرف جدید': 'New expense type', 'نام کاربری': 'Username',
  'نام کامل': 'Full name', 'رمز (حداقل ۶ حرف)': 'Password (at least 6 characters)',
  'نام شرکت': 'Company name', 'متن پایین چاپ': 'Print footer', 'شماره شروع بل': 'Bill starting number',
  'طول شماره بل': 'Bill number length', 'پیشوند مشتری': 'Customer prefix', 'شماره شروع مشتری': 'Customer starting number',
  'واحد پول': 'Currency', 'شماره': 'Number', 'نام': 'Name', 'جمع': 'Total',
  'عملیات': 'Actions', 'شروع': 'Start', 'پایان': 'End', 'درآمد': 'Revenue',
  'سود': 'Profit', 'جزئیات': 'Details', 'وضعیت': 'Status',
  'از تاریخ': 'From', 'تا تاریخ': 'To', 'شماره بل': 'Bill number', 'مجموع': 'Total',
  'قیمت واحد': 'Unit price', 'تعداد': 'Quantity', 'مشتری موجود': 'Existing customer',
  'مشتری جدید': 'New customer', 'تخفیف': 'Discount', 'روش پرداخت': 'Payment method',
  'نقد': 'Cash', 'بانک': 'Bank', 'کارت': 'Card', 'ثبت مشتری': 'Add customer',
  'فهرست مشتریان': 'Customer folders', 'بل جدید': 'New bill', 'مصارف روزانه': 'Daily expenses',
  'کاربران': 'Users', 'شرکت': 'Company', 'شماره‌گذاری': 'Numbering', 'خدمات': 'Services',
  'انواع مصرف': 'Expense types', 'پشتیبان': 'Backup', 'روشن': 'Light', 'تیره': 'Dark',
  'دری': 'Dari', 'جست‌وجو...': 'Searching...', 'نتیجه‌ای پیدا نشد': 'No results found',
  'خلاصه عملکرد': 'Performance summary', 'درآمد امروز': 'Today’s revenue',
  'مصارف امروز': 'Today’s expenses', 'سود خالص امروز': 'Net profit today',
  'مجموع باقی مشتریان': 'Total outstanding', 'سفارش‌های ثبت‌شده': 'Recorded bills',
  'هزینه‌های ثبت‌شده': 'Recorded expenses', 'درآمد پس از مصارف': 'Revenue after expenses',
  'بل‌های اخیر': 'Recent bills', 'آخرین اسناد مالی ثبت‌شده': 'Latest financial records',
  'همه بل‌ها': 'All bills', 'مشتریانی که پرداخت دارند': 'Customers with outstanding balances',
  'مشاهده': 'View', 'اطلاعات مشتری در پروفایل مالی نگهداری می‌شود.': 'Customer details are kept in the financial profile.',
  'ثبت سند مالی': 'New financial record',
  'بل‌های ثبت‌شده': 'Recorded bills', 'اقلام را اضافه کنید؛ جمع و پرداخت هنگام ذخیره محاسبه می‌شوند.': 'Add line items; totals and payments are calculated when saved.',
  'پرداخت مشتریان': 'Customer payments', 'دریافت پرداخت و بررسی مانده‌ها در یک بخش.': 'Record payments and review balances in one place.',
  'مشتریان باقی‌دار': 'Customers with outstanding balances', 'تاریخچه پرداخت‌ها': 'Payment history',
  'ثبت مصرف': 'Record expense', 'مصارف روزانه را با نوع و تاریخ ثبت کنید.': 'Record daily expenses by type and date.',
  'فهرست مصارف': 'Expense list', 'گزارش‌های هفته': 'Weekly reports',
  'هفته از شنبه تا جمعه محاسبه می‌شود.': 'Weeks run from Saturday through Friday.',
  'برای این بازه گزارشی ثبت نشده است.': 'No reports were found for this date range.',
  'مرکز اعلان‌ها': 'Notification center', 'یادآوری باقی‌داری و رخدادهای مالی': 'Balance reminders and financial activity',
  'کاربران ثبت‌شده در سامانه.': 'Users registered in this system.',
  'ثبت پرداخت': 'Record payment', 'پیش‌نمایش و چاپ بل': 'Bill preview and print',
  'پشتیبان روزانه با موفقیت ایجاد شد.': 'Daily backup completed successfully.',
  'پوسته': 'Theme', 'محاسبه مجدد': 'Recalculate', 'ویرایش': 'Edit',
  'حذف گزارش': 'Delete report', 'عنوان': 'Title', 'خوانده‌شده': 'Read',
  'علامت‌گذاری': 'Mark as read',
  'زبان': 'Language', 'انتخاب مشتری': 'Select customer',
  'ابطال پرداخت': 'Void payment', 'انتخاب یا نام دلخواه': 'Select or enter a name',
  'نام قلم': 'Item name', 'افزودن قلم': 'Add item', 'مشتری دایمی': 'Regular customer',
  'بستن': 'Close', 'چاپ': 'Print', 'حذف نرم': 'Delete', 'افزودن مشتری': 'Add customer',
  'نوع': 'Type', 'قیمت': 'Price', 'وب‌سایت': 'Website', 'نوع مصرف': 'Expense type',
  'ثبت بل': 'Create bill', 'حذف قلم': 'Remove item',
  'خودکار پس از ذخیره': 'Assigned automatically on save',
  'نوعیت خدمات': 'Service type', 'تعداد / متراژ': 'Quantity / length',
  'مجموع این قلم': 'Line total', 'جمع اقلام': 'Items subtotal',
  'جمع بعد از تخفیف': 'Total after discount',
  'رسید / پرداخت': 'Receipt / payment', 'باقی': 'Balance due',
  'رسید نمی‌تواند از جمع بعد از تخفیف بیشتر باشد.': 'Payment cannot exceed the discounted total.',
  'تخفیف نمی‌تواند از جمع اقلام بیشتر باشد.': 'Discount cannot exceed the items subtotal.',
  'مشتری را انتخاب کنید.': 'Select a customer.',
  'برای محاسبه مجموع قیمت و تعداد را وارد کنید.': 'Enter quantity and unit price to calculate the total.',
  'ایجاد مشتری جدید': 'Create a new customer', 'اطلاعات بل': 'Bill details',
  'جزئیات خدمات': 'Service details', 'خلاصه پرداخت': 'Payment summary',
  'جست‌وجو': 'Search', 'پوسته تاریک': 'Dark theme', 'پوسته روشن': 'Light theme',
  'بازکردن منو': 'Open menu', 'بستن منو': 'Close menu', 'خروج': 'Log out', 'کاربر': 'User',
  'با موفقیت ذخیره شد.': 'Saved successfully.', 'حذف شد.': 'Deleted successfully.',
  'ورود موفقیت‌آمیز بود.': 'Signed in successfully.', 'حساب کاربر غیرفعال شد.': 'User account deactivated.',
  'حساب کاربر فعال شد.': 'User account activated.', 'پشتیبان روزانه ایجاد نشد': 'Daily backup failed',
  'پیش‌نمایش چاپ بل': 'Bill print preview', 'گزارش به‌روزرسانی شد.': 'Report updated.',
  'وضعیت اعلان تغییر کرد.': 'Notification status updated.', 'اعلان به‌روزرسانی نشد.': 'Notification was not updated.',
};
const navPermissions = { dashboard: 'dashboard.view', bills: 'bills.view', customers: 'customers.view', dues: 'customers.view', expenses: 'expenses.view', reports: 'reports.view', settings: 'settings.manage' };
const fieldClass = 'field-control';
const buttonClass = 'button-primary';

function translate(value, language) {
  return language === 'en' ? english[value] || value : value;
}

function formatMoney(value, currency = 'AFN') {
  return `${new Intl.NumberFormat('fa-AF', { maximumFractionDigits: 2 }).format((Number(value) || 0) / 100)} ${currency}`;
}

function apiMessage(data) {
  return data?.error?.message || data?.error || 'عملیات انجام نشد. دوباره تلاش کنید.';
}

function Field({ label, name, type = 'text', required = false, defaultValue = '', placeholder = '', min, step }) {
  if (type === 'date') return <JalaliDateField label={label} required={required} />;
  return <label className="form-field"><span>{label}</span><input className={fieldClass} name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} min={min} step={step} /></label>;
}

function EmptyState({ title, language }) {
  const translatedTitle = translate(title, language);
  const article = /^[aeiou]/i.test(translatedTitle) ? 'an' : 'a';
  return <div className="empty-state"><BookOpenCheck size={22} /><strong>{translate('هنوز موردی ثبت نشده', language)}</strong><span>{language === 'en' ? `To get started, add ${article} ${translatedTitle} using the form above.` : `برای شروع، ${title} را از فرم بالا ثبت کنید.`}</span></div>;
}

export default function Workspace({ section }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [paymentRows, setPaymentRows] = useState([]);
  const [services, setServices] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadedSection, setLoadedSection] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billCustomerMode, setBillCustomerMode] = useState('existing');
  const [billCustomerId, setBillCustomerId] = useState('');
  const [billDiscount, setBillDiscount] = useState('0');
  const [billPaid, setBillPaid] = useState('0');
  const [printBillId, setPrintBillId] = useState(null);
  const [language, setLanguage] = useState('fa');
  const [theme, setTheme] = useState('light');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [globalIndex, setGlobalIndex] = useState(null);
  const [globalResults, setGlobalResults] = useState([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [billItems, setBillItems] = useState([{ serviceId: '', serviceName: '', quantity: '1', unitPrice: '' }]);
  const [settingsTab, setSettingsTab] = useState('company');
  const [userRows, setUserRows] = useState([]);
  const currency = data?.currency?.code || 'AFN';
  const resource = section === 'dashboard' ? 'dashboard' : section;
  const LocalizedField = ({ label, ...props }) => <Field {...props} label={translate(label, language)} />;

  async function load() {
    const response = await fetch(`/api/${resource}`);
    const result = await response.json();
    if (!response.ok) throw new Error(apiMessage(result));
    setData(result);
  }

  async function refreshAccess() {
    const usersResult = await fetch('/api/users').then((response) => response.json());
    if (Array.isArray(usersResult)) setUserRows(usersResult);
  }

  useEffect(() => {
    let active = true;
    setPageLoading(true);
    async function initialize() {
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        if (!result.user) { router.replace('/login'); return; }
        if (!active) return;
        setUser(result.user);
        if (sessionStorage.getItem('nasirdb-login-notice')) {
          sessionStorage.removeItem('nasirdb-login-notice');
          setMessage('ورود موفقیت‌آمیز بود.');
        }
        const tasks = [fetch(`/api/${resource}`).then((r) => r.json())];
        if (['bills', 'payments', 'dues', 'dashboard'].includes(section)) tasks.push(fetch('/api/customers').then((r) => r.json()));
        if (section === 'dues') tasks.push(fetch('/api/payments').then((r) => r.json()));
        if (section === 'bills' || section === 'settings') tasks.push(fetch('/api/services').then((r) => r.json()));
        if (section === 'expenses' || section === 'settings') tasks.push(fetch('/api/expense-types').then((r) => r.json()));
        const results = await Promise.all(tasks);
        if (!active) return;
        if (!results[0]?.error) setData(results[0]);
        let index = 1;
        if (['bills', 'payments', 'dues', 'dashboard'].includes(section)) setCustomers(Array.isArray(results[index++]) ? results[index - 1] : []);
        if (section === 'dues') setPaymentRows(Array.isArray(results[index++]) ? results[index - 1] : []);
        if (section === 'bills' || section === 'settings') setServices(Array.isArray(results[index++]) ? results[index - 1] : []);
        if (section === 'expenses' || section === 'settings') setExpenseTypes(Array.isArray(results[index]) ? results[index] : []);
        setLoadedSection(section);
        setPageLoading(false);
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
          setLoadedSection(section);
          setPageLoading(false);
        }
      }
    }
    initialize();
    return () => { active = false; };
  }, [resource, router, section]);

  useEffect(() => {
    setLanguage(localStorage.getItem('nasirdb-language') || 'fa');
    setTheme(localStorage.getItem('nasirdb-theme') || 'light');
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language === 'en' ? 'en' : 'fa-AF';
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
    localStorage.setItem('nasirdb-theme', theme);
    localStorage.setItem('nasirdb-language', language);
  }, [language, theme, preferencesLoaded]);

  useEffect(() => {
    if (section !== 'settings') return;
    let active = true;
    fetch('/api/users').then((response) => response.json())
      .then((usersResult) => {
        if (!active) return;
        if (Array.isArray(usersResult)) setUserRows(usersResult);
      }).catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [section]);

  useEffect(() => {
    if (!message && !error) return undefined;
    const timeout = window.setTimeout(() => { setMessage(''); setError(''); }, 4200);
    return () => window.clearTimeout(timeout);
  }, [message, error]);

  useEffect(() => {
    if (!user || (!user.permissions?.includes('*') && !user.permissions?.includes('backup.create'))) return undefined;
    const today = new Date().toLocaleDateString('en-CA');
    if (localStorage.getItem('nasirdb-backup-date') === today) return undefined;
    let active = true;
    localStorage.setItem('nasirdb-backup-date', today);
    fetch('/api/backup').then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(apiMessage(result));
      if (active) setMessage('پشتیبان روزانه با موفقیت ایجاد شد.');
    }).catch((backupError) => {
      if (localStorage.getItem('nasirdb-backup-date') === today) localStorage.removeItem('nasirdb-backup-date');
      if (active) setError(`پشتیبان روزانه ایجاد نشد: ${backupError.message}`);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (search.trim().length < 2) { setGlobalResults([]); return undefined; }
    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        setGlobalSearchLoading(true);
        let index = globalIndex;
        if (!index) {
          const searchPermissions = { customers: 'customers.view', bills: 'bills.view', expenses: 'expenses.view', reports: 'reports.view', payments: 'payments.view' };
          const resources = Object.keys(searchPermissions).filter((name) => user?.permissions?.includes('*') || user?.permissions?.includes(searchPermissions[name]));
          const results = await Promise.all(resources.map(async (name) => {
            const response = await fetch(`/api/${name}`);
            const result = await response.json();
            if (!response.ok) throw new Error(apiMessage(result));
            return { name, rows: Array.isArray(result) ? result : [] };
          }));
          index = results.flatMap(({ name, rows }) => rows.map((row) => ({ name, row })));
          if (active) setGlobalIndex(index);
        }
        const query = search.trim().toLocaleLowerCase();
        if (active) setGlobalResults(index.filter(({ row }) => JSON.stringify(row).toLocaleLowerCase().includes(query)).slice(0, 7));
      } catch (searchError) {
        if (active) setError(searchError.message);
      } finally {
        if (active) setGlobalSearchLoading(false);
      }
    }, 180);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [search, globalIndex, user]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  async function toggleUser(userRow) {
    try {
      const response = await fetch(`/api/users/${userRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !userRow.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(apiMessage(result));
      setMessage(userRow.is_active ? 'حساب کاربر غیرفعال شد.' : 'حساب کاربر فعال شد.');
      await refreshAccess();
    } catch (toggleError) {
      setError(toggleError.message);
    }
  }

  async function submit(event, endpoint = `/api/${resource}`, method = 'POST', transform) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = transform ? transform(form) : Object.fromEntries(form.entries());
    try {
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(apiMessage(result));
      formElement.reset();
      setMessage('با موفقیت ذخیره شد.');
      await load();
      if (section === 'bills') setBillDialogOpen(false);
      if (section === 'dues') {
        const paymentResult = await fetch('/api/payments').then((response) => response.json());
        if (Array.isArray(paymentResult)) setPaymentRows(paymentResult);
      }
      if (section === 'settings') {
        const [serviceResult, typeResult] = await Promise.all([fetch('/api/services').then((response)=>response.json()),fetch('/api/expense-types').then((response)=>response.json())]);
        if (Array.isArray(serviceResult)) setServices(serviceResult);
        if (Array.isArray(typeResult)) setExpenseTypes(typeResult);
        await refreshAccess();
      }
      if (section === 'bills') {
        setBillItems([{ serviceId: '', serviceName: '', quantity: '1', unitPrice: '' }]);
        setBillCustomerId('');
        setBillDiscount('0');
        setBillPaid('0');
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(endpoint) {
    if (!window.confirm('این مورد حذف شود؟')) return;
    setError('');
    const response = await fetch(endpoint, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) setError(apiMessage(result));
    else { setMessage('حذف شد.'); await load(); }
  }

  async function reportAction(id, action, method = 'POST', body = {}) {
    const response = await fetch(`/api/reports/${id}${action ? `/${action}` : ''}`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' || method === 'PATCH' ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) setError(apiMessage(result));
    else { setMessage('گزارش به‌روزرسانی شد.'); await load(); }
  }

  const filtered = Array.isArray(data) ? data.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())) : [];
  const nav = <>
    <div className="brand-block"><span className="brand-mark"><Activity size={21} /></span><div><strong>{data?.company?.name || translate('مدیریت شرکت', language)}</strong><small>{translate('سامانه مالی', language)}</small></div></div>
    <nav className="primary-nav" aria-label={language === 'en' ? 'Main navigation' : 'ناوبری اصلی'}>{navigation.filter(({key})=>!navPermissions[key]||user?.permissions?.includes('*')||user?.permissions?.includes(navPermissions[key])).map(({ key, label, icon: Icon }) => <Link key={key} href={`/${key}`} onClick={() => setMobileNav(false)} className={`nav-link ${section === key ? 'is-active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{translate(label, language)}</span>{key === 'notifications' && data?.unreadNotifications > 0 && <i className="nav-badge">{data.unreadNotifications}</i>}</Link>)}</nav>
    <div className="sidebar-foot"><div className="account-chip"><span className="avatar">{(user?.fullName || user?.username || 'م').slice(0, 1)}</span><span><strong>{user?.fullName || user?.username}</strong><small>{user?.roleName || translate('کاربر', language)}</small></span></div><button className="icon-button" onClick={logout} title={translate('خروج', language)} aria-label={translate('خروج', language)}><LogOut size={17} /></button></div>
  </>;

  const header = <header className="page-header"><div className="heading-group"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label={translate('بازکردن منو', language)}><Menu size={20} /></button><div><p className="eyebrow">{translate('مدیریت شرکت', language)}</p><h1>{translate(navigation.find((item) => item.key === section)?.label || 'داشبورد', language)}</h1></div></div><div className="header-actions"><div className="search-wrap"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translate('جست‌وجو در این بخش', language)} aria-label={translate('جست‌وجو', language)} /></label>{search.trim().length >= 2 && <div className="search-results" role="listbox">{globalSearchLoading ? <span className="search-result-empty">{translate('جست‌وجو...', language)}</span> : globalResults.length ? globalResults.map(({ name, row }, index) => <Link key={`${name}-${row.id}-${index}`} href={name === 'customers' ? `/customers/${row.id}` : name === 'payments' ? '/dues' : `/${name}`} onClick={() => setSearch('')} className="search-result-item"><strong>{row.name || row.customer_name || row.bill_number || row.payment_number || row.report_number || row.expense_number || '—'}</strong><small>{translate(name === 'payments' ? 'پرداخت' : navigation.find((item) => item.key === name)?.label || name, language)}</small></Link>) : <span className="search-result-empty">{translate('نتیجه‌ای پیدا نشد', language)}</span>}</div>}</div><button className="icon-button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} title={translate(theme === 'dark' ? 'پوسته روشن' : 'پوسته تاریک', language)} aria-label={translate(theme === 'dark' ? 'پوسته روشن' : 'پوسته تاریک', language)}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><button className="language-toggle" aria-label={language === 'fa' ? 'Switch to English' : 'تغییر به دری'} onClick={() => setLanguage((current) => current === 'fa' ? 'en' : 'fa')}>{language === 'fa' ? 'EN' : 'دری'}</button><time>{new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'fa-AF', { dateStyle: 'medium' }).format(new Date())}</time></div></header>;

  function table(headers, rows, renderRow, emptyTitle = 'اطلاعات') {
    if (!rows?.length) return <EmptyState title={emptyTitle} language={language} />;
    return <div className="table-wrap"><table><thead><tr>{headers.map((item) => <th key={item}>{translate(item, language)}</th>)}</tr></thead><tbody>{rows.map(renderRow)}</tbody></table></div>;
  }

  function dashboardView() {
    const metrics = [
      ['درآمد امروز', data?.today?.revenue || 0, 'سفارش‌های ثبت‌شده'],
      ['مصارف امروز', data?.today?.expenses || 0, 'هزینه‌های ثبت‌شده'],
      ['سود خالص امروز', data?.today?.profit || 0, 'درآمد پس از مصارف'],
      ['مجموع باقی مشتریان', data?.remaining || 0, `${data?.customerCount || 0} مشتری`],
    ];
    return <>
      <section className="welcome-strip"><div><span className="eyebrow">{translate('خلاصه عملکرد',language)}</span><h2>{language==='en'?'Welcome, ': 'سلام، '}{user?.fullName || user?.username || (language==='en'?'there':'خوش آمدید')}</h2><p>{language==='en'?'Review today’s finances and jump into your daily work.':'وضعیت مالی امروز را یک‌جا ببینید و سریع به کارهای روزانه برسید.'}</p></div><Link href="/bills" className={buttonClass}><CirclePlus size={17} /> {translate('بل جدید',language)}</Link></section>
      <section className="metric-grid">{metrics.map(([label, value, note], index) => <article className={`metric metric-${index + 1}`} key={label}><div className="metric-top"><span>{translate(label,language)}</span><span className="metric-dot" /></div><strong>{formatMoney(value, currency)}</strong><small>{translate(note,language)}</small></article>)}</section>
      <div className="dashboard-grid"><section className="content-panel"><div className="panel-heading"><div><h2>{translate('بل‌های اخیر',language)}</h2><p>{translate('آخرین اسناد مالی ثبت‌شده',language)}</p></div><Link href="/bills" className="text-link">{translate('همه بل‌ها',language)} <ChevronLeft size={15} /></Link></div>{table(['شماره بل','مشتری','تاریخ','مجموع','باقی'], data?.recentBills, (row) => <tr key={row.id}><td className="mono">{row.bill_number}</td><td>{row.customer_name}</td><td>{row.bill_date}</td><td>{formatMoney(row.grand_total_minor,currency)}</td><td className="amount-due">{formatMoney(row.remaining_minor,currency)}</td></tr>, 'بل')}</section>
      <section className="content-panel"><div className="panel-heading"><div><h2>{translate('باقی‌دارها',language)}</h2><p>{translate('مشتریانی که پرداخت دارند',language)}</p></div><Link href="/dues" className="text-link">{translate('مشاهده',language)} <ChevronLeft size={15} /></Link></div>{table(['مشتری','تلفن','باقی'], data?.dues, (row) => <tr key={row.id}><td>{row.name}</td><td dir="ltr">{row.phone || '—'}</td><td className="amount-due">{formatMoney(row.remaining_minor,currency)}</td></tr>, 'باقی‌دار')}</section></div>
    </>;
  }

  function customersView() {
    return <>
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{translate('ثبت مشتری', language)}</h2><p>{translate('اطلاعات مشتری در پروفایل مالی نگهداری می‌شود.', language)}</p></div></div>
        <form className="form-grid" onSubmit={(event) => submit(event)}>
          <LocalizedField label="نام مشتری" name="name" required />
          <LocalizedField label="تلفن" name="phone" type="tel" />
          <LocalizedField label="آدرس" name="address" />
          <LocalizedField label="یادداشت" name="description" />
          <button className={buttonClass} disabled={busy}><CirclePlus size={16} /> {translate('افزودن مشتری', language)}</button>
        </form>
      </section>
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{translate('فهرست مشتریان', language)}</h2><p>{filtered.length} {language === 'en' ? 'records' : 'مورد'}</p></div></div>
        {filtered.length ? <div className="customer-folders">{filtered.map((row) => <article className="customer-folder" key={row.id}>
          <div className="folder-top"><span className="folder-icon"><Folder size={22} /></span><span className="mono">{row.customer_number}</span><button className="icon-button danger-button" title={translate('حذف نرم', language)} onClick={() => remove(`/api/customers/${row.id}`)}><Trash2 size={16} /></button></div>
          <Link className="customer-folder-name" href={`/customers/${row.id}`}>{row.name}</Link>
          <span className="customer-folder-phone" dir="ltr">{row.phone || '—'}</span>
          <div className="folder-balances"><span>{translate('مجموع', language)} <b>{formatMoney(row.total_minor, currency)}</b></span><span>{translate('پرداخت', language)} <b>{formatMoney(row.paid_minor, currency)}</b></span><span className="amount-due">{translate('باقی‌دارها', language)} <b>{formatMoney(row.remaining_minor, currency)}</b></span></div>
        </article>)}</div> : <EmptyState title="مشتری" language={language} />}
      </section>
    </>;
  }

  function billsView() {
    const subtotal = billItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPriceMinor = toMinor(item.unitPrice);
      return sum + Math.round(quantity * unitPriceMinor);
    }, 0);
    const discountMinor = Math.max(0, toMinor(billDiscount));
    const appliedDiscount = Math.min(discountMinor, subtotal);
    const finalTotal = subtotal - appliedDiscount;
    const paidMinor = Math.max(0, toMinor(billPaid));
    const remaining = Math.max(0, finalTotal - paidMinor);
    const billDraftValid = discountMinor <= subtotal && paidMinor <= finalTotal;
    const setItem = (index, key, value) => setBillItems((items) => items.map((item, row) => row === index ? { ...item, [key]: value } : item));
    const openBillDialog = () => {
      setBillCustomerMode(customers.length ? 'existing' : 'new');
      setBillCustomerId('');
      setBillDiscount('0');
      setBillPaid('0');
      setBillItems([{ serviceId: '', serviceName: '', quantity: '1', unitPrice: '' }]);
      setBillDialogOpen(true);
    };
    return <>
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{translate('بل‌های ثبت‌شده', language)}</h2><p>{filtered.length} {language === 'en' ? 'records' : 'مورد'}</p></div><button className={buttonClass} onClick={openBillDialog}><CirclePlus size={16} /> {translate('بل جدید', language)}</button></div>
        {table(['شماره', 'مشتری', 'تاریخ', 'جمع', 'پرداخت', 'باقی', 'عملیات'], filtered, (row) => <tr key={row.id}><td className="mono">{row.bill_number}</td><td>{row.customer_name}</td><td>{row.bill_date}</td><td>{formatMoney(row.grand_total_minor, currency)}</td><td>{formatMoney(row.paid_minor, currency)}</td><td className="amount-due">{formatMoney(row.remaining_minor, currency)}</td><td className="table-actions"><button className="icon-button" title={translate('چاپ', language)} onClick={() => setPrintBillId(row.id)}><Printer size={16} /></button><button className="icon-button danger-button" title={translate('حذف نرم', language)} onClick={() => remove(`/api/bills/${row.id}`)}><Trash2 size={16} /></button></td></tr>, 'بل')}
      </section>
      {billDialogOpen && typeof document !== 'undefined' && createPortal(<div className="modal-backdrop bill-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setBillDialogOpen(false); }}>
        <section className="content-panel bill-dialog" role="dialog" aria-modal="true" aria-labelledby="bill-dialog-title">
          <div className="panel-heading bill-dialog-heading">
            <div><p className="eyebrow">{translate('ثبت سند مالی', language)}</p><h2 id="bill-dialog-title">{translate('بل جدید', language)}</h2></div>
            <div className="dialog-heading-actions"><span className="live-total">{formatMoney(finalTotal, currency)}</span><button type="button" className="icon-button" onClick={() => setBillDialogOpen(false)} aria-label={translate('بستن', language)}><X size={19} /></button></div>
          </div>
          <form className="bill-form" onSubmit={(event) => submit(event, '/api/bills', 'POST', (form) => ({
            customerId: billCustomerMode === 'existing' ? billCustomerId : '',
            customerName: form.get('customerName'),
            customerPhone: form.get('customerPhone'),
            isPermanent: form.get('isPermanent') === 'on',
            date: form.get('date'),
            discount: billDiscount,
            paid: billPaid,
            note: form.get('note'),
            items: billItems,
          }))}>
            <section className="bill-form-section">
              <div className="bill-section-title"><strong>{translate('اطلاعات بل', language)}</strong></div>
              <div className="bill-details-grid">
                <div className="bill-customer-field">
                  <div className="bill-customer-switch" role="group" aria-label={translate('نام مشتری', language)}>
                    <button type="button" className={billCustomerMode === 'existing' ? 'tab-button is-selected' : 'tab-button'} onClick={() => setBillCustomerMode('existing')}>{translate('مشتری موجود', language)}</button>
                    <button type="button" className={billCustomerMode === 'new' ? 'tab-button is-selected' : 'tab-button'} onClick={() => setBillCustomerMode('new')}>{translate('مشتری جدید', language)}</button>
                  </div>
                  {billCustomerMode === 'existing'
                    ? <label className="form-field"><span>{translate('نام مشتری', language)}</span><select className={fieldClass} name="customerId" value={billCustomerId} required onChange={(event) => setBillCustomerId(event.target.value)}><option value="">{translate('انتخاب مشتری', language)}</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.customer_number}</option>)}</select></label>
                    : <div className="bill-new-customer"><LocalizedField label="نام مشتری جدید" name="customerName" required /><LocalizedField label="تلفن مشتری" name="customerPhone" type="tel" /><label className="check-field"><input type="checkbox" name="isPermanent" /> {translate('مشتری دایمی', language)}</label></div>}
                </div>
                <LocalizedField label="تاریخ" name="date" type="date" required />
                <label className="form-field bill-sequence-field"><span>{translate('شماره بل', language)}</span><output className="bill-sequence">{translate('خودکار پس از ذخیره', language)}</output></label>
              </div>
            </section>
            <section className="bill-form-section">
              <div className="bill-section-title"><strong>{translate('جزئیات خدمات', language)}</strong><span>{billItems.length} {language === 'en' ? (billItems.length === 1 ? 'item' : 'items') : 'قلم'}</span></div>
              <div className="bill-line-headings"><span>{translate('نوعیت خدمات', language)}</span><span>{translate('تعداد / متراژ', language)}</span><span>{translate('قیمت واحد', language)}</span><span>{translate('مجموع این قلم', language)}</span><span aria-hidden="true" /></div>
              <div className="line-items bill-line-items">{billItems.map((item, index) => {
                const lineTotal = Math.round((Number(item.quantity) || 0) * toMinor(item.unitPrice));
                return <div className="line-item bill-line-item" key={index}>
                  <label className="form-field"><span className="bill-mobile-label">{translate('نوعیت خدمات', language)}</span><select className={fieldClass} value={item.serviceId} onChange={(event) => { const service = services.find((entry) => String(entry.id) === event.target.value); setItem(index, 'serviceId', event.target.value); setItem(index, 'serviceName', service?.name || ''); setItem(index, 'unitPrice', service ? String(service.default_price_minor / 100) : item.unitPrice); }}><option value="">{translate('انتخاب یا نام دلخواه', language)}</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><input className={`${fieldClass} bill-service-name`} aria-label={translate('نام قلم', language)} value={item.serviceName} onChange={(event) => setItem(index, 'serviceName', event.target.value)} placeholder={translate('نام خدمت', language)} required /></label>
                  <label className="form-field"><span className="bill-mobile-label">{translate('تعداد / متراژ', language)}</span><input className={fieldClass} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => setItem(index, 'quantity', event.target.value)} required /></label>
                  <label className="form-field"><span className="bill-mobile-label">{translate('قیمت واحد', language)}</span><input className={fieldClass} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setItem(index, 'unitPrice', event.target.value)} required /></label>
                  <output className="bill-line-total">{formatMoney(lineTotal, currency)}</output>
                  <button type="button" className="icon-button danger-button bill-remove-item" aria-label={translate('حذف قلم', language)} onClick={() => setBillItems((items) => items.filter((_, row) => row !== index))} disabled={billItems.length === 1}><X size={17} /></button>
                </div>;
              })}</div>
              <button type="button" className="button-secondary bill-add-item" onClick={() => setBillItems((items) => [...items, { serviceId: '', serviceName: '', quantity: '1', unitPrice: '' }])}><CirclePlus size={16} /> {translate('افزودن قلم', language)}</button>
            </section>
            <section className="bill-form-section bill-summary-section">
              <div className="bill-section-title"><strong>{translate('خلاصه پرداخت', language)}</strong></div>
              <div className="bill-summary-grid">
                <div className="bill-summary-value"><span>{translate('جمع اقلام', language)}</span><strong>{formatMoney(subtotal, currency)}</strong></div>
                <label className="form-field bill-summary-input"><span>{translate('تخفیف', language)}</span><input className={fieldClass} name="discount" type="number" min="0" max={(subtotal / 100).toFixed(2)} step="0.01" value={billDiscount} onChange={(event) => setBillDiscount(event.target.value)} /></label>
                <div className="bill-summary-value bill-summary-total"><span>{translate('جمع بعد از تخفیف', language)}</span><strong>{formatMoney(finalTotal, currency)}</strong></div>
                <label className="form-field bill-summary-input"><span>{translate('رسید / پرداخت', language)}</span><input className={fieldClass} name="paid" type="number" min="0" max={(finalTotal / 100).toFixed(2)} step="0.01" value={billPaid} onChange={(event) => setBillPaid(event.target.value)} /></label>
                <div className="bill-summary-value bill-summary-due"><span>{translate('باقی', language)}</span><strong>{formatMoney(remaining, currency)}</strong></div>
              </div>
              {!billDraftValid && <p className="bill-validation-message">{discountMinor > subtotal ? translate('تخفیف نمی‌تواند از جمع اقلام بیشتر باشد.', language) : translate('رسید نمی‌تواند از جمع بعد از تخفیف بیشتر باشد.', language)}</p>}
            </section>
            <div className="bill-form-footer">
              <LocalizedField label="یادداشت" name="note" />
              <button className={buttonClass} disabled={busy || !billDraftValid}><FileText size={16} /> {translate('ثبت بل', language)}</button>
            </div>
          </form>
        </section>
      </div>, document.body)}
    </>;
  }

  function duesView() {
    const dues = Array.isArray(data) ? data.filter((row) => row.remaining_minor > 0) : [];
    const paymentSearch = search.trim() ? paymentRows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())) : paymentRows;
    return <>
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{translate('پرداخت مشتریان', language)}</h2><p>{translate('دریافت پرداخت و بررسی مانده‌ها در یک بخش.', language)}</p></div></div>
        <form className="form-grid" onSubmit={(event) => submit(event, '/api/payments')}>
          <label className="form-field"><span>{translate('مشتری', language)}</span><select name="customerId" className={fieldClass} required><option value="">{translate('انتخاب مشتری', language)}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_number} · {customer.name}</option>)}</select></label>
          <LocalizedField label="شناسه بل (اختیاری)" name="billId" type="number" min="1" />
          <LocalizedField label="مبلغ" name="amount" type="number" min="0.01" step="0.01" required />
          <LocalizedField label="تاریخ" name="date" type="date" />
          <label className="form-field"><span>{translate('روش پرداخت', language)}</span><select name="method" className={fieldClass}><option value="cash">{translate('نقد', language)}</option><option value="bank">{translate('بانک', language)}</option><option value="card">{translate('کارت', language)}</option></select></label>
          <LocalizedField label="یادداشت" name="note" />
          <button className={buttonClass} disabled={busy}><CirclePlus size={16} /> {translate('ثبت پرداخت', language)}</button>
        </form>
      </section>
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{translate('مشتریان باقی‌دار', language)}</h2><p>{dues.length} {language === 'en' ? 'customers with a positive balance' : 'مشتری با مانده مثبت'}</p></div></div>
        {table(['شماره', 'مشتری', 'تلفن', 'مجموع', 'پرداخت', 'باقی'], dues, (row) => <tr key={row.id}><td className="mono">{row.customer_number}</td><td><Link className="text-link" href={`/customers/${row.id}`}>{row.name}</Link></td><td dir="ltr">{row.phone || '—'}</td><td>{formatMoney(row.total_minor, currency)}</td><td>{formatMoney(row.paid_minor, currency)}</td><td className="amount-due">{formatMoney(row.remaining_minor, currency)}</td></tr>, 'باقی‌دار')}
      </section>
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{translate('تاریخچه پرداخت‌ها', language)}</h2><p>{paymentSearch.length} {language === 'en' ? paymentSearch.length === 1 ? 'payment' : 'payments' : 'پرداخت'}</p></div></div>
        {table(['شماره', 'مشتری', 'بل', 'تاریخ', 'روش', 'مبلغ', ''], paymentSearch, (row) => <tr key={row.id}><td className="mono">{row.payment_number}</td><td>{row.customer_name}</td><td>{row.bill_number || '—'}</td><td>{row.payment_date}</td><td>{translate(({ cash: 'نقد', bank: 'بانک', card: 'کارت' })[row.method] || row.method, language)}</td><td>{formatMoney(row.amount_minor, currency)}</td><td><button className="icon-button danger-button" title={translate('ابطال پرداخت', language)} onClick={() => remove(`/api/payments/${row.id}`)}><Trash2 size={16} /></button></td></tr>, 'پرداخت')}
      </section>
    </>;
  }

  function expensesView() {
    return <>
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{translate('ثبت مصرف',language)}</h2><p>{translate('مصارف روزانه را با نوع و تاریخ ثبت کنید.',language)}</p></div></div>
        <form className="form-grid" onSubmit={(event) => submit(event)}>
          <label className="form-field"><span>{translate('نوع مصرف',language)}</span><select name="typeId" required className={fieldClass}><option value="">{language==='en'?'Select type':'انتخاب نوع'}</option>{expenseTypes.map((type)=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <LocalizedField label="مبلغ" name="amount" type="number" min="0.01" step="0.01" required/>
          <LocalizedField label="تاریخ" name="date" type="date"/>
          <LocalizedField label="یادداشت" name="note"/>
          <button className={buttonClass} disabled={busy}><CirclePlus size={16}/> {translate('ثبت مصرف',language)}</button>
        </form>
      </section>
      <section className="content-panel"><div className="panel-heading"><div><h2>{translate('فهرست مصارف',language)}</h2><p>{filtered.length} {language==='en'?'records':'مورد'}</p></div></div>{table(['شماره','نوع','تاریخ','مبلغ','یادداشت',''],filtered,(row)=><tr key={row.id}><td className="mono">{row.expense_number}</td><td>{row.type_name}</td><td>{row.expense_date}</td><td>{formatMoney(row.amount_minor,currency)}</td><td>{row.note || '—'}</td><td><button className="icon-button danger-button" title={language==='en'?'Delete':'حذف نرم'} onClick={() => remove(`/api/expenses/${row.id}`)}><Trash2 size={16}/></button></td></tr>,'مصرف')}</section>
    </>;
  }

  function settingsView() {
    const config = data || {};
    const fields = settingsTab === 'company' ? [['company.name','نام شرکت'],['company.address','آدرس'],['company.phone','تلفن'],['company.email','ایمیل'],['company.website','وب‌سایت'],['company.footer','متن پایین چاپ']] : [['bill.start','شماره شروع بل'],['bill.pad','طول شماره بل'],['customer.prefix','پیشوند مشتری'],['customer.start','شماره شروع مشتری'],['currency.code','واحد پول']];
    const valueFor = (key) => key.startsWith('company.') ? config.company?.[key.slice(8)] || '' : key.startsWith('bill.') ? config.sequences?.bill?.[key.slice(5)] ?? '' : key.startsWith('customer.') ? config.sequences?.customer?.[key.slice(9)] ?? '' : key.startsWith('payment.') ? config.sequences?.payment?.[key.slice(8)] ?? '' : key.startsWith('expense.') ? config.sequences?.expense?.[key.slice(8)] ?? '' : key.startsWith('report.') ? config.sequences?.report?.[key.slice(7)] ?? '' : key === 'currency.code' ? config.currency?.code || 'AFN' : config[key] || '';
    return <><section className="content-panel"><div className="settings-tabs">{[['company','شرکت'],['numbers','شماره‌گذاری'],['services','خدمات'],['types','انواع مصرف'],['users','کاربران'],['backup','پشتیبان']].map(([key,label])=><button key={key} className={settingsTab===key?'tab-button is-selected':'tab-button'} onClick={()=>setSettingsTab(key)}>{translate(label,language)}</button>)}</div>{['company','numbers'].includes(settingsTab) && <form className="form-grid settings-form" onSubmit={(event)=>submit(event,'/api/settings','PUT',(form)=>Object.fromEntries(form.entries()))}>{fields.map(([key,label])=><LocalizedField key={key} label={label} name={key} defaultValue={valueFor(key)} />)}{settingsTab==='numbers' && <><label className="form-field"><span>{translate('پوسته',language)}</span><select name="theme" className={fieldClass} value={theme} onChange={(event)=>setTheme(event.target.value)}><option value="light">{translate('روشن',language)}</option><option value="dark">{translate('تیره',language)}</option></select></label><label className="form-field"><span>{translate('زبان',language)}</span><select name="language" className={fieldClass} value={language} onChange={(event)=>setLanguage(event.target.value)}><option value="fa">{translate('دری',language)}</option><option value="en">English</option></select></label></>}<button className={buttonClass} disabled={busy}>{language==='en'?'Save settings':'ذخیره تنظیمات'}</button></form>}{settingsTab==='services' && <><form className="inline-form" onSubmit={(event)=>submit(event,'/api/services','POST')}><LocalizedField label="نام خدمت" name="name" required/><LocalizedField label="قیمت پیش‌فرض" name="price" type="number" min="0" step="0.01"/><LocalizedField label="واحد" name="unit"/><button className={buttonClass}>{language==='en'?'Add':'افزودن'}</button></form>{table(['خدمت','قیمت','واحد'],services,(row)=><tr key={row.id}><td>{row.name}</td><td>{formatMoney(row.default_price_minor,currency)}</td><td>{row.unit||'—'}</td></tr>,'خدمت')}</>}{settingsTab==='types' && <><form className="inline-form" onSubmit={(event)=>submit(event,'/api/expense-types','POST')}><LocalizedField label="نوع مصرف جدید" name="name" required/><button className={buttonClass}>{language==='en'?'Add':'افزودن'}</button></form>{table(['نوع مصرف',''],expenseTypes,(row)=><tr key={row.id}><td>{row.name}</td><td><button className="icon-button danger-button" onClick={()=>remove(`/api/expense-types/${row.id}`)}><Trash2 size={16}/></button></td></tr>,'نوع مصرف')}</>}{settingsTab==='users' && <><form className="inline-form" onSubmit={(event)=>submit(event,'/api/users','POST')}><LocalizedField label="نام کاربری" name="username" required/><LocalizedField label="نام کامل" name="fullName"/><LocalizedField label="رمز (حداقل ۶ حرف)" name="password" type="password" required/><button className={buttonClass}>{language==='en'?'Add user':'افزودن کاربر'}</button></form><div className="content-panel user-list-panel"><div className="panel-heading"><div><h2>{language==='en'?'User accounts':'حساب‌های کاربری'}</h2><p>{translate('کاربران ثبت‌شده در سامانه.',language)}</p></div></div>{userRows.map((row)=><div className="user-row" key={row.id}><span className="avatar user-avatar">{(row.full_name||row.username||'م').slice(0,1)}</span><span className="user-identity"><strong>{row.full_name||row.username}</strong><small>{row.username}</small></span><span className={row.is_active?'status-active':'status-disabled'}>{row.is_active?(language==='en'?'Active':'فعال'):(language==='en'?'Inactive':'غیرفعال')}</span><button className="button-secondary" disabled={row.is_owner} onClick={()=>toggleUser(row)}>{row.is_active?(language==='en'?'Deactivate':'غیرفعال‌سازی'):(language==='en'?'Activate':'فعال‌سازی')}</button></div>)}</div></>}{settingsTab==='backup' && <div className="backup-actions"><a href="/api/backup" className="button-primary"><Download size={16}/> {language==='en'?'Create JSON backup':'ایجاد پشتیبان JSON'}</a><label className="button-secondary upload-button">{language==='en'?'Restore from file':'بازیابی از فایل'}<input type="file" accept="application/json,.json" onChange={async(event)=>{const file=event.target.files?.[0];if(!file)return;if(!window.confirm('تمام داده‌های فعلی با نسخه پشتیبان جایگزین شوند؟'))return;try{const payload=JSON.parse(await file.text());const response=await fetch('/api/backup/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(apiMessage(result));setMessage('بازیابی انجام شد.');}catch(e){setError(e.message);}}}/></label></div>}</section></>;
  }

  function reportsView() {
    const rows = filtered.filter((row) => (!reportFrom || row.week_end >= reportFrom) && (!reportTo || row.week_start <= reportTo));
    const maxValue = Math.max(1, ...rows.flatMap((row) => [row.revenue_minor || 0, row.expenses_minor || 0]));
    const pointsFor = (key) => rows.map((row, index) => {
      const x = rows.length === 1 ? 50 : index / (rows.length - 1) * 100;
      const y = 100 - (Number(row[key]) || 0) / maxValue * 90;
      return `${x},${y}`;
    }).join(' ');
    return <><section className="content-panel"><div className="panel-heading"><div><h2>{translate('گزارش‌های هفته',language)}</h2><p>{translate('هفته از شنبه تا جمعه محاسبه می‌شود.',language)}</p></div><div className="report-filters"><label className="form-field"><span>{translate('از تاریخ',language)}</span><input className={fieldClass} type="date" value={reportFrom} onChange={(event)=>setReportFrom(event.target.value)} /></label><label className="form-field"><span>{translate('تا تاریخ',language)}</span><input className={fieldClass} type="date" value={reportTo} onChange={(event)=>setReportTo(event.target.value)} /></label></div></div><div className="report-chart"><div className="chart-legend"><span><i className="legend-revenue"/>{translate('درآمد',language)}</span><span><i className="legend-expenses"/>{translate('مصارف',language)}</span></div>{rows.length ? <><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={language==='en'?'Weekly revenue and expenses chart':'نمودار درآمد و مصارف هفتگی'}><polyline className="chart-line chart-revenue" points={pointsFor('revenue_minor')} /><polyline className="chart-line chart-expenses" points={pointsFor('expenses_minor')} />{rows.map((row,index)=>{const x=rows.length===1?50:index/(rows.length-1)*100;return <circle key={row.id} className="chart-point" cx={x} cy={100-(Number(row.revenue_minor)||0)/maxValue*90} r="1.2"/>;})}</svg><div className="chart-dates">{rows.map((row)=><span key={row.id}>{row.week_start}</span>)}</div></> : <div className="empty-state">{translate('برای این بازه گزارشی ثبت نشده است.',language)}</div>}</div>{table(['گزارش','شروع','پایان','درآمد','مصارف','سود','بل‌ها','پرداخت','عملیات'],rows,(row)=><tr key={row.id}><td className="mono">{row.report_number}</td><td>{row.week_start}</td><td>{row.week_end}</td><td>{formatMoney(row.revenue_minor,currency)}</td><td>{formatMoney(row.expenses_minor,currency)}</td><td>{formatMoney(row.profit_minor,currency)}</td><td>{row.bills_count}</td><td>{formatMoney(row.total_paid_minor,currency)}</td><td className="table-actions"><button className="button-secondary" onClick={()=>reportAction(row.id,'recalculate')}>{translate('محاسبه مجدد',language)}</button><button className="icon-button" title="یادداشت تعدیل" onClick={()=>{const note=window.prompt('یادداشت تعدیل',row.adjustments_note||'');if(note!==null)reportAction(row.id,'','PATCH',{note});}}>{translate('ویرایش',language)}</button><button className="icon-button danger-button" title={translate('حذف گزارش',language)} onClick={()=>remove(`/api/reports/${row.id}`)}><Trash2 size={16}/></button></td></tr>,'گزارش')}</section></>;
  }

  function notificationsView() {
    return <section className="content-panel"><div className="panel-heading"><div><h2>{translate('مرکز اعلان‌ها',language)}</h2><p>{translate('یادآوری باقی‌داری و رخدادهای مالی',language)}</p></div></div>{table(['عنوان','جزئیات','تاریخ','وضعیت'],filtered,(row)=><tr key={row.id} className={row.is_read?'':'unread-row'}><td>{row.title}</td><td className="preline">{row.body}</td><td>{row.created_at?.slice(0,10)}</td><td><button className="button-secondary" onClick={async()=>{const response=await fetch(`/api/notifications/${row.id}`,{method:'PATCH'});if(!response.ok){setError('اعلان به‌روزرسانی نشد.');return;}setMessage('وضعیت اعلان تغییر کرد.');await load();}}>{row.is_read?translate('خوانده‌شده',language):translate('علامت‌گذاری',language)}</button></td></tr>,'اعلان')}</section>;
  }

  let content;
  if (section === 'dashboard') content = dashboardView();
  else if (section === 'customers') content = customersView();
  else if (section === 'bills') content = billsView();
  else if (section === 'expenses') content = expensesView();
  else if (section === 'settings') content = settingsView();
  else if (section === 'reports') content = reportsView();
  else if (section === 'notifications') content = notificationsView();
  else if (section === 'dues') content = duesView();
  else content = <EmptyState title="اطلاعات" language={language} />;

  const isInitialLoading = pageLoading || loadedSection !== section;

  return <div className="app-shell"><aside className="sidebar">{nav}</aside>{mobileNav&&<div className="mobile-nav-backdrop" onClick={() => setMobileNav(false)}><aside className="sidebar mobile-sidebar" onClick={(event) => event.stopPropagation()}><button className="icon-button close-menu" onClick={() => setMobileNav(false)} aria-label={translate('بستن منو', language)}><X size={18}/></button>{nav}</aside></div>}<main className="main-area">{header}{busy && <div className="loading-line" aria-hidden="true" />}<div className="page-content" aria-busy={isInitialLoading}>{isInitialLoading ? <div className="initial-loading" role="status"><span className="loading-spinner" aria-hidden="true" /><span>{language === 'en' ? 'Loading…' : 'در حال بارگذاری…'}</span></div> : content}</div></main>{(error||message)&&<div className={`toast ${error?'toast-error':'toast-success'}`} role={error?'alert':'status'}>{translate(error || message, language)}</div>}{printBillId&&typeof document!=='undefined'&&createPortal(<div className="modal-backdrop print-dialog-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setPrintBillId(null);}}><section className="print-dialog" role="dialog" aria-modal="true" aria-label={translate('پیش‌نمایش چاپ بل', language)}><div className="print-dialog-header"><strong>{translate('پیش‌نمایش چاپ بل', language)}</strong><button className="icon-button" onClick={()=>setPrintBillId(null)} aria-label={translate('بستن', language)}><X size={19}/></button></div><iframe title={translate('پیش‌نمایش چاپ بل', language)} src={`/bills/${printBillId}/print`} /></section></div>,document.body)}</div>;
}