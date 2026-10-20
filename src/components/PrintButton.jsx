'use client';

export default function PrintButton() {
  return <button className="button-primary" onClick={() => window.print()}>چاپ بل</button>;
}