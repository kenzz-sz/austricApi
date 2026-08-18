export default async function handler(req, res) {
    // 1. CORS settings
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 2. Preflight Request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Ensure the API only accepts POST requests FIRST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Only POST method is allowed' });
    }

    // 4. Now it's safe to check the body
    if (req.body.type === "nglSendMsg") {
        const bodyhand = req.body.request;
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
                res.status(200).json({ success: true, message: 'Successfully sent via Vercel!' });
            } else {
                res.status(400).json({ success: false, message: 'Rejected by the target server' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'An error occurred on the Vercel server' });
        }
    } else {
        // Handle cases where the type is wrong
        res.status(400).json({ success: false, message: 'Invalid request type' });
    }
}
