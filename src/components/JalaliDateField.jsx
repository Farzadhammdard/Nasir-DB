'use client';

import { useState } from 'react';
import * as jalaali from 'jalaali-js';

const pad = (value) => String(value).padStart(2, '0');

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kabul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const gregorian = { gy: Number(values.year), gm: Number(values.month), gd: Number(values.day) };
  const date = jalaali.toJalaali(gregorian.gy, gregorian.gm, gregorian.gd);
  return {
    jalali: `${date.jy}/${pad(date.jm)}/${pad(date.jd)}`,
    iso: `${gregorian.gy}-${pad(gregorian.gm)}-${pad(gregorian.gd)}`,
  };
}

export default function JalaliDateField({ label = 'تاریخ', required = false }) {
  const [date, setDate] = useState(today);
  const [invalid, setInvalid] = useState(false);

  function update(value) {
    setDate((current) => ({ ...current, jalali: value }));
    const normalized = value.trim().replace(/[۰-۹٠-٩]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(digit) % 10));
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
    if (!match) { setInvalid(value.length > 0); return; }
    const [, year, month, day] = match.map(Number);
    if (!jalaali.isValidJalaaliDate(year, month, day)) { setInvalid(true); return; }
    const gregorian = jalaali.toGregorian(year, month, day);
    setInvalid(false);
    setDate({ jalali: value, iso: `${gregorian.gy}-${pad(gregorian.gm)}-${pad(gregorian.gd)}` });
  }

  return <label className="form-field"><span>{label}</span><input className="field-control jalali-date-input" type="text" inputMode="numeric" dir="ltr" value={date.jalali} required={required} aria-invalid={invalid} aria-describedby={invalid ? 'jalali-date-error' : undefined} onChange={(event) => update(event.target.value)} placeholder="۱۴۰۵/۰۷/۲۴"/><input type="hidden" name="date" value={date.iso}/>{invalid&&<small id="jalali-date-error" className="field-error">تاریخ شمسی معتبر وارد کنید.</small>}</label>;
}
