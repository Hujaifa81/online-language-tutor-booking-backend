require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;
const secretKey = process.env.JWT_SECRET;
app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Middleware to verify JWT token
const verifyToken=async(req,res,next)=>{
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  try {
     jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'Unauthorized' });
      }
      req.user = decoded; 
    
    next();
  })}
   catch (err) {
    return res.status(403).send({ message: 'Forbidden' });
  }
  
}



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
    const bookedTutorCollection = client.db("online_tutor_booking").collection("booked_tutors");

    app.post('/jwt', (req, res) => {
      const user = req.body; 
      
      // Create token with payload and expiration time
      const token = jwt.sign(user, secretKey, { expiresIn: '7d' });
      
      res.
      cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || false ,// Set to true if using HTTPS
        sameSite: 'strict', 
      }).
      send({ success: true });
    });
    //clear cookie on logout
    app.post('/logout',async (req, res) => {
      res.clearCookie('token',{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || false ,// Set to true if using HTTPS
        sameSite: 'strict', 
      })
      res.send({ success: true });
    })
    
    //get all tutors
    app.get("/tutors", async (req, res) => {
      const category = req.query.category;
      let query = {};
      if (category) {
        query = { language: category };

      }

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
    app.get('/tutors/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: 'Forbidden' });
      }
      const query = { email: email };
      const cursor = tutorCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    // get a single tutor by id
    app.get('/tutor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorCollection.findOne(query);

      res.send(result);
    })
    // get all categories of tutors
    app.get('/categories', async (req, res) => {
      try {
        const categories = await tutorCollection.distinct("language");
        res.status(200).send(categories);
      } catch (error) {

        res.status(500).send({ error: 'Failed to fetch categories' });
      }
    });

    //delete a tutor by id
    app.delete('/tutor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorCollection.deleteOne(query);
      res.send(result);
    })
    //update a tutor by id
    app.put('/updateTutor/:id', async (req, res) => {
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
    app.get('/bookedTutors/:email', async (req, res) => {
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
    //count the number of  tutors by category
    app.get('/categoryCounts', async (req, res) => {
      try {
        const result = await tutorCollection.aggregate([
          { $sortByCount: "$language" } // group and count by language
        ]).toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


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