import dotenv from 'dotenv';
import app from './app.js';
import './Model/associations.js'

// Import SL associations (NEW)
import './Model/SL/sl_associations.js'

dotenv.config();

const port = process.env.PORT || 6000;

app.listen(port, () => {
    console.log(`🚀 Admin Authentication Server is running at port ${port}`);
});