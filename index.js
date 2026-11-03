import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';
import 'dotenv/config';



const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const client = new MongoClient(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster09.ceody5c.mongodb.net`);



export async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to database');
        return client;
    }
    catch (err) {
        console.log('Error connecting to database', err);

    }
}
// 1. Connect to MongoDB
const connectedClient = await connectToDatabase();

// 2. Select the database
const db = connectedClient.db(`${process.env.DB_NAME}`);

// 3. Select the collection
const events = db.collection("events");

// 4. Fetch all documents form mongodb and send them to the server side
// Get all events
app.get('/events', async (req, res) => {
    // search from mongodatabase for all user
    const result = await events.find({}).toArray();
    res.send(result);
});

// Get one user by ID 
app.get('/events/:id', async (req, res) => {
    console.log('params', req.params);
    const id = req.params.id;
    // query from mongodatabase for a sepecific user
    const query = { _id: new ObjectId(id) }
    const result = await events.findOne(query)
    res.send(result);
});

app.post('/events', async (req, res) => {
    const newUser = req.body;
    const result = await events.insertOne(newUser);
    res.send(result);

});

app.delete('/events/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await events.deleteOne(query)

    res.send(result);


})

// app.patch('/events/:id', async (req, res) => {
//     const id = req.params.id;
//     const updatedData = req.body;
//     //   console.log('userId', id, 'user info', updatedData);

//     const filter = {
//         _id: new ObjectId(id)
//     }
//     const options = { upsert: true };

//     const updateDoc = {
//         $set: {
//             name: updatedData.name,
//             email: updatedData.email,
//         }
//     }
//     console.log("Received event update:", req.body);
//     const result = await events.updateOne(filter, updateDoc, options);
//     res.send(result);
// })




app.patch('/events/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;

        console.log("Received event update:", updatedData);

        const filter = {
            _id: new ObjectId(id)
        };

        const updateDoc = {
            $set: {
                title: updatedData.title,
                description: updatedData.description,
                eventType: updatedData.eventType,
                thumbnail: updatedData.thumbnail,
                location: updatedData.location,
                eventDate: updatedData.eventDate,
            }
        };

        const result = await events.updateOne(
            filter,
            updateDoc
        );
        console.log("MongoDB update result:", result);

        res.send(result);

    } catch (error) {
        console.error(" Patch Event update error:", error);

        res.status(500).send({
            message: error.message
        });
    }
});


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 