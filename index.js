import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';
import 'dotenv/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';



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
const joinedEvents = db.collection("joinedEvents")
const allEvents = db.collection("allevents")

const verfyToken = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader);

    if (authHeader) {
        console.log("authorized");
    } else {
        return res.status(404).send({ message: "unauthorized" })

    }

    const token = authHeader.split(" ")[1]
    console.log(token);

if(!token){
     return res.status(404).send({ message: "unauthorized" })

}

const JWKS =  createRemoteJWKSet( new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

const {payload}= await jwtVerify (token, JWKS)
 console.log(payload);


    next();
};


// 4. Fetch all documents form mongodb and send them to the server side
// Get all events
app.get('/events', async (req, res) => {
    // search from mongodatabase for all user
    const result = await events.find({}).toArray();
    res.send(result);
});

app.get ('/limit-events', async (req, res)=>{
    const result = await events.find().limit(6).toArray();
    res.send(result);
})

app.get('/allEvents', async (req, res) => {
    // search from mongodatabase for all events
    const result = await allEvents.find({}).toArray();
    res.send(result);
})

app.get ('/featured-events', async (req, res)=>{
    const result = await allEvents.find().limit(6).toArray();
    res.send(result);
})

// Get one user by ID 
app.get('/events/:id', verfyToken, async (req, res) => {
    // const {id}=req.params
    // console.log('params', req.params);
    const id = req.params.id;
    // query from mongodatabase for a sepecific user
    const query = { _id: new ObjectId(id) }
    const result = await events.findOne(query)
    res.send(result);
});

app.get('/joinedEvents/:email', async (req, res) => {

    const { email } = req.params
    const result = await joinedEvents.find({ userEmail: email }).toArray()
    res.send(result)
})

app.get('/events/organizer/:email', async (req, res) => {
    const { email } = req.params
    const result = await events.find({ organizerEmail: email }).toArray()
    res.send(result)
})

// app.post('/events', async (req, res) => {
//     const newUser = req.body;
//     const result = await events.insertOne(newUser);
//     res.send(result);

// });


app.post("/events", verfyToken, async (req, res) => {
    try {
        const newEvent = req.body;

        // Insert into both collections
        const eventResult = await events.insertOne(newEvent);

        const allEventResult = await allEvents.insertOne(newEvent);

        res.status(201).json({
            message: "Event created successfully",
            eventId: eventResult.insertedId,
            allEventId: allEventResult.insertedId
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create event",
            error: error.message
        });
    }
});

app.post('/joinedEvents', async (req, res) => {
    try {
        const { user, event } = req.body;

        // Validate incoming data
        if (!user?.email || !event?._id) {
            return res.status(400).send({
                message: "User email and event ID are required."
            });
        }

        // Check whether this user already joined this event
        const existingJoin = await joinedEvents.findOne({
            userEmail: user.email,
            eventId: event._id
        });

        if (existingJoin) {
            return res.status(409).send({
                message: "You have already joined this event."
            });
        }

        // Create joined event document
        const joinedEventData = {
            userName: user.name,
            userEmail: user.email,
            userImage: user.image,
            eventId: event._id,
            eventTitle: event.title,
            eventType: event.eventType,
            eventDescription: event.description,
            thumbnail: event.thumbnail,
            location: event.location,
            eventDate: event.eventDate,
            joinedAt: new Date()
        };

        const result = await joinedEvents.insertOne(joinedEventData);

        res.status(201).send({
            message: "Successfully joined the event!",
            insertedId: result.insertedId
        });

    } catch (error) {
        console.error("Join Event Error:", error);

        res.status(500).send({
            message: "Failed to join event.",
            error: error.message
        });
    }
});

app.delete('/events/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await events.deleteOne(query)

    res.send(result);


})


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

// export default app;