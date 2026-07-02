"use client";

import { useEffect, useState } from "react";

export default function CountdownDeadline({
  deadline,
}: {
  deadline: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (now === null) {
    return <span>--:--:--</span>;
  }

  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return <span>Scadenza raggiunta</span>;
  }

  const giorni = Math.floor(diff / (1000 * 60 * 60 * 24));
  const ore = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minuti = Math.floor((diff / (1000 * 60)) % 60);
  const secondi = Math.floor((diff / 1000) % 60);

  return (
    <span>
      {giorni > 0 && `${giorni}g `}
      {String(ore).padStart(2, "0")}:
      {String(minuti).padStart(2, "0")}:
      {String(secondi).padStart(2, "0")}
    </span>
  );
}