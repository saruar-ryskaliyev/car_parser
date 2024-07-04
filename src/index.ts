import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
// import { checkForNewCars } from "./utils/scrapper";
import { scrapeSiteWithCheerio } from "./utils/scrapper";
import { sendNotification } from "./utils/notify";
import { connectDB } from './models/index';
import http from 'http';
import { Server } from "socket.io";
import cors from 'cors';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server);

const corsOptions = {
    origin: 'http://localhost:3001', // Allow only this origin
    methods: ['GET', 'POST'], // Allow only these methods
};

app.use(cors(corsOptions));

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});

app.get("/cars", async (req: Request, res: Response) => {
    try {
        const newCars = await scrapeSiteWithCheerio();
        res.json(newCars);
    } catch (error) {
        res.status(500).json({ error: "Failed to scrape site" });
    }
});

app.get("/search-cars", (req: Request, res: Response) => {
    console.log('Received request to check for new cars...');
    
    // Respond immediately to avoid timeout
    res.json({ message: "Search for new cars started" });
    
    // Perform the scraping and notification asynchronously
    (async () => {
        try {
            const newCars = await scrapeSiteWithCheerio();
            if (newCars.length > 0) {
                const notifiedCars = await sendNotification(newCars);
                console.log('New cars:', notifiedCars);
                io.emit('newCars', notifiedCars);
            } else {
                console.log('No new cars found');
            }
        } catch (error) {
            console.error('Failed to search for cars', error);
        }
    })();
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(port, async () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
    await connectDB();
});
