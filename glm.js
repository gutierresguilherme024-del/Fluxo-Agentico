import 'dotenv/config';
import readline from 'readline';

const apiKey = process.env.VITE_NVIDIA_API_KEY;
const baseURL = process.env.VITE_NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const model = process.env.VITE_LLM_MODEL || 'z-ai/glm4.7';

if (!apiKey) {
    console.error('\x1b[31mErro: VITE_NVIDIA_API_KEY não encontrada no arquivo .env\x1b[0m');
    process.exit(1);
}

const args = process.argv.slice(2);
const quickQuestion = args.join(' ');

async function askGLM(prompt) {
    process.stdout.write('\n\x1b[35m[Pensando...]\x1b[0m ');

    try {
        const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                chat_template_kwargs: { "enable_thinking": true, "clear_thinking": false }
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Erro API (${response.status}): ${err}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reasoningMode = false;
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const l of lines) {
                const trimmed = l.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;

                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        const delta = data.choices[0].delta;

                        if (delta.reasoning_content) {
                            if (!reasoningMode) {
                                process.stdout.write('\n\x1b[2m'); // Escurece o texto para o raciocínio
                                reasoningMode = true;
                            }
                            process.stdout.write(delta.reasoning_content);
                        } else if (delta.content) {
                            if (reasoningMode) {
                                process.stdout.write('\x1b[0m\n\n'); // Volta ao normal
                                reasoningMode = false;
                            }
                            process.stdout.write(delta.content);
                        }
                    } catch (e) { }
                }
            }
        }
        process.stdout.write('\n\n');
    } catch (err) {
        console.error('\n\x1b[31mErro ao falar com GLM:\x1b[0m', err.message);
    }
}

if (quickQuestion) {
    await askGLM(quickQuestion);
} else {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[36mGLM-Studio > \x1b[0m'
    });

    console.log('\x1b[32mConectado ao GLM-4.7. Digite sua pergunta (ou "sair" para fechar).\x1b[0m');
    rl.prompt();

    rl.on('line', async (line) => {
        if (line.toLowerCase() === 'sair') rl.close();
        else {
            await askGLM(line);
            rl.prompt();
        }
    });
}

