import Link from 'next/link';
import { redirect } from 'next/navigation';
import { all, get } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { getAppConfig } from '@/lib/settings';
import { formatMoney as formatMoneyBase } from '@/lib/money';
import PrintButton from '@/components/PrintButton';

const printMoney = (minor, options) => formatMoneyBase(minor, { ...options, decimals: 0 });

export default async function BillPrintPage({ params }) {
  const { id } = await params;
  try { await requirePermission('bills.view'); } catch { redirect('/login'); }
  const bill = get('SELECT b.*,c.customer_number,c.name AS customer_name,c.phone AS customer_phone FROM bills b JOIN customers c ON c.id=b.customer_id WHERE b.id=? AND b.deleted_at IS NULL',[Number(id)]);
  if (!bill) return <main className="p-8">بل پیدا نشد.</main>;
  const items = all('SELECT * FROM bill_items WHERE bill_id=? ORDER BY sort_order,id',[bill.id]);
  const config = getAppConfig();
  const copy = (label) => (
    <section className="invoice-copy" dir="rtl">
      <header className="invoice-head">
        <div className="invoice-company">
          <h1>{config.company.name || 'شرکت'}</h1>
          <p>{[config.company.address, config.company.phone, config.company.email].filter(Boolean).join(' · ')}</p>
        </div>
        <h2>{label}</h2>
      </header>
      <div className="invoice-meta">
        <span><small>شماره بل</small><b>{bill.bill_number}</b></span>
        <span><small>تاریخ</small><b>{bill.bill_date}</b></span>
        <span><small>نام مشتری</small><b>{bill.customer_name}</b></span>
        <span><small>شماره مشتری</small><b>{bill.customer_number}</b></span>
        <span><small>تلفن</small><b>{bill.customer_phone || '—'}</b></span>
      </div>
      <table>
        <thead><tr><th>#</th><th>نوعیت خدمات</th><th>توضیحات</th><th>تعداد / متراژ</th><th>قیمت</th><th>مجموع</th></tr></thead>
        <tbody>{items.map((item, index) => <tr key={item.id}>
          <td>{index + 1}</td>
          <td>{item.service_name}</td>
          <td>{item.description || '—'}</td>
          <td>{item.quantity}</td>
          <td>{printMoney(item.unit_price_minor, { locale: 'fa-AF', currency: config.currency.code })}</td>
          <td>{printMoney(item.total_minor, { locale: 'fa-AF', currency: config.currency.code })}</td>
        </tr>)}</tbody>
      </table>
      <div className="invoice-totals">
        <div><span>جمع اقلام</span><b>{printMoney(bill.subtotal_minor, { locale: 'fa-AF', currency: config.currency.code })}</b></div>
        <div><span>تخفیف</span><b>{printMoney(bill.discount_minor, { locale: 'fa-AF', currency: config.currency.code })}</b></div>
        <div className="invoice-grand-total"><span>مجموع نهایی</span><b>{printMoney(bill.grand_total_minor, { locale: 'fa-AF', currency: config.currency.code })}</b></div>
        <div><span>رسید / پرداخت</span><b>{printMoney(bill.paid_minor, { locale: 'fa-AF', currency: config.currency.code })}</b></div>
        <div className="invoice-balance"><span>باقی</span><b>{printMoney(bill.remaining_minor, { locale: 'fa-AF', currency: config.currency.code })}</b></div>
      </div>
      <footer className="invoice-signatures"><span>امضای مسئول: __________________</span><span>امضای مشتری: __________________</span></footer>
    </section>
  );
  return (
    <main className="print-page" dir="rtl">
      <div className="print-toolbar"><PrintButton /><Link className="button-secondary" href="/bills">بازگشت به بل‌ها</Link></div>
      <article className="print-sheet">{copy('نسخه شرکت')}<p className="cut-line">برای برش</p>{copy('نسخه مشتری')}</article>
    </main>
  );
}