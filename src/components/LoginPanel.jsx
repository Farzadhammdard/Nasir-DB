'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';

export default function LoginPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [init, setInit] = useState(true);
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [language, setLanguage] = useState('fa');
  const text = (dari, english) => language === 'en' ? english : dari;

  useEffect(() => {
    const storedLanguage = localStorage.getItem('nasirdb-language') || 'fa';
    setLanguage(storedLanguage);
    document.documentElement.lang = storedLanguage === 'en' ? 'en' : 'fa-AF';
    document.documentElement.dir = storedLanguage === 'en' ? 'ltr' : 'rtl';
    Promise.all([
      fetch('/api/auth/me').then((response) => response.json()),
      fetch('/api/setup/check').then((response) => response.json()),
    ]).then(([session, setup]) => {
      if (session.user) { router.replace('/dashboard'); return; }
      setInit(Boolean(setup.initialized));
      setMode(setup.initialized ? 'login' : 'setup');
    }).catch((loadError) => setError(loadError.message)).finally(() => setLoadingSetup(false));
  }, [router]);

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    localStorage.setItem('nasirdb-language', nextLanguage);
    document.documentElement.lang = nextLanguage === 'en' ? 'en' : 'fa-AF';
    document.documentElement.dir = nextLanguage === 'en' ? 'ltr' : 'rtl';
  }

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'setup' ? '/api/auth/initialize' : '/api/auth/login';
      const response = await fetch(endpoint, { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || text('ورود انجام نشد.', 'Sign-in failed.'));
      if (mode === 'setup') changeLanguage(String(form.get('language') || language));
      sessionStorage.setItem('nasirdb-login-notice', '1');
      router.replace('/dashboard');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-page">
    <button className="language-toggle login-language-toggle" onClick={() => changeLanguage(language === 'en' ? 'fa' : 'en')}>{language === 'en' ? 'دری' : 'EN'}</button>
    <aside className="login-aside"><span className="brand-mark"><KeyRound size={21}/></span><div><h1>{text('حساب‌های روشن، تصمیم‌های بهتر.', 'Clear accounts. Better decisions.')}</h1><p>{text('مدیریت بل، مشتری و جریان مالی شرکت در یک فضای امن و محلی.', 'Manage bills, customers, and company finances in one secure workspace.')}</p></div><small>{text('سامانه مدیریت شرکت', 'Company management')}</small></aside>
    <section className="login-main"><div className="login-card"><h2>{mode === 'setup' ? text('راه‌اندازی شرکت', 'Set up your company') : text('خوش آمدید', 'Welcome back')}</h2><p>{mode === 'setup' ? text('اطلاعات اولیه شرکت و مدیر را ثبت کنید.', 'Enter the initial company and administrator details.') : text('برای ادامه وارد حساب خود شوید.', 'Sign in to continue.')}</p>
      {loadingSetup ? <p>{text('در حال بررسی...', 'Checking...')}</p> : <form onSubmit={submit}>
        {!init && <>
          <label className="form-field"><span>{text('نام شرکت', 'Company name')}</span><input className="field-control" name="companyName" required placeholder={text('نام شرکت شما', 'Your company name')}/></label>
          <label className="form-field"><span>{text('نام مدیر', 'Administrator name')}</span><input className="field-control" name="fullName" placeholder={text('نام و نام خانوادگی', 'Full name')}/></label>
          <div className="setup-grid">
            <label className="form-field"><span>{text('واحد پول', 'Currency')}</span><select className="field-control" name="currency"><option value="AFN">AFN · {text('افغانی', 'Afghani')}</option><option value="USD">USD · {text('دالر', 'US dollar')}</option></select></label>
            <label className="form-field"><span>{text('زبان', 'Language')}</span><select className="field-control" name="language" value={language} onChange={(event) => changeLanguage(event.target.value)}><option value="fa">دری</option><option value="en">English</option></select></label>
          </div>
          <div className="setup-grid">
            <label className="form-field"><span>{text('شماره شروع بل', 'First bill number')}</span><input className="field-control" name="billStart" type="number" min="1" defaultValue="1"/></label>
            <label className="form-field"><span>{text('شماره شروع مشتری', 'First customer number')}</span><input className="field-control" name="customerStart" type="number" min="1" defaultValue="1"/></label>
          </div>
        </>}
        <label className="form-field"><span>{text('نام کاربری', 'Username')}</span><div className="input-with-icon"><LockKeyhole size={16}/><input className="field-control" name="username" required placeholder={text('نام کاربری', 'Username')} dir="ltr" autoComplete="username"/></div></label>
        <label className="form-field"><span>{text('رمز عبور', 'Password')}</span><div className="password-control"><input className="field-control" name="password" required type={showPassword?'text':'password'} minLength={mode==='setup'?6:undefined} placeholder={text('رمز عبور', 'Password')} dir="ltr" autoComplete={mode==='setup'?'new-password':'current-password'}/><button type="button" className="icon-button" onClick={()=>setShowPassword((value)=>!value)} aria-label={showPassword?text('پنهان‌کردن رمز','Hide password'):text('نمایش رمز','Show password')}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
        {error&&<p role="alert" className="notice notice-error">{error}</p>}
        <button disabled={loading} className="button-primary">{loading?text('در حال انجام...','Working...'):mode==='setup'?text('ساخت مدیر و ادامه','Create administrator'):text('ورود','Sign in')}</button>
      </form>}
    </div></section>
  </main>;
}
