const express = require('express');
const server = require('http').createServer();
const app = express();

app.get('/', function (req, res) {
    res.sendFile('index.html', {root: __dirname});
});

server.on('request', app);

server.listen(3000, function() {
    console.log('Server started on port 3000');
});

process.on('SIGINT', () => {
    // HIGHLIGHTED START
    const now = new Date();
    const dateTimeString = now.toLocaleString(); // Or any format you prefer
    console.log(`SIGINT received at: ${dateTimeString}`);
    // HIGHLIGHTED END
    console.log('Closing WebSocket clients...');
    wss.clients.forEach(client => client.close());

    console.log('Closing HTTP server...');
    server.close(async (err) => { // Make the callback async
        if (err) {
            console.error('Error closing server:', err);
        } else {
            console.log('HTTP server closed.');
        }

        console.log('Shutting down database...');
        await shutdownDB(); // Wait for shutdownDB to complete

        console.log('Exiting process.');
        process.exit(0); // Exit the Node.js process
    });
});

// Begin WebSocket

const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({server: server});

wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log('Clients connected', numClients);

    wss.broadcast(`Current visitors: ${numClients}`);

    if (ws.readyState === ws.OPEN) {
        ws.send('Welcome to my server');
    }

    db.run(`INSERT INTO visitors (count, time)
        VALUES (${numClients}, datetime('now'))
    `)

    ws.on('close', function close() {
        console.log('A client has disconnected');
    });
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach( function each(client) {
        client.send(data);
    });
}

// End WebSocket

// Begin database

const sqlite = require('sqlite3');
const db = new sqlite.Database(':memory:');

db.serialize(() => {
    db.run(`
        CREATE TABLE visitors (
                count INTEGER,
                time TEXT
            )
    `)
});

async function shutdownDB() { // Make shutdownDB an async function
    console.log("Getting visitor counts before shutdown...");
    await new Promise((resolve, reject) => {
        db.all("SELECT * FROM visitors", (err, rows) => { // Use db.all to get all rows at once
            if (err) {
                console.error("Error fetching visitor counts:", err);
                reject(err);
                return;
            }
            rows.forEach(row => console.log(row));
            resolve();
        });
    });

    console.log("Closing database connection...");
    await new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                console.error("Error closing database:", err);
                reject(err);
                return;
            }
            console.log("Database connection closed.");
            resolve();
        });
    });
}