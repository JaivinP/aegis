const temperatureData: number[] = []
const humidityData: number[] = []
const lightData: number[] = []
const shockData: number[] = []
const waterData: number[] = []

for(let i = 0; i < 20; i++) {
    temperatureData.push(Math.random() * 100)
    humidityData.push(Math.random() * 100)
    lightData.push(Math.random() * 100)
    shockData.push(Math.random() * 100)
    waterData.push(Math.random() * 100)
}

Deno.serve({ port: 8080 }, async (req) => {
    if(req.method === 'POST') {
        const text = await req.text()
        const values = text.split(';').map(value => parseFloat(value))

        temperatureData.push(values[0] ?? 0)
        humidityData.push(values[1] ?? 0)
        lightData.push(values[2] ?? 0)
        shockData.push(values[3] ?? 0)
        waterData.push(values[4] ?? 0)

        console.log(text)
        console.log(values)

        return new Response('POSTED DATA!');
    }

    return new Response(JSON.stringify({
        tick: temperatureData.length,
        temperature: temperatureData.slice(Math.max(0, temperatureData.length - 20), temperatureData.length),
        humidity: humidityData.slice(Math.max(0, humidityData.length - 20), humidityData.length),
        light: lightData.slice(Math.max(0, lightData.length - 20), lightData.length),
        shock: shockData.slice(Math.max(0, shockData.length - 20), shockData.length),
        water: waterData.slice(Math.max(0, waterData.length - 20), waterData.length)
    }));
});