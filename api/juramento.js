
const LIMIT = 8 * 1024;

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const EMBED_COLOR = 0xD9AD62;

const DISCORD_API = 'https://discord.com/api/v10';


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

// Limpa os textos e limita o tamanho dos campos.
function clean(value, maxLength) {
    return typeof value === 'string'
        ? value.trim().slice(0, maxLength)
        : '';
}


// ============================================================
// VALIDAÇÃO DO JURAMENTO
// ============================================================

function validateJuramento(data) {

    const juramento = {
        nome: clean(data.nome, 60),
        idCidade: clean(data.idCidade, 15),
        fidelidade: clean(data.fidelidade, 500),
        lealdade: clean(data.lealdade, 500),
        compromisso: clean(data.compromisso, 700)
    };

    const camposInvalidos =
        juramento.nome.length < 2 ||
        !/^\d{1,15}$/.test(juramento.idCidade) ||
        [
            juramento.fidelidade,
            juramento.lealdade,
            juramento.compromisso
        ].some(value => value.length < 2);

    if (camposInvalidos) {
        return null;
    }

    return juramento;
}


// ============================================================
// CRIAÇÃO DA EMBED
// ============================================================

function createJuramentoEmbed(juramento) {

    return {
        color: EMBED_COLOR,

        author: {
            name: 'CASSINO • REGISTRO DE JURAMENTO'
        },

        title: '📜 Juramento de Fidelidade',

        description:
            'Um novo juramento foi registrado pelo painel do Cassino.',

        fields: [
            {
                name: '👤 Nome na cidade',
                value: juramento.nome,
                inline: true
            },
            {
                name: '🪪 ID na cidade',
                value: juramento.idCidade,
                inline: true
            },
            {
                name: '🤝 Fidelidade à facção',
                value: juramento.fidelidade,
                inline: false
            },
            {
                name: '🛡️ Lealdade e respeito',
                value: juramento.lealdade,
                inline: false
            },
            {
                name: '⚜️ Compromisso com a família',
                value: juramento.compromisso,
                inline: false
            }
        ],

        footer: {
            text: 'Registro enviado pelo site • Sem vinculação automática à conta Discord'
        },

        timestamp: new Date().toISOString()
    };
}


// ============================================================
// ENVIO PRINCIPAL • ABADDON BOT
// ============================================================

async function sendWithBot(message) {

    const token = process.env.DISCORD_BOT_TOKEN;

    const channelId =
        process.env.DISCORD_JURAMENTO_CHANNEL_ID;

    if (!token || !channelId) {
        return false;
    }

    try {
        const response = await fetch(
            `${DISCORD_API}/channels/${encodeURIComponent(channelId)}/messages`,
            {
                method: 'POST',

                headers: {
                    Authorization: `Bot ${token}`,
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(message)
            }
        );

        if (response.ok) {
            return true;
        }

        console.error(
            `[JURAMENTO] Falha no bot: ${response.status}`
        );

        return false;

    } catch (error) {

        console.error(
            '[JURAMENTO] Erro de conexão com o bot:',
            error.message
        );

        return false;
    }
}


// ============================================================
// ENVIO RESERVA • DISCORD WEBHOOK
// ============================================================

async function sendWithWebhook(message) {

    const webhook =
        process.env.DISCORD_JURAMENTO_WEBHOOK_URL;

    if (!webhook) {
        return false;
    }

    try {
        // Valida a URL antes de realizar o envio.
        const url = new URL(webhook);

        const validHost =
            url.hostname === 'discord.com' ||
            url.hostname === 'discordapp.com';

        const validPath =
            /^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname);

        if (!validHost || !validPath) {
            throw new Error('URL do webhook inválida.');
        }

        const response = await fetch(webhook, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(message)
        });

        if (response.ok) {
            return true;
        }

        console.error(
            `[JURAMENTO] Falha no webhook: ${response.status}`
        );

        return false;

    } catch (error) {

        console.error(
            '[JURAMENTO] Erro no webhook:',
            error.message
        );

        return false;
    }
}


// ============================================================
// API PRINCIPAL • REGISTRO DE JURAMENTO
// ============================================================

module.exports = async function handler(req, res) {

    // --------------------------------------------------------
    // 1. VERIFICAR MÉTODO HTTP
    // --------------------------------------------------------

    if (req.method !== 'POST') {

        res.setHeader('Allow', 'POST');

        return res.status(405).json({
            error: 'Método não permitido.'
        });
    }

    try {

        // ----------------------------------------------------
        // 2. RECEBER OS DADOS
        // ----------------------------------------------------

        const data =
            typeof req.body === 'string'
                ? JSON.parse(req.body)
                : req.body || {};

        // ----------------------------------------------------
        // 3. VALIDAR O TAMANHO DO FORMULÁRIO
        // ----------------------------------------------------

        if (JSON.stringify(data).length > LIMIT) {

            return res.status(413).json({
                error: 'Formulário muito grande.'
            });
        }

        // ----------------------------------------------------
        // 4. VALIDAR OS CAMPOS
        // ----------------------------------------------------

        const juramento = validateJuramento(data);

        if (!juramento) {

            return res.status(400).json({
                error: 'Preencha todos os campos corretamente.'
            });
        }

        // ----------------------------------------------------
        // 5. MONTAR A MENSAGEM DO DISCORD
        // ----------------------------------------------------

        const embed = createJuramentoEmbed(juramento);

        const message = {
            embeds: [embed],

            allowed_mentions: {
                parse: []
            }
        };

        // ----------------------------------------------------
        // 6. TENTAR ENVIO PELO ABADDON BOT
        // ----------------------------------------------------

        const botSuccess = await sendWithBot(message);

        if (botSuccess) {

            return res.status(200).json({
                ok: true,
                via: 'bot'
            });
        }

        // ----------------------------------------------------
        // 7. TENTAR ENVIO PELO WEBHOOK
        // ----------------------------------------------------

        const webhookSuccess =
            await sendWithWebhook(message);

        if (webhookSuccess) {

            return res.status(200).json({
                ok: true,
                via: 'webhook'
            });
        }

        // ----------------------------------------------------
        // 8. FALHA EM AMBOS OS MÉTODOS
        // ----------------------------------------------------

        console.error(
            '[JURAMENTO] Não foi possível publicar o registro.'
        );

        return res.status(502).json({
            error:
                'Falha ao publicar. Verifique as configurações do canal de juramento.'
        });

    } catch (error) {

        // ----------------------------------------------------
        // 9. TRATAMENTO DE ERROS
        // ----------------------------------------------------

        console.error(
            '[JURAMENTO] Erro interno:',
            error.message
        );

        return res.status(500).json({
            error: 'Erro interno ao processar juramento.'
        });
    }
};
