import { useState, useEffect } from 'react';

const dataUrl = 'http://34.41.16.247:8080'

export function useLiveData() {
  const [data, setData] = useState({
        "acceleration": {
            "x": 20.564446496274158,
            "y": 89.3409753196091,
            "z": 27.01100953100555
        },
        "gyro": {
            "x": 78.43000475987452,
            "y": 12.889991753377162,
            "z": 49.67267611307297
        },
        "humidity": 10.22729554389683,
        "light": 41.39773707326412,
        "shockDetected": 69.58334054644678,
        "temperature": 46.778468378764835,
        "water": 50.96164793214775
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