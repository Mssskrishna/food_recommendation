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

    embeddingText: {
        type: String,
        required: true
    },
    
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OrderEmbedding', OrderEmbeddingSchema);