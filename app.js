const { crc16 } = require('crc');
const net = require('net');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

class AVLServer {
    constructor() {
        this.server = null;
        this.IMEI = "";
        this.packet = {};
        this.socketServer = null;
    }

    start(port, host, webPort) {
        // Crea el servidor AVL
        this.server = net.createServer((socket) => {
            socket.on('data', (data) => {
                this.handleData(data);
            });
        });

        this.server.listen(port, host, () => {
            console.log(`Servidor AVL escuchando en ${host}:${port}`);
        });
        const app = express();
        const server = http.createServer(app);
        this.socketServer = socketIo(server);

        this.socketServer.on('connection', (socket) => {
            console.log('Cliente web conectado');
        });

        app.get('/', (req, res) => {
            res.sendFile(__dirname + '/index.html');
        });

        server.listen(webPort, () => {
            console.log(`Servidor web escuchando en http://localhost:${webPort}`);
        });
    }

    handleData(buffer) {

        const codecId = buffer.readUInt8(8);
        if (codecId !== 0x8E) {
            console.log(`IMEI: ${buffer}`);
            return;
        } else {
            const longitudBytes = buffer.readInt32BE(19);
            const latitudBytes = buffer.readInt32BE(23);

            const longitud = (longitudBytes / 10000000).toFixed(5);
            const latitud = (latitudBytes / 10000000).toFixed(5);

            let timestamp = buffer.readUInt32BE(10) * 2 ** 32 + buffer.readUInt32BE(14);
            timestamp = new Date(timestamp);

            let priority = buffer[18];
            let altura = buffer.readUInt16BE(27);
            let angulo = buffer.readUInt16BE(29);
            let satelites = buffer[31];
            let velocidad = buffer.readUInt16BE(32);
            let hdop = buffer.readUInt16BE(34);
            let evento = buffer.readUInt16BE(36);

            console.log({ timestamp, priority, latitud, longitud, altura, angulo, satelites, velocidad, hdop, evento })

            this.socketServer.emit('gps', { timestamp, priority, latitud, longitud, altura, angulo, satelites, velocidad, hdop, evento });
        }
    }
}

const server = new AVLServer();
server.start(55555, '0.0.0.0', 8888);