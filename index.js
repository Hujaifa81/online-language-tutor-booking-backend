require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb'); 
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8oqwp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const tutorCollection = client.db("online_tutor_booking").collection("tutors");
    const bookedTutorCollection=client.db("online_tutor_booking").collection("booked_tutors");

    //get all tutors
    app.get("/tutors", async (req, res) => {
      const query = {};
      const cursor = tutorCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    // post a tutor
    app.post('/addTutor', async (req, res) => {
      const data = req.body;
      const result = await tutorCollection.insertOne(data);
      res.send(result)
    })
    // get all added tutors by user's email
    app.get('/tutors/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = tutorCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    // get a single tutor by id
    app.get('/tutor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id:new ObjectId(id) };
      const result =await tutorCollection.findOne(query);
    
      res.send(result);
    })
    app.delete('/tutor/:id',async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorCollection.deleteOne(query);
      res.send(result);
    })
    app.put('/updateTutor/:id',async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: req.body.name,
          email: req.body.email,
          language: req.body.language,
          price: req.body.price,
          image: req.body.image,
          review: req.body.review,
          description: req.body.description,
        }
      };
      const result = await tutorCollection.updateOne(query, updateDoc);
      res.send(result);
    })
    //update review count of a tutor
    app.patch('/tutor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: { review: 1 } 
      };
      const result = await tutorCollection.updateOne(filter, updateDoc);
      res.send(result);
      });
      
    // get all booked tutors by user's email
    app.get('/bookedTutors/:email',async(req,res)=>{
      const email = req.params.email;
      const query = { email: email };
      const cursor = bookedTutorCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    //post a booked tutor
    app.post('/bookedTutor', async (req, res) => {
      const data = req.body;
      const result = await bookedTutorCollection.insertOne(data);
      res.send(result)
    })
    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Tutor Booking Backend is running...');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});