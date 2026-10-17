import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import 'dotenv/config'
import connectDB from "./configs/db.js";

import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

await connectDB()

const app = express();

//Middleware
app.use(cors())
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

