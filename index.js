const axios = require('axios');
const fs = require('fs');

const ROBLOSECURITY_TOKEN = process.env.ROBLOSECURITY_TOKEN; 
const TRANSACTIONS_API_URL = `https://economy.roblox.com/v2/users/348833829/transactions?limit=10&transactionType=Sale`; 
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL; 

const LAST_TRANSACTION_FILE = 'lastTransactionId.txt';

function getLastTransactionId() {
    if (fs.existsSync(LAST_TRANSACTION_FILE)) {
        return fs.readFileSync(LAST_TRANSACTION_FILE, 'utf-8');
    }
    return null;
}

function saveLastTransactionId(transactionId) {
    fs.writeFileSync(LAST_TRANSACTION_FILE, transactionId, 'utf-8');
}

async function sendDiscordMessage(saleDetails) {
    const message = {
        content: `💸 **New Game Pass Sale!**\n\n**Game Pass**: ${saleDetails.details.name}\n**Amount**: ${saleDetails.currency.amount} Robux`,
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, message, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log('Sent notification to Discord');
    } catch (error) {
        console.error('Error sending message to Discord:', error);
    }
}

async function fetchSalesTransactions() {
    try {
        const response = await axios.get(TRANSACTIONS_API_URL, {
            headers: {
                Cookie: `.ROBLOSECURITY=${ROBLOSECURITY_TOKEN}`,
            },
        });

        const transactions = response.data.data;
        return transactions;
    } catch (error) {
        console.error('Error fetching transactions:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function trackSales() {
    const lastTransactionId = getLastTransactionId(); 
    const transactions = await fetchSalesTransactions();
    
    if (!transactions || transactions.length === 0) {
        console.log('No transactions found');
        return;
    }

    const latestTransaction = transactions[0]; 

    if (latestTransaction.id !== lastTransactionId) {
        console.log(`New sale detected: ${latestTransaction.details.name} for ${latestTransaction.currency.amount} Robux`);

        await sendDiscordMessage(latestTransaction);

        saveLastTransactionId(latestTransaction.id);
    } else {
        console.log('No new sales detected');
    }
}

async function startTracking(interval = 60000) {  
    console.log('Starting real-time sales tracker...');
    
    const transactions = await fetchSalesTransactions();
    if (transactions && transactions.length > 0) {
        saveLastTransactionId(transactions[0].id); 
        console.log('Initial transaction ID set');
    }

    setInterval(trackSales, interval);
}

startTracking(60000); 
