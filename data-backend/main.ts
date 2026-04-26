const data: any[] = []

for(let i = 0; i < 20; i++) {
    data.push({
        acceleration: {
            x: Math.random() * 100,
            y: Math.random() * 100,
            z: Math.random() * 100,
        },
        gyro: {
            x: Math.random() * 100,
            y: Math.random() * 100,
            z: Math.random() * 100,
        },
        shockDetected: Math.random() * 100,
        temperature: Math.random() * 100,
        humidity: Math.random() * 100,
        water: Math.random() * 100,
        light: Math.random() * 100
    })
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

Deno.serve({ port: 8080 }, async (req) => {
    if(req.method === 'POST') {
        const text = await req.text()
        const values = text.split(';').map(value => parseFloat(value))

        const entry = {
            acceleration: {
                x: values[1],
                y: values[2],
                z: values[3],
            },
            gyro: {
                x: values[4],
                y: values[5],
                z: values[6],
            },
            shockDetected: values[7],
            temperature: values[8],
            humidity: values[9],
            water: values[10],
            light: values[11]
        }

        data.push(entry)

        console.log(text)
        console.log(values)
        console.log(entry)

        return new Response('POSTED DATA!', { headers: corsHeaders });
    }

    return new Response(JSON.stringify(data[data.length - 1]), { headers: corsHeaders });
});