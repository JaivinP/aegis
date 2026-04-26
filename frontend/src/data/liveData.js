import { useState, useEffect } from 'react';

const dataUrl = 'http://34.41.16.247:8080'

export function useLiveData() {
  const [data, setData] = useState({
        "acceleration": {
            "x": 0,
            "y": 0,
            "z": 0
        },
        "gyro": {
            "x": 0,
            "y": 0,
            "z": 0
        },
        "humidity": 10,
        "light": 10,
        "shockDetected": 0,
        "temperature": 20,
        "water": 0
    });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
        try {
        const res = await fetch(dataUrl);
        const json = await res.json();
        if (!cancelled) setData(json);
        } catch {}

        if (!cancelled) setTimeout(fetchData, 100);
    };

    fetchData();
    return () => { cancelled = true; };
    }, []);

  return { data }
}