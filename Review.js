const reviewSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  propertyId: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;