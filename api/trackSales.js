require('dotenv').config();
const axios = require('axios');

const USER_ID = '348833829';
const TRANSACTIONS_API_URL = `https://economy.roblox.com/v2/users/${USER_ID}/transactions?limit=10&transactionType=Sale`;

const ROBLOSECURITY_TOKEN = process.env.ROBLOSECURITY_TOKEN;
let xCsrfToken = null;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const PING_USER_ID = '632606086947536916';

async function getCsrfToken() {
	try {
		await axios.post('https://auth.roblox.com/v2/login', {}, {
			headers: {
				'Cookie': `.ROBLOSECURITY=${ROBLOSECURITY_TOKEN}`,
			}
		});
	} catch (error) {
		if (error.response && error.response.headers['x-csrf-token']) {
			xCsrfToken = error.response.headers['x-csrf-token'];
			console.log('New x-csrf-token fetched:', xCsrfToken);
		} else {
			console.error('Failed to retrieve x-csrf-token:', error);
		}
	}
}

async function getSalesTransactions() {
	if (!xCsrfToken) {
		await getCsrfToken();
	}

	try {
		const response = await axios.get(TRANSACTIONS_API_URL, {
			headers: {
				'Cookie': `.ROBLOSECURITY=${ROBLOSECURITY_TOKEN}`,
				'x-csrf-token': xCsrfToken
			}
		});
		return response.data;
	} catch (error) {
		if (error.response && error.response.status === 403 && error.response.headers['x-csrf-token']) {
			await getCsrfToken();
			return getSalesTransactions();
		} else {
			console.error('Error fetching sales transactions:', error);
			return null;
		}
	}
}

async function sendDiscordMessage(transaction) {
	const embed = {
		title: "💸 New Game Pass Sale!",
		description: `${transaction.details.name} has been sold.`,
		color: 0x00FF00,
		fields: [
			{
				name: "Sale Amount",
				value: `${transaction.currency.amount} Robux`,
				inline: true
			},
			{
				name: "Sale Date",
				value: new Date(transaction.created).toLocaleString(),
				inline: true
			}
		],
		footer: {
			text: "Roblox Sales Tracker"
		}
	};

	const data = {
		content: `<@${PING_USER_ID}> A new sale has occurred!`,
		embeds: [embed]
	};

	try {
		await axios.post(DISCORD_WEBHOOK_URL, data, {
			headers: {
				'Content-Type': 'application/json'
			}
		});
		console.log('Embed message sent to Discord');
	} catch (error) {
		console.error('Error sending embed message to Discord:', error);
	}
}

let lastTransactionId = null;

async function trackSales() {
	const transactions = await getSalesTransactions();
	if (transactions && transactions.data.length > 0) {
		const latestTransaction = transactions.data[0];

		if (latestTransaction.id !== lastTransactionId) {
			lastTransactionId = latestTransaction.id;

			await sendDiscordMessage(latestTransaction);
		}
	}
}

setInterval(trackSales, 60000);

trackSales();
