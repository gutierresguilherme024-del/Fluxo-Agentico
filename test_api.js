async function test() {
    const req = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': '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',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'hi' }]
        })
    });
    const res = await req.json();
    console.log(res);
}

test();
