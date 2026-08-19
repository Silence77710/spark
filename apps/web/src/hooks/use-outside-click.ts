"use client";

import { useEffect, type RefObject } from "react";

// 点击 ref 元素外部时触发回调；active 为 false 时不监听（如下拉处于关闭状态）
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside, active]);
}
