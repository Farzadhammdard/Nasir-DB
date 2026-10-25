'use client';

import { useEffect } from 'react';

export default function AutoPrint(){
  useEffect(function(){
    var t=setTimeout(function(){window.print();},300);
    return function(){clearTimeout(t);};
  },[]);
  return null;
}
