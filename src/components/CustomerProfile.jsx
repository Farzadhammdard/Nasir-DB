'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Banknote, FileText, UserRound } from 'lucide-react';

const money = (minor) => `${new Intl.NumberFormat('fa-AF',{maximumFractionDigits:2}).format((Number(minor)||0)/100)} AFN`;

export default function CustomerProfile({ id }) {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/auth/me').then((response)=>response.json()),fetch(`/api/customers/${id}`).then((response)=>response.json())])
      .then(([session,result])=>{
        if (!active) return;
        if (!session.user) { router.replace('/login'); return; }
        if (result?.error) throw new Error(result.error.message || 'پروفایل مشتری بارگذاری نشد.');
        setCustomer(result);
      })
      .catch((loadError)=>{if(active)setError(loadError.message);});
    return ()=>{active=false;};
  },[id,router]);

  if (error) return <main className="page-content"><div className="notice notice-error">{error}</div></main>;
  if (!customer) return <main className="page-content">در حال بارگذاری پروفایل...</main>;

  return <main className="profile-page"><Link href="/customers" className="text-link"><ArrowRight size={16}/> بازگشت به مشتریان</Link><header className="profile-heading"><span className="profile-avatar"><UserRound size={24}/></span><div><p className="eyebrow">{customer.customer_number}</p><h1>{customer.name}</h1><p>{customer.phone || 'بدون تلفن'} · {customer.address || 'بدون آدرس'}</p></div></header><section className="metric-grid profile-metrics"><article className="metric"><span>مجموع خدمات</span><strong>{money(customer.total_minor)}</strong></article><article className="metric"><span>مجموع پرداخت</span><strong>{money(customer.paid_minor)}</strong></article><article className="metric"><span>مجموع باقی</span><strong>{money(customer.remaining_minor)}</strong></article><article className="metric"><span>تعداد بل</span><strong>{customer.bills?.length || 0}</strong></article></section><section className="content-panel"><div className="panel-heading"><div><h2><FileText size={17}/> بل‌های مشتری</h2><p>وضعیت و مانده‌ی هر بل</p></div></div>{customer.bills?.length?<div className="table-wrap"><table><thead><tr><th>شماره</th><th>تاریخ</th><th>مجموع</th><th>پرداخت</th><th>باقی</th><th>وضعیت</th></tr></thead><tbody>{customer.bills.map((bill)=><tr key={bill.id}><td className="mono">{bill.bill_number}</td><td>{bill.bill_date}</td><td>{money(bill.grand_total_minor)}</td><td>{money(bill.paid_minor)}</td><td>{money(bill.remaining_minor)}</td><td>{bill.status}</td></tr>)}</tbody></table></div>:<div className="empty-state">هنوز بل ثبت نشده است.</div>}</section><section className="content-panel"><div className="panel-heading"><div><h2><Banknote size={17}/> پرداخت‌ها</h2><p>تاریخچه‌ی کامل تراکنش‌ها</p></div></div>{customer.payments?.length?<div className="table-wrap"><table><thead><tr><th>شماره پرداخت</th><th>بل</th><th>تاریخ</th><th>روش</th><th>مبلغ</th><th>یادداشت</th></tr></thead><tbody>{customer.payments.map((payment)=><tr key={payment.id}><td className="mono">{payment.payment_number}</td><td>{payment.bill_number || 'پرداخت آزاد'}</td><td>{payment.payment_date}</td><td>{payment.method}</td><td>{money(payment.amount_minor)}</td><td>{payment.note || '—'}</td></tr>)}</tbody></table></div>:<div className="empty-state">هنوز پرداختی ثبت نشده است.</div>}</section></main>;
}