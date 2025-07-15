require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const e = require("express");
const stripe = require("stripe")(process.env.STRIPE_SK_KEY);
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

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

// Admin SDK configuration snippet  convert(base64,utf8)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;

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
  //   const userDataCollection = db.collection("users");
  const userMakeOfferCollection = db.collection("makeOffer");
  const ordersCollection = db.collection("order");
  const userDataCollection = db.collection("userData");

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

    //  Validate ObjectId
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







app.get("/reviews", async (req, res) => {
  try {
    const reviews = await reviewCollection.find().toArray();
    res.send(reviews);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ message: "Failed to fetch reviews" });
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

  // Get all reviews by user email
  app.get("/my-reviews/:email", async (req, res) => {
    const { email } = req.params;

    try {
      const userReviews = await reviewCollection
        .find({ userEmail: email })
        .sort({ createdAt: -1 }) // Optional: latest first
        .toArray();

      res.status(200).json(userReviews);
    } catch (err) {
      console.error("Error fetching user reviews:", err);
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
      userImage,
      propertyTitle,
      agentName,
      propertyId,
      rating,
      comment,
    } = req.body;

    if (!userEmail || !propertyId || !rating || !comment || !userImage) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const result = await reviewCollection.insertOne({
        userName,
        userImage,
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

      //   console.log("Fetching wishlist for:", req.params.email); //  fixed
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  // make offer button section




app.patch("/makeOffer/payment-success/:offerId", async (req, res) => {
  const { offerId } = req.params;
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ message: "Missing transactionId" });
  }

  try {
    const filter = { _id: new ObjectId(offerId) };
    const updateDoc = {
      $set: {
        status: "bought",
        transactionId,
      },
    };

    const result = await userMakeOfferCollection.updateOne(filter, updateDoc);

    if (result.modifiedCount > 0) {
      res.json({ message: "Offer updated to 'bought'" });
    } else {
      res.status(404).json({ message: "Offer not found" });
    }
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update offer", error: error.message });
  }
});

app.post("/makeOffer", async (req, res) => {
  try {
    const offer = req.body;

    if (!offer.buyerEmail || !offer.propertyId || !offer.offerAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const dataToInsert = {
      ...offer,
      status: "pending", // Default status
      createdAt: new Date(),
    };

    const result = await userMakeOfferCollection.insertOne(dataToInsert);
    res.status(201).json({
      message: "Offer created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error inserting offer:", error);
    res.status(500).json({ message: "Failed to create offer", error: error.message });
  }
});

app.get("/makeOffer", async (req, res) => {
  try {
    const result = await userMakeOfferCollection.find().toArray();
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching offers:", err);
    res.status(500).json({ message: "Failed to fetch offers" });
  }
});


  app.get("/makeOffer/:email", async (req, res) => {
    try {
      const email = req.params.email;

      const result = await userMakeOfferCollection
        .find({ buyerEmail: email }) // Use correct field name
        .toArray();

      res.status(200).json(result);
    } catch (err) {
      console.error("Failed to fetch offers:", err);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // create payment intent for order
  app.post("/create-paymentSecret", async (req, res) => {
    const { price, orderPropertyId } = req.body;
    const property = await userMakeOfferCollection.findOne({
      _id: new ObjectId(orderPropertyId),
    });
    if (!property)
      return res.status(404).send({ message: "property Not Found" });

    const totalPrice = price * 100;
    // Stripe.......
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalPrice,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // console.log(paymentIntent);

    res.send({ clientSecret: paymentIntent.client_secret });
  });

app.post("/order", async (req, res) => {
  const orderData = req.body;

  if (!orderData || !orderData.offerAmount || !orderData.transactionId) {
    return res.status(400).send({ message: "Missing required order fields" });
  }

  // Add status = 'bought' here
  orderData.status = "bought";
  orderData.createdAt = new Date();

  try {
    const result = await ordersCollection.insertOne(orderData);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to insert order", error: error.message });
  }
});

  //   fiend all data get  property
  app.get("/order", async (req, res) => {
    const allData = req.body;
    const result = await ordersCollection.find(allData).toArray();
    res.send(result);
  });

  // Get all sold properties for a specific agent
app.get("/sold-properties/:agentEmail", async (req, res) => {
  const { agentEmail } = req.params;

  try {
    // Filter orders by agentEmail AND status = "bought"
    const sold = await ordersCollection
      .find({
        agentEmail,
        status: "bought", // Only return sold ones
      })
      .toArray();

    res.status(200).json(sold);
  } catch (err) {
    console.error("Error fetching sold properties:", err);
    res.status(500).json({ message: "Failed to fetch sold properties" });
  }
});



app.get("/order/:email", async (req, res) => {
  const { email } = req.params;

  try {
    // Find orders by buyerEmail (adjust field name if different)
    const orders = await ordersCollection.find({ buyerEmail: email }).toArray();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders by email:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});


//? PATCH to update transactionId and status
app.patch("/order/payment-success/:id", async (req, res) => {
  const { id } = req.params;
  const { transactionId } = req.body;

  try {
    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          transactionId: transactionId,
          status: "bought",
        },
      }
    );
    res.send(result);
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
});

  // Requested agent email fine
  app.get("/agent-offers/:agentEmail", async (req, res) => {
    const { agentEmail } = req.params;
    console.log("Received agentEmail:", agentEmail);

    try {
      const offers = await userMakeOfferCollection
        .find({ agentEmail })
        .sort({ createdAt: -1 })
        .toArray();

      if (!offers.length) {
        console.log("No offers found for:", agentEmail);
      }

      res.status(200).json(offers);
    } catch (err) {
      console.error("Error fetching offers:", err);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  // Requested status update section
  app.patch("/offers/:id", async (req, res) => {
    const { id } = req.params;
    const { status, propertyId } = req.body;

    try {
      // Update the clicked offer
      await userMakeOfferCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );

      //! If accepted, reject all other offers for same property ( ak tu bus ta hbe ???)
      if (status === "accepted") {
        await userMakeOfferCollection.updateMany(
          {
            propertyId,
            _id: { $ne: new ObjectId(id) },
          },
          { $set: { status: "rejected" } }
        );
      }

      res.status(200).json({ message: "Offer updated successfully" });
    } catch (err) {
      console.error("Failed to update offer:", err);
      res.status(500).json({ error: "Failed to update offer status" });
    }
  });

  // admin Manage properties section properties update

  app.patch("/properties/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const result = await propertiesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } } //  update `status` field
      );

      res.status(200).json(result);
    } catch (err) {
      console.error("Error updating status:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Save or update a users info in db
  app.post("/userInfo", async (req, res) => {
    const allUserData = req.body;

    allUserData.roll = "user";
    allUserData.created_at = new Date().toISOString();
    allUserData.last_loggedIn = new Date().toISOString();

    const query = {
      email: allUserData?.email,
    };

    const alreadyExists = await userDataCollection.findOne(query);
    // console.log("user already Exists", !!alreadyExists);

    if (!!alreadyExists) {
      const result = await userDataCollection.updateOne(query, {
        $set: { last_loggedIn: new Date().toISOString() },
      });
      return res.send(result);
    }

    // return console.log(allUserData);

    const result = await userDataCollection.insertOne(allUserData);
    res.send(result);
  });

  //? Get all users and did show admin won data...
  app.get("/users", verifyToken, async (req, res) => {
    // console.log(req.user);
    const filter = {
      email: {
        $ne: req?.user?.email,
      },
    };
    const users = await userDataCollection.find(filter).toArray();
    res.send(users);
  });

  // app.get("/user/roll/:email",verifyToken, async (req, res) => {
  //   const email = req.params.email;
  //   const result = await userDataCollection.findOne({ email });
  //   if (!result) return res.status(404).send({ message: "User Not Found." });
  //   res.send({ roll: result?.roll });
  // });

  app.get("/user/roll/:email", verifyToken, async (req, res) => {
    const email = req.params.email;

    const result = await userDataCollection.findOne({
      email: new RegExp(`^${email}$`, "i"), // case-insensitive match
    });

    if (!result) return res.status(404).send({ message: "User Not Found." });

    res.send({ roll: result?.roll });
  });

  // Update user (role or fraud all data deleted)
  app.patch("/user/roll/:email", verifyToken, async (req, res) => {
    const email = req.params.email;
    const { roll } = req.body;

    const filter = { email: email };
    const updateDoc = {
      $set: {
        roll,
        status: roll === "fraud" ? "fraud" : "verified", // optional: mark status as fraud if needed
      },
    };

    try {
      // Update the user role first
      const userUpdateResult = await userDataCollection.updateOne(
        filter,
        updateDoc
      );

      if (roll === "fraud") {
        // If user marked as fraud and was an agent, delete all properties posted by this agent
        const deletePropertiesResult = await propertiesCollection.deleteMany({
          "agent.email": email,
        });

        // You can send info about how many properties were deleted, if you want
        // This helps the frontend show a message like:"User marked as fraud. 3 properties removed."
        // deletedPropertiesCount: that user or deletedCount If your frontend doesn't care how many were deleted, you can skip that part and simply write:
        return res.send({
          userUpdateResult,
          deletedPropertiesCount: deletePropertiesResult.deletedCount,
        });
      }

      // Otherwise, just send user update result
      res.send(userUpdateResult);
    } catch (error) {
      console.error("Error updating user role and properties:", error);
      res.status(500).send({ error: "Internal Server Error" });
    }
  });

  // OfferedProperties section
  app.patch("/offers/:id/accept", async (req, res) => {
    const id = req.params.id;
    const offer = await userDataCollection.findOne({ _id: new ObjectId(id) });

    if (!offer) return res.status(404).send({ error: "Offer not found" });

    // 1. Accept this offer
    await userDataCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "accepted" } }
    );

    // 2. Reject all other offers for the same property
    await userDataCollection.updateMany(
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

  // admin user id deleted
  app.delete("/user/:id", async (req, res) => {
    const userId = req.params.id;
    try {
      // 1. Find the user from the DB to get Firebase UID/email
      const user = await userDataCollection.findOne({
        _id: new ObjectId(userId),
      });

      if (!user) return res.status(404).json({ message: "User not found" });

      // 2. Delete from MongoDB
      await userDataCollection.deleteOne({ _id: new ObjectId(userId) });

      // 3. Delete from Firebase Auth using email (or store firebase UID in DB)
      const userRecord = await admin.auth().getUserByEmail(user.email);
      await admin.auth().deleteUser(userRecord.uid);

      res.status(200).json({ message: "User deleted from DB and Firebase" });
    } catch (error) {
      console.error("Delete user error:", error);
      res
        .status(500)
        .json({ message: "Failed to delete user", error: error.message });
    }
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
  const result = await propertiesCollection.deleteOne(query);  // await here
  res.send(result);
});

  app.delete("/my-reviews/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const result = await reviewCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 1) {
        res.status(200).json({ message: "Review deleted successfully" });
      } else {
        res.status(404).json({ message: "Review not found" });
      }
    } catch (err) {
      console.error("Error deleting review:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/reviews/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userEmail } = req.query;

      //  Validate inputs
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid review ID" });
      }
      if (!userEmail) {
        return res.status(400).json({ message: "Missing userEmail" });
      }

      // (Optional) Ensure the user owns this review
      const existing = await reviewCollection.findOne({
        _id: new ObjectId(id),
        userEmail: userEmail,
      });
      if (!existing) {
        return res
          .status(404)
          .json({ message: "Review not found or unauthorized" });
      }

      //  Perform delete
      const result = await reviewCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 1) {
        return res.json({ message: "Review deleted" });
      } else {
        // Shouldn’t happen if existing was found, but just in case:
        return res.status(404).json({ message: "Review not found" });
      }
    } catch (err) {
      console.error(" Error in DELETE /reviews/:id:", err);
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
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
