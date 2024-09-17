const axios = require('axios');
const fs = require('fs');

// Roblox API configuration
const ROBLOSECURITY_TOKEN = process.env.ROBLOSECURITY_TOKEN;  // Store securely in environment variables
const TRANSACTIONS_API_URL = `https://economy.roblox.com/v2/users/348833829/transactions?limit=10&transactionType=Sale`;  // Replace with your User ID
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;  // Discord webhook

// File to persist last transaction ID
const LAST_TRANSACTION_FILE = 'lastTransactionId.txt';

// Function to read the last transaction ID from file (persistent tracking)
function getLastTransactionId() {
    if (fs.existsSync(LAST_TRANSACTION_FILE)) {
        return fs.readFileSync(LAST_TRANSACTION_FILE, 'utf-8');
    }
    return null;
}

// Function to save the last transaction ID to file (persistent tracking)
function saveLastTransactionId(transactionId) {
    fs.writeFileSync(LAST_TRANSACTION_FILE, String(transactionId), 'utf-8');  // Convert to string
}

// Function to send a message to Discord as an embed
async function sendDiscordEmbed(saleDetails) {
    const saleDate = new Date(saleDetails.created).toLocaleString();  // Format the sale date

    const embed = {
        title: "💸 New Game Pass Sale!",
        description: `A new game pass sale has been detected.`,
        color: 0x00FF00,  // Green color
        fields: [
            {
                name: "Game Pass",
                value: saleDetails.details.name,
                inline: true,
            },
            {
                name: "Amount",
                value: `${saleDetails.currency.amount} Robux`,
                inline: true,
            },
            {
                name: "Date of Sale",
                value: saleDate,
                inline: true,
            }
        ],
        footer: {
            text: "Roblox Sales Tracker"
        }
    };

    const data = {
        embeds: [embed],  // Send embed array in payload
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, data, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log('Sent embed notification to Discord');
    } catch (error) {
        console.error('Error sending embed to Discord:', error);
    }
}

// Function to fetch the latest sales transactions
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

// Function to track new sales in real-time
async function trackSales() {
    const lastTransactionId = getLastTransactionId();  // Retrieve last tracked transaction ID
    const transactions = await fetchSalesTransactions();
    
    if (!transactions || transactions.length === 0) {
        console.log('No transactions found');
        return;
    }

    const latestTransaction = transactions[0];  // The most recent sale

    // If the latest transaction is new (i.e., different from the last one we tracked)
    if (latestTransaction.id !== lastTransactionId) {
        console.log(`New sale detected: ${latestTransaction.details.name} for ${latestTransaction.currency.amount} Robux`);

        // Send a Discord embed notification
        await sendDiscordEmbed(latestTransaction);

        // Update the last known transaction ID persistently
        saveLastTransactionId(latestTransaction.id);
    } else {
        console.log('No new sales detected');
    }
}

// Function to run the tracker periodically
async function startTracking(interval = 60000) {  // Default interval is 60 seconds
    console.log('Starting real-time sales tracker...');
    
    // Initial fetch to set the lastTransactionId
    const transactions = await fetchSalesTransactions();
    if (transactions && transactions.length > 0) {
        saveLastTransactionId(transactions[0].id);  // Set the last known transaction to the most recent one
        console.log('Initial transaction ID set');
    }

    // Periodically check for new sales
    setInterval(trackSales, interval);
}

// Start the sales tracker with a 1-minute interval
startTracking(60000);  // 60 seconds
