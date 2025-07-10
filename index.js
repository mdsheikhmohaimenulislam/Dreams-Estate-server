require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SK_KEY);

const port = process.env.PORT || 5000;
const app = express();
// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  const db = client.db("dreamsEstateDB");
  const propertiesCollection = db.collection("properties");
  const reviewCollection = db.collection("reviews");
  const wishlistCollection = db.collection("wishlist");
  const offersCollection = db.collection("users");
  const userMakeOfferCollection = db.collection("makeOffer");

  // add a properties in db
  app.post("/add-properties", async (req, res) => {
    const properties = req.body;
    const result = await propertiesCollection.insertOne(properties);
    res.send(result);
  });

  // get all properties data from db
  app.get("/properties", async (req, res) => {
    const result = await propertiesCollection.find().toArray();
    res.send(result);
  });

  // get one properties data from db
  app.get("/properties/:id", async (req, res) => {
    const id = req.params.id;

    // ✅ Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    try {
      const result = await propertiesCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!result) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.send(result);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  // get Reviews section
  app.get("/reviews/:propertyId", async (req, res) => {
    const { propertyId } = req.params;
    try {
      const reviews = await reviewCollection
        .find({ propertyId })
        .sort({ createdAt: -1 }) // newest first
        .toArray();

      res.status(200).json(reviews);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Reviews section
  app.post("/reviews", async (req, res) => {
    // const review = req.body;
    // const result = await reviewCollection.insertOne(review);
    // res.send(result);

    const {
      userName,
      userEmail,
      propertyTitle,
      agentName,
      propertyId,
      rating,
      comment,
    } = req.body;

    if (!userEmail || !propertyId || !rating || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const result = await reviewCollection.insertOne({
        userName,
        userEmail,
        propertyTitle,
        agentName,
        propertyId,
        rating,
        comment,
        createdAt: new Date(),
      });

      res.status(201).json(result); // Optional: send insertedId instead
    } catch (err) {
      console.error("Failed to insert review:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // wishlist section

  // POST: Add to wishlist
  app.post("/wishlist", async (req, res) => {
    try {
      const wishData = {
        ...req.body,
        createdAt: new Date(),
      };

      const result = await wishlistCollection.insertOne(wishData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Failed to add wishlist item:", error);
      res.status(500).json({ message: "Failed to add wishlist item" });
    }
  });

  // GET: Get all wishlist items for a user
  app.get("/wishlist/:email", async (req, res) => {
    try {
      const wishlist = await wishlistCollection
        .find({ userEmail: req.params.email })
        .toArray();

      res.status(200).json(wishlist);

      console.log("Fetching wishlist for:", req.params.email); // ✅ fixed
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  // make offer button section
  app.post("/makeOffer", async (req, res) => {
    const allData = req.body;

    const data = {
      ...req.body,
      createdAt: new Date(),
    };

    const result = await userMakeOfferCollection.insertOne(data)
    res.send(result)
  });

  // Create payment intent for order
  //   app.post("/create-payment-intent", async (req, res) => {
  //     const { plantId, quantity } = req.body;

  //     const plant = await propertiesCollection.findOne({
  //       _id: new ObjectId(plantId),
  //     });
  //     if (!plant) return res.status(404).send({ message: "plant Not Found" });
  //     const totalPrice = quantity * plant?.price * 100;

  //     // stripe.......
  //     const { client_secret } = await stripe.paymentIntents.create({
  //       amount: totalPrice,
  //       currency: "usd",
  //       automatic_payment_methods: {
  //         enabled: true,
  //       },
  //     });

  //     res.send({ clientSecret: client_secret });
  //   });

  // Save or update a user info in db
  //   app.post("/user", async (req, res) => {
  //     const userData = req.body;

  //     // set user rol or date
  //     userData.role = "customer";
  //     userData.create_at = new Date().toISOString();
  //     userData.last_logIn = new Date().toISOString();
  //     const query = {
  //       email: userData?.email,
  //     };

  //     // user email find
  //     const alreadyExists = await userCollection.findOne(query);

  //     if (!!alreadyExists) {
  //       const result = await userCollection.updateOne(query, {
  //         $set: { last_logIn: new Date().toISOString() },
  //       });
  //       return res.send(result);
  //     }

  //     // true or false !! ar jonno
  //     // console.log('user alreadyExists: ', !!alreadyExists);

  //     // return console.log(userData);
  //     const result = await userCollection.insertOne(userData);
  //     res.send(result);
  //   });

  // get a user's role
  //   app.get("/user/role/:email", async (req, res) => {
  //     const email = req.params.email;
  //     const result = await userCollection.findOne({ email });

  //     if (!result) return res.status(404).send({ message: "User Not Found" });

  //     res.send({ role: result?.role });
  //   });

  // save orderData in  order collection in db
  //   app.post("/wishlist", async (req, res) => {
  //     const orderData = req.body;
  //     const result = await wishlistCollection.insertOne(orderData);
  //     res.send(result);
  //   });

  // OfferedProperties section
  app.patch("/offers/:id/accept", async (req, res) => {
    const id = req.params.id;
    const offer = await offersCollection.findOne({ _id: new ObjectId(id) });

    if (!offer) return res.status(404).send({ error: "Offer not found" });

    // 1. Accept this offer
    await offersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "accepted" } }
    );

    // 2. Reject all other offers for the same property
    await offersCollection.updateMany(
      {
        propertyId: offer.propertyId,
        _id: { $ne: new ObjectId(id) },
      },
      { $set: { status: "rejected" } }
    );

    res.send({ success: true });
  });

  // Update Marathon
  app.put("/properties/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateProperties = req.body;

    const updateDoc = {
      $set: updateProperties,
    };
    const result = await propertiesCollection.updateOne(
      filter,
      updateDoc,
      options
    );
    res.send(result);
  });

  // DELETE: Remove a wishlist item
  app.delete("/wishlist/:id", async (req, res) => {
    // const id = req.params.id;
    // const result = await wishlistCollection.deleteOne({
    //   _id: new ObjectId(id),
    // });
    // res.send(result);

    //   console.log('DELETE wishlist called with id:', req.params.id); // Add this
    try {
      const id = req.params.id;
      const result = await wishlistCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 1) {
        res.status(200).json({ deletedCount: 1 });
      } else {
        res.status(404).json({ message: "Wishlist item not found" });
      }
    } catch (err) {
      console.error("Delete wishlist error:", err);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  });

  // Deleted section
  app.delete("/properties/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = propertiesCollection.deleteOne(query);
    res.send(result);
  });

  app.delete("/reviews/:id", async (req, res) => {
    const reviewId = req.params.id;
    const userEmail = req.body.userEmail; // or get from auth middleware

    try {
      // Find the review to verify ownership (optional but recommended)
      const review = await reviewCollection.findOne({
        _id: new ObjectId(reviewId),
      });
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (review.userEmail !== userEmail) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this review" });
      }

      // Delete the review
      await reviewCollection.deleteOne({ _id: new ObjectId(reviewId) });
      res.status(200).json({ message: "Review deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  try {
    // Generate jwt token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Dreams Estate Server..");
});

app.listen(port, () => {
  console.log(`Dreams Estate is running on port ${port}`);
});
