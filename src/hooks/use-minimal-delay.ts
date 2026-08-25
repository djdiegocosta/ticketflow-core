import { useState, useEffect } from "react";

export function useMinimalDelay(maxMs: number = 400) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), maxMs);
    return () => clearTimeout(timer);
  }, [maxMs]);

  return show;
}
