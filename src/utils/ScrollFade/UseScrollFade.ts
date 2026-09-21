import { RefObject, useEffect, useState } from "react";

export function useScrollFade(
  ref: RefObject<HTMLElement | null>
) {
  const [isScrollable, setIsScrollable] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const scrollable =
        el.scrollHeight > el.clientHeight;

      setIsScrollable(scrollable);

      if (!scrollable) {
        setAtTop(true);
        setAtBottom(true);
        return;
      }

      setAtTop(el.scrollTop <= 1);

      setAtBottom(
        el.scrollTop + el.clientHeight >=
          el.scrollHeight - 1
      );
    };

    check();

    el.addEventListener("scroll", check);

    const observer = new ResizeObserver(check);

    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", check);
      observer.disconnect();
    };
  }, [ref]);

  return {
    isScrollable,
    atTop,
    atBottom,
  };
}