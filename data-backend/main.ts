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
                x: values[0],
                y: values[1],
                z: values[2],
            },
            gyro: {
                x: values[3],
                y: values[4],
                z: values[5],
            },
            shockDetected: values[6],
            temperature: values[7],
            humidity: values[8],
            water: values[9],
            light: values[10]
        }

        data.push(entry)

        console.log(text)
        console.log(values)
        console.log(entry)

        return new Response('POSTED DATA!', { headers: corsHeaders });
    }

    return new Response(JSON.stringify(data[data.length - 1]), { headers: corsHeaders });
});