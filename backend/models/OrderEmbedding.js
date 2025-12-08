// orderEmbedding.model.js
const mongoose = require('mongoose');

const OrderEmbeddingSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true
    },
    
    orderembedding: {
        type: [Number], 
        validate: {
            validator: function(v) {
                return v && v.length === 768; 
            },
            message: 'Embedding must be an array of exactly 768 dimensions.'
        },
        required: true
    },

    // A textual summary of the order used to generate the embedding (optional, for debugging)
    embeddingText: {
        type: String,
        required: true
    },
    
    // Optional: userId for user-specific recommendations
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OrderEmbedding', OrderEmbeddingSchema);